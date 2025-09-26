using System.Globalization;
using System.Text.RegularExpressions;

namespace backend.Helpers;

public class DateHelpers
{
    
    static readonly Regex DateRe = new(@"\b(\d{1,2}\.\d{1,2}\.\d{4})\b", RegexOptions.Compiled);
    static readonly Regex TimeRe = new(@"\b(\d{1,2}:\d{2})\b", RegexOptions.Compiled);
    
    static TimeZoneInfo GetLjubljanaTz() =>
        OperatingSystem.IsWindows()
            ? TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time")
            : TimeZoneInfo.FindSystemTimeZoneById("Europe/Ljubljana");

    
    public static DateTime ParseLocalToUtc(string date, string time, string format)
    {
        var dateClean = DateRe.Match(date ?? "").Groups[1].Value;
        var timeClean = TimeRe.Match(time ?? "").Groups[1].Value;

        if (string.IsNullOrEmpty(dateClean) || string.IsNullOrEmpty(timeClean))
            throw new FormatException($"Invalid date/time. date='{date}', time='{time}'");

        var localNaive = DateTime.ParseExact(
            $"{dateClean} {timeClean}",
            format, CultureInfo.InvariantCulture, DateTimeStyles.None);

        return TimeZoneInfo.ConvertTimeToUtc(localNaive, GetLjubljanaTz());
    }
}