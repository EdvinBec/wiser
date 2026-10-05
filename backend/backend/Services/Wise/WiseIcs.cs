using System.Globalization;
using System.Text.RegularExpressions;

namespace backend.Services.Wise;

/// <summary>
/// Parser for the iCalendar feed Wise serves at /web/&lt;school&gt;/reports?format=ics.
///
/// Three things about that feed break a naive parser, and all three are handled here:
///
///  1. RFC 5545 line folding breaks mid-word. A group name arrives as
///     "R-I\r\n T 3 VS" and must be unfolded before anything else is read, or it
///     becomes "R-I T 3 VS" and no longer matches the catalogue.
///  2. Multi-value fields separate with an ESCAPED comma. "JURIŠIĆ\, MATEJ"
///     is one lecturer; splitting on a plain comma yields two.
///  3. The "\n" inside DESCRIPTION is a literal backslash-n, not a newline. It
///     separates the lecturer list from the group list.
/// </summary>
public static class WiseIcs
{
    private static readonly Regex MultiValue = new(@"(?<!\\)\\,", RegexOptions.Compiled);
    private static readonly Regex FieldBreak = new(@"(?<!\\)\\n", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex SummarySplit = new(@"^(.*)\s\(([^()]*)\)\s*$", RegexOptions.Compiled);

    public static List<WiseEvent> Parse(string ics)
    {
        var events = new List<WiseEvent>();
        if (string.IsNullOrWhiteSpace(ics)) return events;

        // (1) Unfold before reading a single property.
        var unfolded = ics.Replace("\r\n ", "").Replace("\n ", "").Replace("\r\n\t", "").Replace("\n\t", "");

        foreach (var block in Blocks(unfolded))
        {
            var ev = ParseBlock(block);
            if (ev != null) events.Add(ev);
        }

        return events;
    }

    private static IEnumerable<string> Blocks(string text)
    {
        const string begin = "BEGIN:VEVENT";
        const string end = "END:VEVENT";
        int i = 0;
        while (true)
        {
            var s = text.IndexOf(begin, i, StringComparison.Ordinal);
            if (s < 0) break;
            var e = text.IndexOf(end, s, StringComparison.Ordinal);
            if (e < 0) break;
            yield return text.Substring(s + begin.Length, e - s - begin.Length);
            i = e + end.Length;
        }
    }

    private static WiseEvent? ParseBlock(string block)
    {
        var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var paramsByKey = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in block.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var raw = line.TrimEnd('\r');
            if (raw.Length == 0) continue;

            var colon = raw.IndexOf(':');
            if (colon <= 0) continue;

            var left = raw.Substring(0, colon);
            var value = raw.Substring(colon + 1);

            var semi = left.IndexOf(';');
            var name = semi < 0 ? left : left.Substring(0, semi);
            if (semi >= 0) paramsByKey[name] = left.Substring(semi + 1);

            props[name] = value;
        }

        if (!props.TryGetValue("DTSTART", out var dtStart)) return null;
        if (!props.TryGetValue("DTEND", out var dtEnd)) dtEnd = dtStart;

        var start = ParseStamp(dtStart);
        var finish = ParseStamp(dtEnd);
        if (start == null || finish == null) return null;

        var summary = Unescape(props.GetValueOrDefault("SUMMARY", "").Trim());
        var (subject, type) = SplitSummary(summary);

        var room = Unescape(props.GetValueOrDefault("LOCATION", "").Trim());
        var (lecturers, groups) = ParseDescription(props.GetValueOrDefault("DESCRIPTION", ""));

        return new WiseEvent(
            EventId: EventIdFromUid(props.GetValueOrDefault("UID", "")),
            Start: start.Value,
            Finish: finish.Value,
            Subject: subject,
            ExecutionType: type,
            Room: room,
            Lecturers: lecturers,
            Groups: groups);
    }

    /// <summary>"RAČUNALNIŠKA GRAFIKA IN ANIMACIJA (RV)" -> subject + "RV". "Rezervacija" -> no type.</summary>
    private static (string Subject, string Type) SplitSummary(string summary)
    {
        var m = SummarySplit.Match(summary);
        return m.Success
            ? (m.Groups[1].Value.Trim(), m.Groups[2].Value.Trim())
            : (summary, "");
    }

    /// <summary>
    /// "S4061-20261008@feri.wise-tt.com" -> "S4061".
    /// Reservation ids carry a GUID with its own dashes, so the DATE is split off at the
    /// LAST dash rather than the first: "R6d2ab239-...-3479e-20261111@..." -> "R6d2ab239-...-3479e".
    /// </summary>
    private static string EventIdFromUid(string uid)
    {
        if (string.IsNullOrEmpty(uid)) return "";
        var at = uid.IndexOf('@');
        var local = at > 0 ? uid.Substring(0, at) : uid;
        var dash = local.LastIndexOf('-');
        return dash > 0 ? local.Substring(0, dash) : local;
    }

    /// <summary>"Predavatelji: A\, B\nSkupine: X\, Y" -> (["A","B"], ["X","Y"]).</summary>
    private static (List<string> Lecturers, List<string> Groups) ParseDescription(string description)
    {
        var lecturers = new List<string>();
        var groups = new List<string>();
        if (string.IsNullOrWhiteSpace(description)) return (lecturers, groups);

        // (3) The field break is a literal backslash-n.
        var segments = FieldBreak.Split(description);
        var positional = new List<List<string>>();

        foreach (var segment in segments)
        {
            var seg = segment.Trim();
            if (seg.Length == 0) continue;

            var label = "";
            var body = seg;
            var colon = seg.IndexOf(':');
            if (colon > 0)
            {
                label = seg.Substring(0, colon).Trim();
                body = seg.Substring(colon + 1);
            }

            var values = SplitValues(body);

            if (label.StartsWith("Predavatelj", StringComparison.OrdinalIgnoreCase)
                || label.StartsWith("Lecturer", StringComparison.OrdinalIgnoreCase))
                lecturers.AddRange(values);
            else if (label.StartsWith("Skupine", StringComparison.OrdinalIgnoreCase)
                || label.StartsWith("Group", StringComparison.OrdinalIgnoreCase))
                groups.AddRange(values);
            else
                positional.Add(values);
        }

        // Unlabelled segments fall back to document order: lecturers first, groups second.
        if (lecturers.Count == 0 && positional.Count > 0) lecturers.AddRange(positional[0]);
        if (groups.Count == 0 && positional.Count > 1) groups.AddRange(positional[1]);

        return (lecturers, groups);
    }

    /// <summary>(2) Split on escaped commas only, then unescape each piece.</summary>
    private static List<string> SplitValues(string body) =>
        MultiValue.Split(body)
            .Select(Unescape)
            .Select(v => v.Trim())
            .Where(v => v.Length > 0)
            .ToList();

    /// <summary>
    /// Single left-to-right pass. Sequential String.Replace calls cannot do this correctly:
    /// unescaping "\\" first would turn "\\n" (an escaped backslash then the letter n) into a
    /// newline, and unescaping it last would have the other rules consume its backslash.
    /// </summary>
    private static string Unescape(string value)
    {
        if (value.IndexOf('\\') < 0) return value;

        var sb = new System.Text.StringBuilder(value.Length);
        for (int i = 0; i < value.Length; i++)
        {
            if (value[i] != '\\' || i + 1 >= value.Length)
            {
                sb.Append(value[i]);
                continue;
            }

            var next = value[++i];
            sb.Append(next switch
            {
                'n' or 'N' => "\n",
                ',' => ",",
                ';' => ";",
                '\\' => "\\",
                _ => "\\" + next,
            });
        }
        return sb.ToString();
    }

    /// <summary>
    /// "20261008T100000" -> local wall time. Wise publishes Ljubljana local time with a TZID
    /// parameter; the offset is deliberately NOT applied here, because the frontend already
    /// interprets an offset-free stamp as Ljubljana wall time.
    /// </summary>
    private static DateTime? ParseStamp(string value)
    {
        var v = value.Trim();
        if (v.EndsWith("Z", StringComparison.OrdinalIgnoreCase)) v = v.Substring(0, v.Length - 1);

        if (DateTime.TryParseExact(v, "yyyyMMdd'T'HHmmss", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dt))
            return dt;

        if (DateTime.TryParseExact(v, "yyyyMMdd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dateOnly))
            return dateOnly;

        return null;
    }
}
