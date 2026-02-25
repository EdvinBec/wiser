using System.Security.Cryptography;
using System.Text.RegularExpressions;
using backend.Data;
using backend.DTOs;
using backend.Helpers;
using backend.Misc;
using Microsoft.Playwright;
using Xunit;

namespace backend.Services;

public class ExcelFetcherService : IAsyncLifetime
{
    public EventHandler<ExcelDownloadedEventArgs>? ExcelFileUpdated;
    public EventHandler<ExcelFetchedEventArgs>? ExcelFetched;

    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private readonly Logger _logger;
    private readonly string _downloadPath;
    private readonly string _screenshotPath;
    
    // Cache scraped form options to avoid re-scraping
    private FormOptionsDto? _cachedFormOptions = null;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    private const string PageUrl = "https://www.wise-tt.com/wtt_um_feri/index.jsp";
    private const string RootLocator = "table[style=\"width:100%;\"] > tbody > tr > td:nth-of-type(3)";
    private const int DefaultTimeoutMs = 15000;
    private const int DelayAfterClickMs = 500;
    private const int MaxRetries = 3;
    private const int RetryInitialDelayMs = 2000;

    public ExcelFetcherService(Logger logger)
    {
        _logger = logger;

        _downloadPath = Environment.GetEnvironmentVariable("DOWNLOAD_PATH")
                        ?? Path.Combine(Directory.GetCurrentDirectory(), "Data", "ExcelFiles");

        _screenshotPath = Environment.GetEnvironmentVariable("SCREENSHOT_PATH")
                          ?? Path.Combine(_downloadPath, "screenshots");

        Directory.CreateDirectory(_downloadPath);
        Directory.CreateDirectory(_screenshotPath);
    }

    public async Task InitializeAsync()
    {
        if (_playwright == null)
        {
            _playwright = await Playwright.CreateAsync();
        }

        if (_browser == null)
        {
            _browser = await _playwright.Chromium.LaunchAsync(new() { Headless = true, SlowMo = 250});
        }
    }

    public async Task DisposeAsync()
    {
        if (_browser != null)
        {
            await _browser.CloseAsync();
        }

        _playwright?.Dispose();
    }

    public async Task<FormOptionsDto> ScrapeFormOptionsAsync(CancellationToken cancellationToken = default)
    {
        // Return cached options if still valid
        if (_cachedFormOptions != null && DateTime.UtcNow < _cacheExpiry)
        {
            await _logger.LogAsync(LogLevel.Information, "Returning cached form options");
            return _cachedFormOptions;
        }

        await InitializeAsync();

        var context = await _browser!.NewContextAsync();
        var page = await context.NewPageAsync();
        page.SetDefaultTimeout(DefaultTimeoutMs);

        var formOptions = new FormOptionsDto();

        try
        {
            await page.GotoAsync(PageUrl);
            await Task.Delay(1000, cancellationToken); // Wait for page load

            var root = page.Locator(RootLocator);

            // Scrape first dropdown (Course) - looking for BV20
            var courseSelect = root.Locator("table > tbody > tr:nth-of-type(2) td div.ui-selectonemenu");
            await courseSelect.ClickAsync();
            await Task.Delay(DelayAfterClickMs, cancellationToken);

            var courseElementId = await courseSelect.GetAttributeAsync("id");
            var coursePanel = page.Locator($"[id='{courseElementId}_panel']");
            var courseItems = await coursePanel.Locator("li").AllAsync();

            var courseCodeRegex = new Regex(@"\(([^)]+)\)");

            foreach (var item in courseItems)
            {
                var text = await item.TextContentAsync() ?? "";
                if (string.IsNullOrWhiteSpace(text)) continue;

                var match = courseCodeRegex.Match(text);
                if (match.Success)
                {
                    var code = match.Groups[1].Value;
                    var itemId = await item.GetAttributeAsync("id") ?? "";
                    var selector = courseElementId != null ? itemId.Replace(courseElementId, "") : itemId;

                    formOptions.CourseOptions.Add(new DropdownOptionDto
                    {
                        Value = code,
                        Label = text.Trim(),
                        Selector = selector
                    });
                }
            }

            // Find and click on BV20 option
            var bv20Option = formOptions.CourseOptions.FirstOrDefault(o => o.Value == "BV20");
            if (bv20Option != null)
            {
                var bv20Button = page.Locator($"[id='{courseElementId}{bv20Option.Selector}']");
                await bv20Button.ClickAsync();
                await Task.Delay(DelayAfterClickMs, cancellationToken);

                // Scrape second dropdown (Grade)
                var gradeSelect = root.Locator("table > tbody > tr:nth-of-type(3) td div.ui-selectonemenu");
                await gradeSelect.ClickAsync();
                await Task.Delay(DelayAfterClickMs, cancellationToken);

                var gradeElementId = await gradeSelect.GetAttributeAsync("id");
                var gradePanel = page.Locator($"[id='{gradeElementId}_panel']");
                var gradeItems = await gradePanel.Locator("li").AllAsync();

                List<DropdownOptionDto> tempGradeOptions = new();
                foreach (var item in gradeItems)
                {
                    var text = await item.TextContentAsync() ?? "";
                    if (string.IsNullOrWhiteSpace(text)) continue;

                    var itemId = await item.GetAttributeAsync("id") ?? "";
                    var selector = itemId.Replace(gradeElementId + "_", "");

                    // Extract grade number from text (e.g., "1. letnik" -> "1")
                    var gradeMatch = System.Text.RegularExpressions.Regex.Match(text, @"^(\d+)");
                    var gradeValue = gradeMatch.Success ? gradeMatch.Groups[1].Value : text.Trim();

                    tempGradeOptions.Add(new DropdownOptionDto
                    {
                        Value = gradeValue,
                        Label = text.Trim(),
                        Selector = selector
                    });
                }

                // Scrape projects for EACH grade separately
                foreach (var grade in tempGradeOptions)
                {
                    try
                    {
                        await _logger.LogAsync(LogLevel.Information, $"Scraping projects for grade {grade.Value} ({grade.Label})");
                        
                        // Click grade dropdown to open it
                        await gradeSelect.ClickAsync();
                        await Task.Delay(DelayAfterClickMs, cancellationToken);

                        // Click the specific grade using JavaScript evaluation instead of Force click
                        // This is more reliable for elements that might not be visible in viewport
                        var gradeButton = page.Locator($"[id='{gradeElementId}_{grade.Selector}']");
                        await gradeButton.WaitForAsync(new() { State = WaitForSelectorState.Attached, Timeout = 5000 });
                        await gradeButton.EvaluateAsync("el => el.click()");
                        await Task.Delay(500, cancellationToken); // Longer delay for form to update

                        // Now scrape project dropdown for this grade
                        var projectSelect = root.Locator("table > tbody > tr:nth-of-type(4) td div.ui-selectonemenu");
                        
                        // Check if dropdown is disabled
                        var isDisabled = await projectSelect.GetAttributeAsync("aria-disabled");
                        if (isDisabled == "true")
                        {
                            await _logger.LogAsync(LogLevel.Warning, $"Project dropdown is disabled for grade {grade.Value}");
                            formOptions.ProjectsByGrade[grade.Value] = new List<DropdownOptionDto>();
                            continue;
                        }
                        
                        await projectSelect.ClickAsync();
                        await Task.Delay(DelayAfterClickMs, cancellationToken);

                        var projectElementId = await projectSelect.GetAttributeAsync("id");
                        var projectPanel = page.Locator($"[id='{projectElementId}_panel']");
                        var projectItems = await projectPanel.Locator("li").AllAsync();

                        var projectsForGrade = new List<DropdownOptionDto>();
                        foreach (var item in projectItems)
                        {
                            var text = await item.TextContentAsync() ?? "";
                            if (string.IsNullOrWhiteSpace(text)) continue;

                            var itemId = await item.GetAttributeAsync("id") ?? "";
                            var selector = itemId.Replace(projectElementId + "_", "");
                            var dataLabel = await item.GetAttributeAsync("data-label");
                            
                            await _logger.LogAsync(LogLevel.Information, 
                                $"  Project item - text: '{text.Trim()}', data-label: '{dataLabel}', selector: {selector}");

                            // Extract project code from parentheses at the end of the string (e.g., "...(VP1)" -> "VP1")
                            // If no parentheses found, use the full text
                            var textToProcess = !string.IsNullOrWhiteSpace(dataLabel) ? dataLabel : text.Trim();
                            var value = ExtractProjectCode(textToProcess);

                            await _logger.LogAsync(LogLevel.Information, 
                                $"    -> Extracted value: '{value}'");

                            var projectOption = new DropdownOptionDto
                            {
                                Value = value,
                                Label = text.Trim(),  // Keep full text as label for display
                                Selector = selector
                            };

                            projectsForGrade.Add(projectOption);
                            
                            // Also add to global list for backward compatibility
                            if (!formOptions.ProjectOptions.Any(p => p.Value == projectOption.Value))
                            {
                                formOptions.ProjectOptions.Add(projectOption);
                            }
                        }

                        // Store projects for this specific grade
                        formOptions.ProjectsByGrade[grade.Value] = projectsForGrade;
                        await _logger.LogAsync(LogLevel.Information, $"Grade {grade.Value} has {projectsForGrade.Count} projects");
                        
                        // Close project dropdown
                        await projectSelect.ClickAsync();
                        await Task.Delay(DelayAfterClickMs, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        await _logger.LogAsync(LogLevel.Warning, $"Failed to scrape projects for grade {grade.Value}: {ex.Message}");
                        formOptions.ProjectsByGrade[grade.Value] = new List<DropdownOptionDto>();
                    }
                }

                // Add all grade options after successfully scraping all projects
                formOptions.GradeOptions.AddRange(tempGradeOptions);
            }
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Error, $"Error scraping form options: {ex.Message}", ex);
        }
        finally
        {
            await context.CloseAsync();
        }

        // Cache the results
        _cachedFormOptions = formOptions;
        _cacheExpiry = DateTime.UtcNow.Add(CacheDuration);
        await _logger.LogAsync(LogLevel.Information, $"Cached form options (expires in {CacheDuration.TotalMinutes} minutes)");

        return formOptions;
    }

    public async Task DownloadsExcel(string courseCode, int grade, string project, string groupName, CancellationToken cancellationToken = default)
    {
        await InitializeAsync();

        var filename = $"{courseCode}-{grade}-{project}.xls";
        var finalPath = Path.Combine(_downloadPath, filename);
        var tempPath = Path.Combine(_downloadPath, $"{courseCode}-{grade}-{project}.download");

        var context = await _browser!.NewContextAsync(new() { AcceptDownloads = true });
        var page = await context.NewPageAsync();
        page.SetDefaultTimeout(DefaultTimeoutMs);
        page.SetDefaultNavigationTimeout(DefaultTimeoutMs);

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            await RetryHelper.ExecuteWithRetryAsync(
                async () => await page.GotoAsync(PageUrl),
                _logger,
                $"Navigate to {PageUrl}",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            await RetryHelper.ExecuteWithRetryAsync(
                async () => await SelectCourseOnPage(page, courseCode, cancellationToken),
                _logger,
                $"Select course {courseCode}",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            await RetryHelper.ExecuteWithRetryAsync(
                async () => await SelectGradeOnPage(page, grade, cancellationToken),
                _logger,
                $"Select grade {grade}",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            await RetryHelper.ExecuteWithRetryAsync(
                async () => await SelectProjectOnPage(page, project, cancellationToken),
                _logger,
                $"Select project {project}",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            await RetryHelper.ExecuteWithRetryAsync(
                async () => await SelectExportOnPage(page, cancellationToken),
                _logger,
                "Select export option",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            var buttonId = await RetryHelper.ExecuteWithRetryAsync(
                async () => await ClickDownloadOnPage(page),
                _logger,
                "Get download button ID",
                MaxRetries,
                RetryInitialDelayMs,
                cancellationToken: cancellationToken);

            var download = await page.RunAndWaitForDownloadAsync(async () =>
            {
                await page.ClickAsync($"[id='{buttonId}']");
            });

            await download.SaveAsAsync(tempPath);

            await HandleDownloadedFile(tempPath, finalPath, courseCode, grade, project, groupName);
        }
        catch (OperationCanceledException oce)
        {
            await CaptureScreenshotOnError(page, courseCode, grade, project, "canceled");
            await _logger.LogAsync(LogLevel.Warning,
                $"Skipping {courseCode}-{grade}-{project}: iteration canceled (likely selector issue). {oce.Message}", oce);
        }
        catch (Exception ex)
        {
            await CaptureScreenshotOnError(page, courseCode, grade, project, "error");
            await _logger.LogAsync(LogLevel.Error,
                $"Skipping {courseCode}-{grade}-{project}: unexpected error while fetching. {ex.Message}", ex);
        }
        finally
        {
            await context.CloseAsync();
        }
    }

    private async Task<string> ClickDownloadOnPage(IPage page)
    {
        var excelSpan = page.Locator("span.ui-button-text.ui-c", new() { HasTextString = "Izpis (Excel)" });
        var parent = excelSpan.Locator("..");

        var parentId = await parent.GetAttributeAsync("id");
        return parentId!;
    }

    private async Task SelectExportOnPage(IPage page, CancellationToken cancellationToken)
    {
        await page.Locator("span.ui-button-text.ui-c", new() { HasTextString = "Izpisi" }).ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);
    }

    private async Task SelectGradeOnPage(IPage page, int grade, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = page.Locator(RootLocator);
        var gradeSelect = root.Locator("table > tbody > tr:nth-of-type(3) td div.ui-selectonemenu");

        await gradeSelect.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);

        var elementId = await gradeSelect.GetAttributeAsync("id");

        // Try to use cached form options to find grade selector
        string? gradeSelector = null;
        
        if (_cachedFormOptions != null)
        {
            var gradeOption = _cachedFormOptions.GradeOptions.FirstOrDefault(g => g.Value == grade.ToString());
            if (gradeOption != null)
            {
                gradeSelector = gradeOption.Selector;
            }
        }

        if (gradeSelector == null)
        {
            var ex = new InvalidOperationException($"No selectors for grade {grade}");
            await _logger.LogAsync(LogLevel.Critical, ex.Message, ex);
            throw new OperationCanceledException("Canceled due to missing grade mapping.", ex, cancellationToken);
        }

        var gradeButton = page.Locator($"[id='{elementId}_{gradeSelector}']");
        await gradeButton.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);
    }

    /// <summary>
    /// Extract project code from project name. If the name contains parentheses at the end (e.g., "...(VP1)"),
    /// extract the content. Otherwise, return the full text.
    /// </summary>
    private static string ExtractProjectCode(string projectName)
    {
        var trimmed = projectName.Trim();
        
        // Look for content in the last set of parentheses
        var lastOpenParen = trimmed.LastIndexOf('(');
        var lastCloseParen = trimmed.LastIndexOf(')');
        
        // If we have valid parentheses at the end
        if (lastOpenParen >= 0 && lastCloseParen > lastOpenParen && lastCloseParen == trimmed.Length - 1)
        {
            var code = trimmed.Substring(lastOpenParen + 1, lastCloseParen - lastOpenParen - 1).Trim();
            return !string.IsNullOrWhiteSpace(code) ? code : trimmed;
        }
        
        return trimmed;
    }

    private async Task SelectProjectOnPage(IPage page, string project, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = page.Locator(RootLocator);
        var projectSelect = root.Locator("table > tbody > tr:nth-of-type(4) td div.ui-selectonemenu");

        await projectSelect.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);

        var elementId = await projectSelect.GetAttributeAsync("id");

        // Try to use cached form options to find project selector
        string? projectSelector = null;
        
        if (_cachedFormOptions != null)
        {
            // Search through all projects in cache
            var allProjects = _cachedFormOptions.ProjectOptions;
            var projectOption = allProjects.FirstOrDefault(p => p.Value == project || p.Label == project);
            
            if (projectOption != null)
            {
                projectSelector = projectOption.Selector;
            }
        }
        
        // Fallback to old map if not found in cache
        if (projectSelector == null && Selectors.Project2SelectorMap.TryGetValue(project, out var fallbackSelector))
        {
            projectSelector = fallbackSelector;
        }

        if (projectSelector == null)
        {
            var ex = new InvalidOperationException($"No selectors for project {project}");
            await _logger.LogAsync(LogLevel.Critical, ex.Message, ex);
            throw new OperationCanceledException("Canceled due to missing project mapping.", ex, cancellationToken);
        }

        var projectButton = page.Locator($"[id='{elementId}_{projectSelector}']");
        await projectButton.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);
    }

    private async Task SelectCourseOnPage(IPage page, string courseCode, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = page.Locator(RootLocator);
        var programSelect = root.Locator("table > tbody > tr:nth-of-type(2) td div.ui-selectonemenu");

        await programSelect.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);

        var elementId = await programSelect.GetAttributeAsync("id");

        if (!Selectors.CourseMap.TryGetValue(courseCode, out var courseItemNumber))
        {
            var ex = new InvalidOperationException($"No selectors for {courseCode} course");
            await _logger.LogAsync(LogLevel.Critical, ex.Message, ex);
            throw new OperationCanceledException("Canceled due to missing course mapping.", ex, cancellationToken);
        }

        var courseButton = page.Locator($"[id='{elementId}{courseItemNumber}']");
        await courseButton.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);
    }

    private async Task HandleDownloadedFile(string tempPath, string finalPath, string courseCode, int grade, string project, string groupName)
    {
        bool fileWasUpdated = true;
        
        if (File.Exists(finalPath))
        {
            var filesAreEqual = await FilesAreEqualAsync(finalPath, tempPath);
            if (filesAreEqual)
            {
                File.Delete(tempPath);
                fileWasUpdated = false;
            }
            else
            {
                var backupPath = finalPath + ".bak";
                if (File.Exists(backupPath))
                {
                    File.Delete(backupPath);
                }

                File.Replace(tempPath, finalPath, backupPath);
                File.Delete(backupPath);
            }
        }
        else
        {
            File.Move(tempPath, finalPath);
        }

        // Always fire both events - ExcelFetched for timestamp update, ExcelFileUpdated for parsing
        ExcelFetched?.Invoke(this, new ExcelFetchedEventArgs(DateTimeOffset.Now, courseCode, grade, project));
        ExcelFileUpdated?.Invoke(this, new ExcelDownloadedEventArgs(finalPath, courseCode, grade, project, groupName));
    }

    private async Task CaptureScreenshotOnError(IPage page, string courseCode, int grade, string project, string errorType)
    {
        try
        {
            var timestamp = DateTimeOffset.Now.ToString("yyyyMMdd_HHmmss");
            var filename = $"{courseCode}-{grade}-{project}_{errorType}_{timestamp}.png";
            var screenshotPath = Path.Combine(_screenshotPath, filename);

            await page.ScreenshotAsync(new PageScreenshotOptions
            {
                Path = screenshotPath,
                FullPage = true
            });

            await _logger.LogAsync(LogLevel.Information,
                $"Screenshot saved: {screenshotPath}");
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Warning,
                $"Failed to capture screenshot for {courseCode}-{grade}-{project}: {ex.Message}");
        }
    }

    private static async Task<bool> FilesAreEqualAsync(string path1, string path2)
    {
        var f1 = new FileInfo(path1);
        var f2 = new FileInfo(path2);
        if (f1.Length != f2.Length) return false;

        using var sha = SHA256.Create();
        await using var s1 = File.OpenRead(path1);
        await using var s2 = File.OpenRead(path2);
        var h1 = await sha.ComputeHashAsync(s1);
        var h2 = await sha.ComputeHashAsync(s2);
        return h1.AsSpan().SequenceEqual(h2);
    }

    public sealed record ExcelDownloadedEventArgs(string Path, string CourseCode, int Grade, string Project, string GroupName);
    public sealed record ExcelFetchedEventArgs(DateTimeOffset LatestCheck, string CourseCode, int Grade, string Project);
}
