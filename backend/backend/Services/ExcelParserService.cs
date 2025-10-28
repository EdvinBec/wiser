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

            var courseId = await database.CreateCourseAsync(e.CourseCode, e.Grade, DateTimeOffset.Now);
            await _logger.LogAsync(LogLevel.Information, $"Parsing Excel for {e.CourseCode}-{e.Grade}. CourseId={courseId}. Path={path}");

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

                    if (ExcelParserConfig.daysInWeek.Contains(dayCell.ToString()!) && classId != null)
                    {
                        sessionRowsConsidered++;

                        try
                        {
                            dayCell = row.GetCell(ColumnDay);
                            var dateCell = row.GetCell(ColumnDate);
                            var timeCell = row.GetCell(ColumnTime);
                            var roomCell = row.GetCell(ColumnRoom);
                            var typeCell = row.GetCell(ColumnType);
                            var groupCell = row.GetCell(ColumnGroup);
                            var instructorCell = row.GetCell(ColumnInstructor);
                            
                            var dateString = dateCell.ToString()?.Trim();
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
                            // First check if there are multiple groups
                            var groupParts = groupsString.Split(',');
                            foreach (var part in groupParts)
                            {
                                var partString = part.Trim();
                                var partSplit = partString.Split("VS");
                                if (partSplit[0].Trim() == e.GroupName)
                                {
                                    if (type == SessionType.Lecture || type == SessionType.SeminarExercise)
                                    {
                                        groups.Add(partSplit[0].Trim());
                                        continue;
                                    }
                                    groups.Add(partSplit[1].Trim());
                                }
                            }
                                
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
        return typeString switch
        {
            "PR" => SessionType.Lecture,
            "RV" => SessionType.ComputerExercise,
            "SV" => SessionType.SeminarExercise,
            "LV" => SessionType.LabExercise,
            _ => SessionType.Other
        };
    }

    private async void UpdateLatestCheck(object? sender, ExcelFetcherService.ExcelFetchedEventArgs e)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<DatabaseService>();

            await database.UpdateCourseAsync(e.CourseCode, e.Grade, e.LatestCheck);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync(LogLevel.Error, $"Failed to update latest check for {e.CourseCode}-{e.Grade}", ex);
        }
    }
}
