using System.Security.Cryptography;
using backend.Data;
using Microsoft.Playwright;
using Xunit;

namespace backend.Services;

public class ExcelFetcherService : IAsyncLifetime
{
    public EventHandler<ExcelDownloadedEventArgs>? ExcelFileUpdated;
    public EventHandler<ExcelFetchedEventArgs>? ExcelFetched;
    
    private IPlaywright _playwright = null;
    private IBrowser _browser = null;
    
    // Constants
    private string pageUrl = "https://www.wise-tt.com/wtt_um_feri/index.jsp";

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
        await _browser.CloseAsync();
        _playwright.Dispose();
    }

    public async Task DownloadsExcel(string courseCode, int grade, string groupName)
    {
        await InitializeAsync();
        var downloadPath = Environment.GetEnvironmentVariable("DOWNLOAD_PATH")
                           ?? "/Users/edvinbecic/Personal/wiser/backend/backend/Data/ExcelFiles";
        Directory.CreateDirectory(downloadPath);

        var filename = $"{courseCode}-{grade}.xls";
        var finalPath = Path.Combine(downloadPath, filename);
        var tempPath = Path.Combine(downloadPath, $"{courseCode}-{grade}.download");
        
        var context = await _browser.NewContextAsync(new() { AcceptDownloads = true });
        var page = await context.NewPageAsync();

        try
        {
            await page.GotoAsync(pageUrl);

            await SelectCourseByCodeAsync(page, courseCode);
            await SelectGradeAsync(page, grade);

            if (!Selectors.ButtonMap.TryGetValue("IZPISI", out var buttonId))
            {
                throw new InvalidOperationException($"No mapping for button IZPISI");
            }

            await page.ClickAsync($"#{buttonId}");

            if (!Selectors.ButtonMap.TryGetValue("EXCEL", out var excelButtonId))
            {
                throw new InvalidOperationException($"No mapping for button EXCEL");
            }

            await page.WaitForSelectorAsync($"#{excelButtonId}", new() { State = WaitForSelectorState.Visible });

            var download = await page.RunAndWaitForDownloadAsync(async () =>
            {
                await page.ClickAsync($"#{excelButtonId}");
            });

            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }

            await download.SaveAsAsync(tempPath);

            if (File.Exists(finalPath))
            {
                var same = await FilesAreEqualAsync(finalPath, tempPath);
                if (same)
                {
                    File.Delete(tempPath);
                    ExcelFetched?.Invoke(this, new ExcelFetchedEventArgs(DateTimeOffset.Now, courseCode, grade));
                    return;
                }

                var backupPath = finalPath + ".bak";
                if (File.Exists(backupPath)) File.Delete(backupPath);
                File.Replace(tempPath, finalPath, backupPath);
                File.Delete(backupPath);
            }
            else
            {
                File.Move(tempPath, finalPath);
            }

            ExcelFileUpdated?.Invoke(this, new ExcelDownloadedEventArgs(finalPath, courseCode, grade, groupName));
        }
        finally
        {
            await _browser.CloseAsync();
            _browser = null;
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
    private async Task SelectCourseByCodeAsync(IPage page, string code)
    {
        if (!Selectors.ButtonMap.TryGetValue("COURSE", out var buttonId))
            throw new InvalidOperationException("No mapping for button COURSE");

        await page.Locator($"[id='{buttonId}']").ClickAsync();

        var panelSel = $"[id='{buttonId}_items']";
        await page.Locator(panelSel).WaitForAsync(new() { State = WaitForSelectorState.Visible });

        if (!Selectors.CourseMap.TryGetValue(code, out var courseItemId))
            throw new InvalidOperationException($"No mapping for course {code}");

        var item = page.Locator($"[id='{courseItemId}']");
        await item.WaitForAsync(new() { State = WaitForSelectorState.Attached });
        await item.ClickAsync();
    }
    private async Task SelectGradeAsync(IPage page, int grade)
    {
        if (!Selectors.ButtonMap.TryGetValue("GRADE", out var buttonId))
            throw new InvalidOperationException("No mapping for button GRADE");

        await page.Locator($"[id='{buttonId}']").ClickAsync();

        var panelSel = $"[id='{buttonId}_items']";
        await page.Locator(panelSel).WaitForAsync(new() { State = WaitForSelectorState.Visible });

        if (!Selectors.GradeMap.TryGetValue(grade, out var gradeItemId))
            throw new InvalidOperationException($"No mapping for grade {grade}");

        var item = page.Locator($"[id='{gradeItemId}']");
        await item.WaitForAsync(new() { State = WaitForSelectorState.Attached });
        await item.ClickAsync();
    }
    public sealed record ExcelDownloadedEventArgs(string Path, string CourseCode, int Grade, string GroupName);
    public sealed record ExcelFetchedEventArgs(DateTimeOffset LatestCheck, string CourseCode, int Grade);
}