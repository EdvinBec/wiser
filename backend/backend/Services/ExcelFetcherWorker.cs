using backend.Data;
using backend.Misc;

namespace backend.Services;

public class ExcelFetcherWorker : BackgroundService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly ExcelParserService _parser;
    private readonly Logger _logger;

    private static readonly TimeSpan DelayBetweenCourses = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan DelayAfterError = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan DelayBetweenCycles = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan DelayAfterCriticalError = TimeSpan.FromMinutes(10); 

    public ExcelFetcherWorker(ExcelFetcherService fetcher, ExcelParserService parser, Logger logger)
    {
        _fetcher = fetcher;
        _parser = parser;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _logger.LogAsync(LogLevel.Information, "Starting Excel fetch sweep…");

                foreach (var courseCode in Selectors.CourseMap.Keys)
                {
                    if (stoppingToken.IsCancellationRequested)
                        break;

                    var grade = Selectors.Course2GradeMap[courseCode];
                    var groupName = Selectors.Course2CodeMap[courseCode];

                    try
                    {
                        await _logger.LogAsync(LogLevel.Information, $"Fetching course {courseCode}, grade {grade}");
                        await _fetcher.DownloadsExcel(courseCode, grade, groupName, stoppingToken);
                        await _logger.LogAsync(LogLevel.Information, $"Done: {courseCode}-{grade}");

                        await Task.Delay(DelayBetweenCourses, stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        await _logger.LogAsync(LogLevel.Warning, $"Fetch failed for {courseCode}-{grade}", ex);
                        await Task.Delay(DelayAfterError, stoppingToken);
                    }
                }

                await _logger.LogAsync(LogLevel.Information, "Excel fetch sweep complete. Sleeping until next cycle");
                await Task.Delay(DelayBetweenCycles, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // App shutting down
            }
            catch (Exception ex)
            {
                await _logger.LogAsync(LogLevel.Error, "Unhandled error in ExcelFetcherWorker loop.", ex);
                await Task.Delay(DelayAfterCriticalError, stoppingToken);
            }
        }
    }
}
