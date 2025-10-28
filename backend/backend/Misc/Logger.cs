
namespace backend.Misc;

public class Logger
{
    private readonly string _logDirectory =
        Environment.GetEnvironmentVariable("LOG_FILE_DIRECTORY")
        ?? "/Users/edvinbecic/Personal/wiser/backend/backend/Logs";

    private readonly string _logFilePath;
    private readonly object _lock = new();
    private readonly bool _useAnsiInFile;

    public Logger(string logFileName, bool useAnsiInFile = true)
    {
        var fullPath = Path.Combine(_logDirectory, logFileName);
        var directory = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);

        _logFilePath = fullPath;
        _useAnsiInFile = useAnsiInFile;
    }

    public async Task LogAsync(LogLevel level, string message, Exception? ex = null)
    {
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var plainEntry = $"{timestamp} [{level}] {message}";
        if (ex != null && level != LogLevel.Warning)
            plainEntry += $"{Environment.NewLine}Exception: {ex}";

        var entryToFile = _useAnsiInFile
            ? $"{GetAnsiColor(level)}{plainEntry}\u001b[0m"
            : plainEntry;

        lock (_lock)
        {
            File.AppendAllText(_logFilePath, entryToFile + Environment.NewLine);
        }

        PrintColored(level, plainEntry);
        await Task.CompletedTask;
    }

    public void Log(LogLevel level, string message, Exception? ex = null)
        => LogAsync(level, message, ex).GetAwaiter().GetResult();

    private static void PrintColored(LogLevel level, string message)
    {
        var prev = Console.ForegroundColor;
        Console.ForegroundColor = level switch
        {
            LogLevel.Trace or LogLevel.Debug       => ConsoleColor.Gray,
            LogLevel.Information                   => ConsoleColor.Cyan,
            LogLevel.Warning                       => ConsoleColor.Yellow,
            LogLevel.Error or LogLevel.Critical    => ConsoleColor.Red,
            _                                      => ConsoleColor.White
        };
        Console.WriteLine(message);
        Console.ForegroundColor = prev;
    }

    private static string GetAnsiColor(LogLevel level) => level switch
    {
        LogLevel.Trace or LogLevel.Debug       => "\u001b[90m", // Gray
        LogLevel.Information                   => "\u001b[36m", // Cyan
        LogLevel.Warning                       => "\u001b[33m", // Yellow
        LogLevel.Error or LogLevel.Critical    => "\u001b[31m", // Red
        _                                      => "\u001b[0m"
    };
}
