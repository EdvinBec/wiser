using backend.Configs;
using backend.Helpers;
using backend.Models;
using backend.Models.Enums;
using backend.Misc;
using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;

namespace backend.Services;

public class ExcelParserService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Logger _logger;

    private const int ColumnDay = 0;
    private const int ColumnDate = 1;
    private const int ColumnTime = 2;
    private const int ColumnRoom = 3;
    private const int ColumnType = 4;
    private const int ColumnGroup = 5;
    private const int ColumnInstructor = 6;
    private const string HeaderMarker = "Dan";

    public ExcelParserService(ExcelFetcherService fetcher, IServiceScopeFactory scopeFactory, Logger logger)
    {
        _fetcher = fetcher;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _fetcher.ExcelFileUpdated += OnExcelFileUpdated;
        _fetcher.ExcelFetched += UpdateLatestCheck;
    }

    private async void OnExcelFileUpdated(object? sender, ExcelFetcherService.ExcelDownloadedEventArgs e)
    {
        await _logger.LogAsync(LogLevel.Information, $"Excel file updated event received for {e.CourseCode}-{e.Grade}-{e.Project}");
        try
        {
            await ProcessExcelFileAsync(e);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Error, $"Failed to process Excel file for {e.CourseCode}-{e.Grade}", ex);
        }
    }

    private async Task ProcessExcelFileAsync(ExcelFetcherService.ExcelDownloadedEventArgs e)
    {
        var sessions = new List<Session>();
        int totalRowsSeen = 0;
        int headerMarkersSeen = 0;
        int sessionRowsConsidered = 0;
        int sessionsParsed = 0;
        int rowsSkippedUnknownDay = 0;
        int rowsSkippedNoClass = 0;
        int rowErrors = 0;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<DatabaseService>();
            ISheet sheet;
            string path = e.Path;

            var courseId = await database.CreateCourseAsync(e.CourseCode, e.Grade, e.Project, DateTimeOffset.Now);
            await _logger.LogAsync(LogLevel.Information, $"Parsing Excel for {e.CourseCode}-{e.Grade}-{e.Project}. CourseId={courseId}. Path={path}");

            using (var fStream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                fStream.Position = 0;
                HSSFWorkbook workbook = new HSSFWorkbook(fStream);
                sheet = workbook.GetSheetAt(0);

                // Remove empty columns
                var emptyCols = ExcelCleanupHelper.FindCompletelyEmptyColumns(sheet, fromRowInclusive: ExcelParserConfig.headerRowNumber);
                if (emptyCols.Count > 0)
                {
                    ExcelCleanupHelper.DeleteColumns(sheet, emptyCols);
                }

                // Go through and parse each row
                int? classId = null;
                for (int j = 0; j <= sheet.LastRowNum; j++)
                {
                    var row = sheet.GetRow(j);
                    totalRowsSeen++;
                    
                    if (row == null)
                    {
                        continue;
                    }
                    
                    var dayCell = row.GetCell(ColumnDay);

                    // Find and save the class name
                    if (dayCell.ToString() == HeaderMarker)
                    {
                        var classNameRow = sheet.GetRow(j - 1);
                        var className = classNameRow.GetCell(ColumnDay)?.ToString()?.Trim();
                        if (className == null)
                        {
                            throw new ArgumentNullException("Class name cell is missing");
                        }
                        classId = await database.CreateClassAsync(className, courseId);

                        await _logger.LogAsync(LogLevel.Information, $"Class saved to database. Name={className}, Id={classId}");
                        headerMarkersSeen++;
                        continue;
                    }

                    // Check if this is a valid session row by looking for a date in the date column
                    // This is more reliable than checking day names (Ponedeljek vs Ponedelje)
                    var dateCell = row.GetCell(ColumnDate);
                    var dateString = dateCell?.ToString()?.Trim();
                    bool isSessionRow = !string.IsNullOrWhiteSpace(dateString) && 
                                       dateString.Contains(".") && 
                                       classId != null;

                    if (isSessionRow)
                    {
                        sessionRowsConsidered++;

                        try
                        {
                            dayCell = row.GetCell(ColumnDay);
                            var timeCell = row.GetCell(ColumnTime);
                            var roomCell = row.GetCell(ColumnRoom);
                            var typeCell = row.GetCell(ColumnType);
                            var groupCell = row.GetCell(ColumnGroup);
                            var instructorCell = row.GetCell(ColumnInstructor);
                            
                            if (dateString == null)
                            {
                                throw new ArgumentNullException("Date cell is missing");
                            }
                            var startTimeString = timeCell.ToString()?.Split('-')[0].Trim();
                            var finishTimeString = timeCell.ToString()?.Split('-')[1].Trim();
                            if (startTimeString == null || finishTimeString == null)
                            {
                                throw new FormatException($"Invalid time range {dateString}");
                            }
                            var startDateTimeOffset = DateHelpers.ConstructDateTimeFromString(dateString!, startTimeString!);
                            var finishDateTimeOffset = DateHelpers.ConstructDateTimeFromString(dateString!, finishTimeString!);

                            var room = roomCell.ToString()?.Trim();
                            if (room == null)
                            {
                                throw new ArgumentNullException("Room cell is missing");
                            }
                            var roomId = await database.CreateRoomAsync(room);

                            var typeString = typeCell.ToString()?.Trim();
                            if (typeString == null)
                            {
                                throw new ArgumentNullException("Type cell is missing");
                            }
                            var type = ParseSessionType(typeString);

                            List<int> groupIds = new List<int>();
                            List<string> groups = new List<string>();
                            var groupsString = groupCell.ToString()?.Trim();
                            if (groupsString == null)
                            {
                                throw new ArgumentNullException("Groups cell is missing");
                            }
                            
                            await _logger.LogAsync(LogLevel.Debug, $"Row {j}: Type={typeString}, Groups={groupsString}");
                            
                            // For lectures (PR), ignore groups to avoid duplicates across projects
                            // Project filter already handles filtering, so we don't need group-level separation
                            if (type == SessionType.Lecture)
                            {
                                // Create one session without specific group - project filter will handle visibility
                                groups.Add("PR"); // Use a standard marker for lectures
                            }
                            else
                            {
                                // Parse all groups from the cell (format: "BV20 VS 1.a, BV20 VS 1.b")
                                var groupParts = groupsString.Split(',');
                                foreach (var part in groupParts)
                                {
                                    var partString = part.Trim();
                                    
                                    // Format is typically "COURSE_CODE VS GROUP_NUMBER"
                                    // e.g., "BV20 VS 1.a" or just "BV20" for seminars
                                    var partSplit = partString.Split("VS", StringSplitOptions.TrimEntries);
                                    
                                    if (type == SessionType.SeminarExercise)
                                    {
                                        // For seminars, use the course code part
                                        groups.Add(partSplit[0].Trim());
                                    }
                                    else if (partSplit.Length > 1)
                                    {
                                        // For exercises, use the specific group number
                                        groups.Add(partSplit[1].Trim());
                                    }
                                    else
                                    {
                                        // Fallback - use the whole string
                                        groups.Add(partString);
                                    }
                                }
                            }
                            
                            await _logger.LogAsync(LogLevel.Debug, $"  Parsed groups: {string.Join(", ", groups)} (count: {groups.Count})");
                                
                            foreach (var group in groups)
                            {
                                var groupId = await database.CreateGroupAsync(group, courseId);
                                groupIds.Add(groupId);
                            }

                            var instructorString = instructorCell.ToString()?.Trim();
                            if (instructorString == null)
                            {
                                throw new ArgumentNullException("Instructor cell is missing");
                            }
                            var instructorId = await database.CreateInstructorAsync(instructorString);

                            if (courseId == null)
                            {
                                throw new InvalidOperationException("CourseId is missing");
                            }
                            
                            if (classId == null)
                            {
                                throw new InvalidOperationException("ClassId is missing");
                            }
                            
                            await _logger.LogAsync(LogLevel.Debug, $"  Creating {groupIds.Count} sessions for classes/groups");
                            
                            // For lectures, create only ONE session (ignore multiple groups to avoid duplicates)
                            // For other types, create one session per group
                            if (type == SessionType.Lecture && groupIds.Count > 0)
                            {
                                sessions.Add(new Session
                                {
                                    CourseId = courseId,
                                    ClassId = (int)classId,
                                    InstructorId = instructorId,
                                    RoomId = roomId,
                                    StartAt = startDateTimeOffset.ToUniversalTime(),
                                    FinishAt = finishDateTimeOffset.ToUniversalTime(),
                                    Type = type,
                                    GroupId = groupIds[0] // Use first group as marker
                                });
                                sessionsParsed++;
                            }
                            else
                            {
                                foreach (var groupId in groupIds)
                                {
                                    sessions.Add(new Session
                                    {
                                        CourseId = courseId,
                                        ClassId = (int)classId,
                                        InstructorId = instructorId,
                                        RoomId = roomId,
                                        StartAt = startDateTimeOffset.ToUniversalTime(),
                                        FinishAt = finishDateTimeOffset.ToUniversalTime(),
                                        Type = type,
                                        GroupId = groupId
                                    });
                                    sessionsParsed++;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            rowErrors++;
                            await _logger.LogAsync(LogLevel.Warning, $"Failed to parse session row {j}", ex);
                        }
                    }
                    else
                    {
                        if (classId == null) rowsSkippedNoClass++;
                        else rowsSkippedUnknownDay++;
                    }
                }
            }

            await database.ExecuteInTransactionAsync(async () =>
            {
                await database.DeleteSessionsByCourseAsync(courseId);
                await database.AddSessions(sessions);

                await database.SaveContext();
            });

            await _logger.LogAsync(
                LogLevel.Information,
                $"Parse summary for {e.CourseCode}-{e.Grade}: totalRows={totalRowsSeen}, headers={headerMarkersSeen}, considered={sessionRowsConsidered}, parsedSessions={sessionsParsed}, skippedNoClass={rowsSkippedNoClass}, skippedUnknownDay={rowsSkippedUnknownDay}, rowErrors={rowErrors}");
        }
        catch (Exception exception)
        {
            await _logger.LogAsync(LogLevel.Error, $"Parser failed for {e.CourseCode}-{e.Grade}", exception);
            throw;
        }
    }

    private static SessionType ParseSessionType(string typeString)
    {
        // Extract session type code (PR, RV, SV, LV) from the string
        // Handles formats like "PR", "(O) PR", "(o) SV", etc.
        var upper = typeString.ToUpper().Trim();
        
        if (upper.Contains("PR")) return SessionType.Lecture;
        if (upper.Contains("RV")) return SessionType.ComputerExercise;
        if (upper.Contains("SV")) return SessionType.SeminarExercise;
        if (upper.Contains("LV")) return SessionType.LabExercise;
        
        return SessionType.Other;
    }

    private async void UpdateLatestCheck(object? sender, ExcelFetcherService.ExcelFetchedEventArgs e)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<DatabaseService>();

            await database.UpdateCourseAsync(e.CourseCode, e.Grade, e.Project, e.LatestCheck);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Error, $"Failed to update latest check for {e.CourseCode}-{e.Grade}-{e.Project}", ex);
        }
    }
}
