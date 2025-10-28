using System.Security.Cryptography;
using backend.Data;
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
                        ?? throw new InvalidOperationException("DOWNLOAD_PATH environment variable is not set");

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
            _browser = await _playwright.Chromium.LaunchAsync(new() { Headless = false, SlowMo = 250});
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

    public async Task DownloadsExcel(string courseCode, int grade, string groupName, CancellationToken cancellationToken = default)
    {
        await InitializeAsync();

        var filename = $"{courseCode}-{grade}.xls";
        var finalPath = Path.Combine(_downloadPath, filename);
        var tempPath = Path.Combine(_downloadPath, $"{courseCode}-{grade}.download");

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
                async () => await SelectGradeOnPage(page, courseCode, cancellationToken),
                _logger,
                $"Select grade for {courseCode}",
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

            await HandleDownloadedFile(tempPath, finalPath, courseCode, grade, groupName);
        }
        catch (OperationCanceledException oce)
        {
            await CaptureScreenshotOnError(page, courseCode, grade, "canceled");
            await _logger.LogAsync(LogLevel.Warning,
                $"Skipping {courseCode}-{grade}: iteration canceled (likely selector issue). {oce.Message}", oce);
        }
        catch (Exception ex)
        {
            await CaptureScreenshotOnError(page, courseCode, grade, "error");
            await _logger.LogAsync(LogLevel.Error,
                $"Skipping {courseCode}-{grade}: unexpected error while fetching. {ex.Message}", ex);
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

    private async Task SelectGradeOnPage(IPage page, string courseCode, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = page.Locator(RootLocator);
        var gradeSelect = root.Locator("table > tbody > tr:nth-of-type(3) td div.ui-selectonemenu");

        await gradeSelect.ClickAsync();
        await Task.Delay(DelayAfterClickMs, cancellationToken);

        var elementId = await gradeSelect.GetAttributeAsync("id");

        if (!Selectors.Course2GradeMap.TryGetValue(courseCode, out var grade))
        {
            var ex = new InvalidOperationException($"No selectors for {courseCode} course");
            await _logger.LogAsync(LogLevel.Critical, ex.Message, ex);
            throw new OperationCanceledException("Canceled due to missing course mapping.", ex, cancellationToken);
        }

        var gradeButton = page.Locator($"[id='{elementId}_{grade}']");
        await gradeButton.ClickAsync();
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

    private async Task HandleDownloadedFile(string tempPath, string finalPath, string courseCode, int grade, string groupName)
    {
        if (File.Exists(finalPath))
        {
            var filesAreEqual = await FilesAreEqualAsync(finalPath, tempPath);
            if (filesAreEqual)
            {
                File.Delete(tempPath);
                ExcelFetched?.Invoke(this, new ExcelFetchedEventArgs(DateTimeOffset.Now, courseCode, grade));
                return;
            }

            var backupPath = finalPath + ".bak";
            if (File.Exists(backupPath))
            {
                File.Delete(backupPath);
            }

            File.Replace(tempPath, finalPath, backupPath);
            File.Delete(backupPath);
        }
        else
        {
            File.Move(tempPath, finalPath);
        }

        ExcelFileUpdated?.Invoke(this, new ExcelDownloadedEventArgs(finalPath, courseCode, grade, groupName));
    }

    private async Task CaptureScreenshotOnError(IPage page, string courseCode, int grade, string errorType)
    {
        try
        {
            var timestamp = DateTimeOffset.Now.ToString("yyyyMMdd_HHmmss");
            var filename = $"{courseCode}-{grade}_{errorType}_{timestamp}.png";
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
                $"Failed to capture screenshot for {courseCode}-{grade}: {ex.Message}");
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

    public sealed record ExcelDownloadedEventArgs(string Path, string CourseCode, int Grade, string GroupName);
    public sealed record ExcelFetchedEventArgs(DateTimeOffset LatestCheck, string CourseCode, int Grade);
}
