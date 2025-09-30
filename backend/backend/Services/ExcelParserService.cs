using backend.Configs;
using backend.Helpers;
using backend.Models;
using backend.Models.Enums;
using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;

namespace backend.Services;

public class ExcelParserService
{
    private readonly ExcelFetcherService _fetcher;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExcelParserService> _log;
    
    public ExcelParserService(ExcelFetcherService fetcher, IServiceScopeFactory scopeFactory, ILogger<ExcelParserService> log)
    {
        _fetcher = fetcher;
        _scopeFactory = scopeFactory;
        _log = log;
        _fetcher.ExcelFileUpdated += OnExcelFileUpdated;
        _fetcher.ExcelFetched += UpdateLatestCheck;
    }

    private async void OnExcelFileUpdated(object? sender, ExcelFetcherService.ExcelDownloadedEventArgs e)
    {
        List<Session> sessions = new List<Session>();
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

            // Save the course to the database
            var courseId = await database.CreateCourseAsync(e.CourseCode, e.Grade, DateTimeOffset.Now);
            _log.LogInformation("{CurrentTime} - Parsing Excel for {Course}-{Grade}. CourseId={CourseId}. Path={Path}", DateTime.Now, e.CourseCode, e.Grade, courseId, path);

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
                    
                    var dayCell = row.GetCell(0);
                    
                    // Find and save the class name
                    if (dayCell.ToString() == "Dan")
                    {
                        var classNameRow = sheet.GetRow(j - 1);
                        var className = classNameRow.GetCell(0)?.ToString()?.Trim();
                        if (className == null)
                        {
                            throw new ArgumentNullException("Class name cell is missing");
                        }
                        classId = await database.CreateClassAsync(className, courseId);
                        
                        _log.LogInformation("{CurrentTime} - Class saved to database. Name={ClassName}, Id={ClassId}", DateTime.Now, className, classId);
                        headerMarkersSeen++;
                        continue;
                    }

                    if (ExcelParserConfig.daysInWeek.Contains(dayCell.ToString()!) && classId != null)
                    {
                        sessionRowsConsidered++;

                        try
                        {
                            // Raw cell data
                            dayCell = row.GetCell(0);
                            var dateCell = row.GetCell(1);
                            var timeCell = row.GetCell(2);
                            var roomCell = row.GetCell(3);
                            var typeCell = row.GetCell(4);
                            var groupCell = row.GetCell(5);
                            var instructorCell = row.GetCell(6);
                            
                            // Parsed data
                            var day = dayCell.ToString()?.Trim();
                            
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

                            SessionType type;
                            var typeString = typeCell.ToString()?.Trim();
                            if (typeString == null)
                            {
                                throw new ArgumentNullException("Type cell is missing");
                            }
                            switch (typeString)
                            {
                                case "PR":
                                    type = SessionType.Lecture;
                                    break;
                                case "RV":
                                    type = SessionType.ComputerExercise;
                                    break;
                                case "SV":
                                    type = SessionType.SeminarExercise;
                                    break;
                                case "LV":
                                    type = SessionType.LabExercise;
                                    break;
                                default:
                                    type = SessionType.Other;
                                    break;
                            }

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
                                    if (type == SessionType.Lecture)
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
                            _log.LogWarning(ex, "{CurrentTime} - Failed to parse session row {RowIndex}", DateTime.Now, j);
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

            _log.LogInformation(
                "{CurrentTime} - Parse summary for {Course}-{Grade}: totalRows={Total}, headers={Headers}, considered={Considered}, parsedSessions={Parsed}, skippedNoClass={NoClass}, skippedUnknownDay={UnknownDay}, rowErrors={RowErrors}",
                DateTime.Now, e.CourseCode, e.Grade, totalRowsSeen, headerMarkersSeen, sessionRowsConsidered, sessionsParsed, rowsSkippedNoClass, rowsSkippedUnknownDay, rowErrors);
        }
        catch (Exception exception)
        {
            _log.LogError(exception, "{CurrentTime} - Parser failed for {Course}-{Grade}", DateTime.Now, e.CourseCode, e.Grade);
            throw;
        }
    }

    private async void UpdateLatestCheck(object? sender, ExcelFetcherService.ExcelFetchedEventArgs e)
    {
        using var scope = _scopeFactory.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<DatabaseService>();

        await database.UpdateCourseAsync(e.CourseCode, e.Grade, e.LatestCheck);
    }
}
