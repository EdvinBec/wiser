using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services.Wise;

/// <summary>
/// Reads the published Wise Timetable web layer for one school.
///
/// Why this exists rather than the frontend calling Wise directly: wise-tt.com sends no
/// Access-Control-Allow-Origin on /web/, so a browser request is blocked. Everything has to
/// pass through here.
///
/// Nothing is scraped with a browser. The pickers are server-rendered static forms, so a plain
/// GET plus a regex is enough, and the ids that come back are Wise's own database keys.
/// </summary>
public sealed class WiseClient
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<WiseClient> _log;
    private readonly string _school;

    private static readonly TimeSpan CatalogTtl = TimeSpan.FromHours(12);
    private static readonly TimeSpan ScheduleTtl = TimeSpan.FromHours(6);

    public WiseClient(HttpClient http, IMemoryCache cache, ILogger<WiseClient> log, IConfiguration config)
    {
        _http = http;
        _cache = cache;
        _log = log;
        _school = Environment.GetEnvironmentVariable("WISE_SCHOOL")
                  ?? config["Wise:School"]
                  ?? "feri";
    }

    // ── HTTP ────────────────────────────────────────────────────────────────

    private async Task<string> GetAsync(string pathAndQuery, CancellationToken ct)
    {
        // gzip matters: the picker pages are ~293 kB raw and ~21 kB compressed.
        using var res = await _http.GetAsync(pathAndQuery, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }

    private Task<T> CachedAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory) =>
        _cache.GetOrCreateAsync(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = ttl;
            return factory();
        })!;

    private string ViewUrl(string extra) => $"/web/{_school}/?lang=sl{extra}";

    // ── Catalogue cascade: programme -> year -> branch -> subject ───────────

    public Task<List<WiseProgramme>> GetProgrammesAsync(CancellationToken ct) =>
        CachedAsync($"wise:prog:{_school}", CatalogTtl, async () =>
        {
            var html = await GetAsync(ViewUrl(""), ct);
            return ParseSelect(html, "prog")
                .Where(o => int.TryParse(o.Value, out _))
                .Select(o => new WiseProgramme(int.Parse(o.Value), StripCode(o.Label), ExtractCode(o.Label)))
                .ToList();
        });

    public Task<List<int>> GetYearsAsync(int prog, CancellationToken ct) =>
        CachedAsync($"wise:yr:{_school}:{prog}", CatalogTtl, async () =>
        {
            var html = await GetAsync(ViewUrl($"&prog={prog}"), ct);
            return ParseSelect(html, "yr")
                .Select(o => int.TryParse(o.Value, out var n) ? n : 0)
                .Where(n => n > 0)
                .ToList();
        });

    public Task<List<WiseBranch>> GetBranchesAsync(int prog, int year, CancellationToken ct) =>
        CachedAsync($"wise:br:{_school}:{prog}:{year}", CatalogTtl, async () =>
        {
            var html = await GetAsync(ViewUrl($"&prog={prog}&yr={year}"), ct);
            return ParseSelect(html, "br")
                .Select(o => new WiseBranch($"{prog}-{year}-{o.Value}", o.Label, o.Label, year))
                .ToList();
        });

    /// <summary>
    /// Subjects of one branch. A subject taught to several branches appears under each of them —
    /// the mapping is many-to-many, not a tree.
    /// </summary>
    public Task<List<WiseSubject>> GetSubjectsAsync(int prog, int year, int? branch, CancellationToken ct) =>
        CachedAsync($"wise:subj:{_school}:{prog}:{year}:{branch}", CatalogTtl, async () =>
        {
            var q = $"&prog={prog}&yr={year}" + (branch.HasValue ? $"&br={branch.Value}" : "");
            var html = await GetAsync(ViewUrl(q), ct);
            return ParsePicker(html, "c")
                .Select(i => new WiseSubject(i.Id, i.Name, i.Code))
                .ToList();
        });

    public Task<List<WiseGroupRef>> GetBranchGroupsAsync(int prog, int year, int? branch, CancellationToken ct) =>
        CachedAsync($"wise:grp:{_school}:{prog}:{year}:{branch}", CatalogTtl, async () =>
        {
            var q = $"&prog={prog}&yr={year}" + (branch.HasValue ? $"&br={branch.Value}" : "");
            var html = await GetAsync(ViewUrl(q), ct);
            return ParsePicker(html, "g").Select(i => new WiseGroupRef(i.Id, i.Name)).ToList();
        });

    // ── Events ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Every event of one subject for the whole published year — one upstream request, ~20 kB.
    /// The cache key is the SUBJECT, never the student, so a popular subject is fetched once
    /// however many timetables include it.
    /// </summary>
    public Task<List<WiseEvent>> GetSubjectEventsAsync(int subjectId, CancellationToken ct) =>
        CachedAsync($"wise:ics:{_school}:{subjectId}", ScheduleTtl, async () =>
        {
            var ics = await GetAsync($"/web/{_school}/reports?lang=sl&format=ics&c={subjectId}", ct);
            var events = WiseIcs.Parse(ics);
            _log.LogInformation("Wise: subject {SubjectId} -> {Count} events", subjectId, events.Count);
            return events;
        });

    /// <summary>
    /// Works out which choices a subject actually asks of a student, from its own events.
    ///
    /// For each execution type, the distinct group combinations are collected. One combination
    /// means the type is common to everyone and needs no choice — a lecture, usually. More than
    /// one and the student has to pick, which is the RV-group case. Nothing here assumes that
    /// lectures are always common: DISKRETNE STRUKTURE is taught to two programmes and its PR
    /// genuinely has two variants, and this derives that correctly without a special case.
    /// </summary>
    public async Task<WiseSubjectShape> GetSubjectShapeAsync(int subjectId, CancellationToken ct)
    {
        var events = await GetSubjectEventsAsync(subjectId, ct);

        var name = events.Select(e => e.Subject).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s)) ?? "";

        var variants = events
            .GroupBy(e => e.ExecutionType, StringComparer.OrdinalIgnoreCase)
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
            .Select(byType => new WiseVariantSet(
                ExecutionType: byType.Key,
                Options: byType
                    .GroupBy(e => e.GroupKey, StringComparer.Ordinal)
                    .OrderBy(g => g.Key, StringComparer.Ordinal)
                    .Select(g => new WiseVariantOption(
                        Key: g.Key,
                        Label: g.Key.Length == 0 ? "(brez skupine)" : g.Key,
                        Occurrences: g.Count()))
                    .ToList()))
            .ToList();

        return new WiseSubjectShape(subjectId, name, null, variants);
    }

    /// <summary>
    /// The student's timetable: the union over their selections, each selection narrowed to the
    /// variant they picked. Deliberately NOT one upstream request with every id at once — Wise
    /// applies match=all globally, so a single combined URL returns the cartesian product of
    /// every group against every subject rather than the chosen pairs.
    /// </summary>
    public async Task<List<WiseSessionDto>> GetTimetableAsync(WiseTimetableRequest request, CancellationToken ct)
    {
        var from = request.From.ToDateTime(TimeOnly.MinValue);
        var to = request.To.ToDateTime(TimeOnly.MaxValue);

        var sessions = new List<WiseSessionDto>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var selection in request.Selections)
        {
            List<WiseEvent> events;
            try
            {
                events = await GetSubjectEventsAsync(selection.SubjectId, ct);
            }
            catch (Exception ex)
            {
                // One unreachable subject must not blank the whole timetable.
                _log.LogWarning(ex, "Wise: subject {SubjectId} unavailable, skipping", selection.SubjectId);
                continue;
            }

            // How many variants each type has, so single-variant types pass without a pick.
            var variantCount = events
                .GroupBy(e => e.ExecutionType, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Select(e => e.GroupKey).Distinct(StringComparer.Ordinal).Count(),
                    StringComparer.OrdinalIgnoreCase);

            foreach (var ev in events)
            {
                if (ev.Start < from || ev.Start > to) continue;

                var count = variantCount.GetValueOrDefault(ev.ExecutionType, 1);
                if (count > 1)
                {
                    // Needs a choice: keep only the variant the student picked. No pick yet means
                    // nothing of this type is shown, rather than all of it.
                    if (!selection.Picks.TryGetValue(ev.ExecutionType, out var picked)) continue;
                    if (!string.Equals(picked, ev.GroupKey, StringComparison.Ordinal)) continue;
                }

                // The same lecture can be reached through two selections; show it once.
                var key = $"{ev.EventId}|{ev.Start:O}";
                if (!seen.Add(key)) continue;

                sessions.Add(new WiseSessionDto(
                    Id: ev.EventId,
                    SubjectId: selection.SubjectId,
                    Subject: ev.Subject,
                    Code: null,
                    Type: ev.ExecutionType,
                    Room: ev.Room,
                    Lecturers: ev.Lecturers,
                    Groups: ev.Groups,
                    StartAt: ev.Start.ToString("yyyy-MM-ddTHH:mm:ss"),
                    FinishAt: ev.Finish.ToString("yyyy-MM-ddTHH:mm:ss")));
            }
        }

        return sessions.OrderBy(s => s.StartAt, StringComparer.Ordinal).ToList();
    }

    /// <summary>
    /// When the school last published. Wise sends no ETag on /web/, so this footer stamp is the
    /// only cheap way to tell whether anything changed at all.
    /// </summary>
    public Task<string?> GetPublishedAtAsync(CancellationToken ct) =>
        CachedAsync($"wise:published:{_school}", TimeSpan.FromMinutes(15), async () =>
        {
            var html = await GetAsync(ViewUrl(""), ct);
            var m = Regex.Match(html, @"class=""foot-published""[^>]*>.*?<time datetime=""([^""]+)""",
                RegexOptions.Singleline);
            return m.Success ? m.Groups[1].Value : null;
        });

    // ── HTML parsing ────────────────────────────────────────────────────────

    private sealed record SelectOption(string Value, string Label);

    private static readonly Regex OptionRe =
        new(@"<option[^>]*value=""([^""]*)""[^>]*>([^<]*)", RegexOptions.Compiled | RegexOptions.Singleline);

    private static List<SelectOption> ParseSelect(string html, string name)
    {
        var block = Regex.Match(html, $@"<select[^>]*name=""{Regex.Escape(name)}""[^>]*>(.*?)</select>",
            RegexOptions.Singleline);
        if (!block.Success) return new List<SelectOption>();

        return OptionRe.Matches(block.Groups[1].Value)
            .Select(m => new SelectOption(m.Groups[1].Value, WebUtility.HtmlDecode(m.Groups[2].Value).Trim()))
            .Where(o => o.Value.Length > 0)
            .ToList();
    }

    private sealed record PickerItem(int Id, string Name, string? Code);

    private static readonly Regex PickerItemRe = new(
        @"<label class=""picker-item[^""]*""\s+data-search=""[^""]*"">\s*" +
        @"<input[^>]*name=""pick\[\]""\s+value=""([^""]+)""[^>]*>\s*" +
        @"<span>(.*?)</span>",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex MetaRe =
        new(@"<small[^>]*class=""picker-meta""[^>]*>(.*?)</small>", RegexOptions.Compiled | RegexOptions.Singleline);

    /// <summary>
    /// Reads one picker form. They are told apart by a hidden field: pickon=g groups,
    /// c subjects, t lecturers, r rooms.
    /// </summary>
    private static List<PickerItem> ParsePicker(string html, string pickon)
    {
        var marker = $@"name=""pickon"" value=""{pickon}""";
        var start = html.IndexOf(marker, StringComparison.Ordinal);
        if (start < 0) return new List<PickerItem>();

        var end = html.IndexOf("</form>", start, StringComparison.Ordinal);
        var segment = end > start ? html.Substring(start, end - start) : html.Substring(start);

        var items = new List<PickerItem>();
        foreach (Match m in PickerItemRe.Matches(segment))
        {
            if (!int.TryParse(m.Groups[1].Value, out var id)) continue;

            var span = m.Groups[2].Value;
            var code = MetaRe.Match(span) is {Success: true} meta
                ? WebUtility.HtmlDecode(meta.Groups[1].Value).Trim()
                : null;

            var name = WebUtility.HtmlDecode(Regex.Replace(span, @"<[^>]+>", "")).Trim();
            if (!string.IsNullOrEmpty(code) && name.EndsWith(code, StringComparison.Ordinal))
                name = name.Substring(0, name.Length - code.Length).Trim();

            if (name.Length > 0) items.Add(new PickerItem(id, name, string.IsNullOrEmpty(code) ? null : code));
        }
        return items;
    }

    /// <summary>"RAČUNALNIŠTVO ... VS (BV20)" -> "BV20".</summary>
    private static string? ExtractCode(string label)
    {
        var m = Regex.Match(label, @"\(([^()]+)\)\s*$");
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static string StripCode(string label) =>
        Regex.Replace(label, @"\s*\([^()]+\)\s*$", "").Trim();
}
