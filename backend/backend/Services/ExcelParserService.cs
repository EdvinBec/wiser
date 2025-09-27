using System.Data;
using System.Globalization;
using System.Text.RegularExpressions;
using backend.Configs;
using backend.Helpers;
using backend.Infrastructure.Database;
using backend.Models;
using backend.Models.Enums;
using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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
    }

    private async void OnExcelFileUpdated(object? sender, ExcelFetcherService.ExcelDownloadedEventArgs e)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<DatabaseService>();
            ISheet sheet;
            string path = e.Path;

            // Save the course to the database
            var courseId = await database.CreateCourseAsync(e.CourseCode, e.Grade);
            _log.LogInformation("Parsing Excel for {Course}-{Grade}. Course id: {CourseId}. Path: {Path}", e.CourseCode, e.Grade, courseId, path);

            var newSessions = new List<Session>();
            int totalRowsSeen = 0;
            int headerMarkersSeen = 0;
            int sessionRowsConsidered = 0;
            int sessionsParsed = 0;
            int rowsSkippedUnknownDay = 0;
            int rowsSkippedNoClass = 0;
            int rowErrors = 0;

            using (var fStream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                fStream.Position = 0;
                HSSFWorkbook workbook = new HSSFWorkbook(fStream);
                sheet = workbook.GetSheetAt(0);

                var emptyCols =
                    ExcelCleanupHelper.FindCompletelyEmptyColumns(sheet,
                        fromRowInclusive: ExcelParserConfig.headerRowNumber);
                if (emptyCols.Count > 0)
                {
                    ExcelCleanupHelper.DeleteColumns(sheet, emptyCols);
                }

                IRow header = sheet.GetRow(ExcelParserConfig.headerRowNumber);
                int cellsCount = ExcelParserConfig.cellsCount;
                _log.LogInformation("Sheet stats: firstRow={FirstRow}, lastRow={LastRow}, headerRow={HeaderRow}", sheet.FirstRowNum, sheet.LastRowNum, ExcelParserConfig.headerRowNumber);

                var globalGroup = "";

                for (int j = ExcelParserConfig.headerRowNumber; j <= sheet.LastRowNum; j++)
                {
                    var row = sheet.GetRow(j);
                    
                    var type = (row.GetCell(4)?.ToString() ?? string.Empty).Split(' ')[0].Trim();
                    SessionType sessionType;
                    if (type == "PR")
                    {
                        globalGroup = row.GetCell(5)?.ToString().Trim();
                        break;
                    }
                }

                var className = "";
                int? classId = null;

                for (int j = ExcelParserConfig.headerRowNumber; j <= sheet.LastRowNum; j++)
                {
                    var row = sheet.GetRow(j);
                    totalRowsSeen++;
                    if (row == null)
                    {
                        continue;
                    }
                    var dayCell = row.GetCell(0);
                    var dayCellStr = dayCell?.ToString();

                    // This will firstly save the class name
                    if (dayCellStr == "Dan")
                    {
                        var previousRow = sheet.GetRow(j - 1);
                        className = previousRow?.GetCell(0)?.ToString()?.Trim() ?? string.Empty;
                        headerMarkersSeen++;
                        _log.LogInformation("[{Row}] Found class header. ClassName='{ClassName}'", j, className);

                        classId = await database.CreateClassAsync(className);
                        _log.LogInformation("Class ensured. Name='{ClassName}', Id={ClassId}", className, classId);
                        continue;
                    }

                    if (ExcelParserConfig.daysInWeek.Contains(dayCellStr) && !String.IsNullOrEmpty(className))
                    {
                        sessionRowsConsidered++;
                        var day = dayCellStr;

                        // Get start and finish time
                        try
                        {
                            var date = row.GetCell(1)?.ToString()?.TrimStart().Trim();
                            var timesStr = row.GetCell(2)?.ToString();
                            var times = timesStr?.Split('-') ?? Array.Empty<string>();
                            if (times.Length < 2)
                                throw new FormatException($"Invalid time range: '{timesStr}'");
                            var startAt = DateHelpers.ParseLocalToUtc(date, times[0], ExcelParserConfig.dateFormat);
                            var finishAt = DateHelpers.ParseLocalToUtc(date, times[1], ExcelParserConfig.dateFormat);

                        // Room
                            var room = row.GetCell(3)?.ToString()?.Trim() ?? string.Empty;
                            var roomId = await database.CreateRoomAsync(room);

                        // Session type
                            var type = (row.GetCell(4)?.ToString() ?? string.Empty).Split(' ')[0].Trim();
                            SessionType sessionType;
                            if (type == "PR")
                            {
                                sessionType = SessionType.Lecture;
                            }
                            else if (type == "RV")
                            {
                                sessionType = SessionType.ComputerExercise;
                            }
                            else if (type == "LV")
                            {
                                sessionType = SessionType.LabExercise;
                            }
                            else if (type == "SV")
                            {
                                sessionType = SessionType.SeminarExercise;
                            }
                            else
                            {
                                sessionType = SessionType.Other;
                            }

                        // Extract group from string
                            var groups = row.GetCell(5)?.ToString() ?? string.Empty;
                            var input = ExcelParserConfig.NormalizeSpaces(groups);
                            var prefix = globalGroup;
                            
                            var parts = Regex.Split(input ?? string.Empty, @"\s*VS\s*", RegexOptions.IgnoreCase)
                                .Select(p => p.Trim())
                                .Where(p => p.Length > 0)
                                .ToArray();

                            bool isExercise = sessionType is SessionType.ComputerExercise
                                or SessionType.LabExercise
                                or SessionType.SeminarExercise;

                            // For exercises: if there are multiple parts, skip the first (e.g., skip "RIT 2")
                            var partsToParse = (isExercise && parts.Length > 1) ? parts.Skip(1).ToArray() : parts;

                            List<int> groupIds = new();

                            foreach (var group in GroupParsing.FlattenGroups(partsToParse))
                            {
                                if (string.IsNullOrWhiteSpace(group)) continue;
                                var groupId = await database.CreateGroupAsync(group.Trim());
                                groupIds.Add(groupId);
                            }

                        // Instructor
                            var instructor = row.GetCell(6)?.ToString() ?? string.Empty;
                            var instructorId = await database.CreateInstructorAsync(instructor);

                            if (courseId != null && classId != null)
                            {
                                foreach (var groupId in groupIds)
                                {
                                    newSessions.Add(new Session
                                    {
                                        CourseId = courseId,
                                        ClassId = classId.Value,
                                        InstructorId = instructorId,
                                        RoomId = roomId,
                                        StartAt = startAt,
                                        FinishAt = finishAt,
                                        Type = sessionType,
                                        GroupId = groupId
                                    });
                                    sessionsParsed++;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            rowErrors++;
                            _log.LogWarning(ex, "[{Row}] Failed to parse session row. Day='{Day}', Class='{ClassName}'", j, day, className);
                        }
                    }
                    else
                    {
                        if (string.IsNullOrEmpty(className)) rowsSkippedNoClass++;
                        else rowsSkippedUnknownDay++;
                    }
                }
            }

            await database.ExecuteInTransactionAsync(async () =>
            {
                await database.DeleteSessionsByCourseAsync(courseId);
                await database.AddSessions(newSessions);

                await database.SaveContext();
            });

            _log.LogInformation(
                "Parse summary for {Course}-{Grade}: totalRows={Total}, headers={Headers}, considered={Considered}, parsedSessions={Parsed}, skippedNoClass={NoClass}, skippedUnknownDay={UnknownDay}, rowErrors={RowErrors}",
                e.CourseCode, e.Grade, totalRowsSeen, headerMarkersSeen, sessionRowsConsidered, sessionsParsed, rowsSkippedNoClass, rowsSkippedUnknownDay, rowErrors);
        }
        catch (Exception exception)
        {
            _log.LogError(exception, "Parser failed for {Course}-{Grade}", e.CourseCode, e.Grade);
            throw;
        }
    }
}
