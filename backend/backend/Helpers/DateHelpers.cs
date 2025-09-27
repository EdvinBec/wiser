// backend/Helpers/DateHelpers.cs
using System.Globalization;
using System.Text.RegularExpressions;

namespace backend.Helpers;

public static class DateHelpers
{
    static readonly Regex DateRe = new(@"\b(\d{1,2}\.\d{1,2}\.\d{4})\b", RegexOptions.Compiled);
    static readonly Regex TimeRe = new(@"\b(\d{1,2}:\d{2})\b", RegexOptions.Compiled);

    static TimeZoneInfo GetLjubljanaTz() =>
        OperatingSystem.IsWindows()
            ? TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time")
            : TimeZoneInfo.FindSystemTimeZoneById("Europe/Ljubljana");

    // Excel local -> UTC for storing in timestamptz
    public static DateTime ParseLocalToUtc(string date, string time, string format)
    {
        var dateClean = DateRe.Match(date ?? "").Groups[1].Value;
        var timeClean = TimeRe.Match(time ?? "").Groups[1].Value;
        if (string.IsNullOrEmpty(dateClean) || string.IsNullOrEmpty(timeClean))
            throw new FormatException($"Invalid date/time. date='{date}', time='{time}'");

        var localNaive = DateTime.ParseExact($"{dateClean} {timeClean}",
            format, CultureInfo.InvariantCulture, DateTimeStyles.None);

        return TimeZoneInfo.ConvertTimeToUtc(localNaive, GetLjubljanaTz());
    }

    // Week 1 = the week that CONTAINS Oct 1 (LOCAL Ljubljana). Return [startUtc, endUtc).
    public static (DateTime startUtc, DateTime endUtc) GetAcademicWeekWindowUtc(
        int academicYear, int weekNumber, bool weekdaysOnly = true)
    {
        var tz = GetLjubljanaTz();

        var oct1Local = new DateTime(academicYear, 10, 1, 0, 0, 0, DateTimeKind.Unspecified);
        int dow = (int)oct1Local.DayOfWeek; if (dow == 0) dow = 7; // Sunday->7
        var firstMondayLocal = oct1Local.AddDays(1 - dow).Date;

        var mondayLocal = firstMondayLocal.AddDays((weekNumber - 1) * 7);
        var endLocal = mondayLocal.AddDays(weekdaysOnly ? 5 : 7);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(mondayLocal, tz);
        var endUtc   = TimeZoneInfo.ConvertTimeToUtc(endLocal,   tz);
        return (startUtc, endUtc);
    }

    // Convert a UTC DateTime from DB to Ljubljana DateTimeOffset (with +01/+02 as appropriate)
    public static DateTimeOffset ToLjubljana(DateTime utcInstant)
    {
        if (utcInstant.Kind != DateTimeKind.Utc)
            utcInstant = DateTime.SpecifyKind(utcInstant, DateTimeKind.Utc);

        var tz = GetLjubljanaTz();
        return TimeZoneInfo.ConvertTime(new DateTimeOffset(utcInstant, TimeSpan.Zero), tz);
    }
}
