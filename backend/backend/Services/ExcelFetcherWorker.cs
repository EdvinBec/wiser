using backend.Data;

namespace backend.Services;

public class ExcelFetcherWorker : BackgroundService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly ExcelParserService _parser;
    private readonly ILogger<ExcelFetcherWorker> _log;
    
    private static readonly int[] GradesToFetch = { 1 }; 

    public ExcelFetcherWorker(ExcelFetcherService fetcher, ExcelParserService parser, ILogger<ExcelFetcherWorker> log)
    {
        _fetcher = fetcher;
        _parser = parser;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _log.LogInformation("Starting Excel fetch sweep…");

                // Iterate all class codes from Selectors.CourseMap
                foreach (var courseCode in Selectors.CourseMap.Keys)
                {
                    var grade = Selectors.Course2GradeMap[courseCode];
                   
                        if (stoppingToken.IsCancellationRequested) break;

                        try
                        {
                            _log.LogInformation("Fetching course {CourseCode}, grade {Grade}", courseCode, grade);
                            string groupName = Selectors.Course2CodeMap[courseCode];
                            await _fetcher.DownloadsExcel(courseCode, grade, groupName);
                            _log.LogInformation("Done: {CourseCode}-{Grade}", courseCode, grade);
                            
                            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _log.LogWarning(ex, "Fetch failed for {CourseCode}-{Grade}", courseCode, grade);
                            await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
                        }
                }

                _log.LogInformation("Excel fetch sweep complete. Sleeping until next cycle");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
            catch (TaskCanceledException) { /* app shutting down */ }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unhandled error in ExcelFetcherWorker loop.");
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }
    }
}
