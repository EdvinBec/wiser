using backend.Data;

namespace backend.Services;

public class ExcelFetcherWorker : BackgroundService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly ILogger<ExcelFetcherWorker> _log;
    
    private static readonly int[] GradesToFetch = { 1, 2, 3 }; 

    public ExcelFetcherWorker(ExcelFetcherService fetcher, ILogger<ExcelFetcherWorker> log)
    {
        _fetcher = fetcher;
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
                    foreach (var grade in GradesToFetch)
                    {
                        if (stoppingToken.IsCancellationRequested) break;

                        try
                        {
                            _log.LogInformation("Fetching course {CourseCode}, grade {Grade}", courseCode, grade);
                            await _fetcher.DownloadsExcel(courseCode, grade);
                            _log.LogInformation("Done: {CourseCode}-{Grade}", courseCode, grade);
                            
                            var jitterMs = Random.Shared.Next(10_000, 25_000);
                            await Task.Delay(TimeSpan.FromMinutes(1) + TimeSpan.FromMilliseconds(jitterMs), stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _log.LogWarning(ex, "Fetch failed for {CourseCode}-{Grade}", courseCode, grade);
                            await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
                        }
                    }
                }

                _log.LogInformation("Excel fetch sweep complete. Sleeping until next cycle");
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
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