using backend.Data;
using backend.Misc;
using backend.DTOs;

namespace backend.Services;

public class ExcelFetcherWorker : BackgroundService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly ExcelParserService _parser;
    private readonly Logger _logger;
    private List<Selectors.CourseConfig> _courseConfigs = new();

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

    private async Task<bool> InitializeCourseConfigsAsync(CancellationToken stoppingToken)
    {
        try
        {
            await _logger.LogAsync(LogLevel.Information, "Initializing course configurations by scraping form options...");
            
            var formOptions = await _fetcher.ScrapeFormOptionsAsync(stoppingToken);
            
            // Build all combinations of course/grade/project - FILTER FOR ONLY BV20
            _courseConfigs.Clear();
            
            // Only process BV20 course
            var bv20Course = formOptions.CourseOptions.FirstOrDefault(c => c.Value == "BV20");
            if (bv20Course != null)
            {
                foreach (var grade in formOptions.GradeOptions)
                {
                    // Get projects specifically for this grade
                    var projectsForGrade = formOptions.ProjectsByGrade.ContainsKey(grade.Value)
                        ? formOptions.ProjectsByGrade[grade.Value]
                        : new List<DropdownOptionDto>();

                    foreach (var project in projectsForGrade)
                    {
                        _courseConfigs.Add(new Selectors.CourseConfig
                        {
                            CourseCode = bv20Course.Value,
                            Grade = int.Parse(grade.Value),
                            Project = project.Value,
                            GroupName = $"{bv20Course.Value} {grade.Value}"
                        });
                    }
                }
            }
            
            await _logger.LogAsync(LogLevel.Information, 
                $"Initialized {_courseConfigs.Count} course configurations for BV20");
            
            return true;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Error, "Failed to initialize course configs", ex);
            return false;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initialize course configs from scraped form options
        var initialized = await InitializeCourseConfigsAsync(stoppingToken);
        if (!initialized)
        {
            await _logger.LogAsync(LogLevel.Error, "Failed to initialize. Worker will retry in 1 minute.");
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Re-scrape options to check for any new grades/projects
                if (_courseConfigs.Count == 0)
                {
                    await InitializeCourseConfigsAsync(stoppingToken);
                }

                if (_courseConfigs.Count == 0)
                {
                    await _logger.LogAsync(LogLevel.Warning, "No course configs available. Retrying in 5 minutes.");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                    continue;
                }

                await _logger.LogAsync(LogLevel.Information, 
                    $"Starting Excel fetch sweep for {_courseConfigs.Count} courses...");

                foreach (var config in _courseConfigs)
                {
                    if (stoppingToken.IsCancellationRequested)
                        break;

                    try
                    {
                        await _logger.LogAsync(LogLevel.Information, 
                            $"Fetching course {config.CourseCode}, grade {config.Grade}, project {config.Project}");
                        await _fetcher.DownloadsExcel(config.CourseCode, config.Grade, config.Project, config.GroupName, stoppingToken);
                        await _logger.LogAsync(LogLevel.Information, 
                            $"Done: {config.CourseCode}-{config.Grade}-{config.Project}");

                        await Task.Delay(DelayBetweenCourses, stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        await _logger.LogAsync(LogLevel.Warning, 
                            $"Fetch failed for {config.CourseCode}-{config.Grade}-{config.Project}", ex);
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
