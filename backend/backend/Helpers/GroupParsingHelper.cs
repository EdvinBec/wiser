using System.Text.RegularExpressions;

public static class GroupParsing
{
    // Split on comma/semicolon/pipe/slash with optional spaces, handle NBSP, trim quotes/punctuation
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

            // collapse inner whitespace to single space (e.g., "RIT   2" -> "RIT 2")
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
}