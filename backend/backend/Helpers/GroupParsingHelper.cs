using System.Text.RegularExpressions;

public static class GroupParsing
{
    private static readonly Regex SplitRegex = new(@"\s*[,;|/]\s*", RegexOptions.Compiled);
    private static readonly char[] TrimChars = ['"', '\'', '“', '”', '’', '.', ',', ';', ' '];

    public static IEnumerable<string> SplitGroups(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            yield break;

        // normalize spaces and trim
        input = input.Replace('\u00A0', ' ').Trim();

        foreach (var raw in SplitRegex.Split(input))
        {
            var token = raw?.Trim(TrimChars);
            if (string.IsNullOrWhiteSpace(token)) continue;

            // collapse inner whitespace to single space
            token = Regex.Replace(token, @"\s+", " ");

            yield return token;
        }
    }

    // Flattens a list of strings that may each contain multiple groups; de-duplicates (case-insensitive)
    public static IEnumerable<string> FlattenGroups(IEnumerable<string> parts)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var part in parts ?? Enumerable.Empty<string>())
        {
            foreach (var g in SplitGroups(part))
            {
                if (seen.Add(g))
                    yield return g;
            }
        }
    }
    
    public static IEnumerable<string> ExtractGroups(IEnumerable<string> lines)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines ?? Enumerable.Empty<string>())
        {
            // 1) Break line into tokens like "ITK 2 VS", "RIT 2 VS RV 4", ...
            foreach (var token in GroupParsing.SplitGroups(line))
            {
                var t = token.Trim();

                // Ignore anything that starts with ITK 2 ...
                if (Regex.IsMatch(t, @"^ITK\s*2\b", RegexOptions.IgnoreCase))
                    continue;

                // RIT 2 VS RV <n>  -> keep "RV <n>"  (allow any positive integer)
                var rv = Regex.Match(t, @"^RIT\s*2\b\s*VS\s*RV\s*(\d+)\b", RegexOptions.IgnoreCase);
                if (rv.Success)
                {
                    var kept = $"RV {rv.Groups[1].Value}";
                    if (seen.Add(kept)) yield return kept;
                    continue;
                }

                // RIT 2 VS (with nothing after VS) -> keep "RIT 2"
                if (Regex.IsMatch(t, @"^RIT\s*2\b\s*VS\s*$", RegexOptions.IgnoreCase)
                    || Regex.IsMatch(t, @"^RIT\s*2\b$", RegexOptions.IgnoreCase)) // (optional: also accept bare "RIT 2")
                {
                    if (seen.Add("RIT 2")) yield return "RIT 2";
                    continue;
                }

                // Otherwise ignore the token
            }
        }
    }
}