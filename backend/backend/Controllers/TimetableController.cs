using backend.DTOs;
using backend.Helpers;
using backend.Infrastructure.Database;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class TimetableController : ControllerBase
{
    private readonly AppDbContext _database;
    public TimetableController(AppDbContext database) => _database = database;
    
    [HttpGet("{academicYear:int}/{weekNumber:int}/{courseId:int}")]
    public async Task<IActionResult> GetTimetablesForWeek(int academicYear, int weekNumber, int courseId)
    {
        var (startUtc, endUtc) = DateHelpers.GetAcademicWeekWindowUtc(academicYear, weekNumber, weekdaysOnly: true);

        var rows = await _database.Sessions
            .Where(s => s.CourseId == courseId &&
                        s.StartAt >= startUtc &&
                        s.StartAt <  endUtc)
            .Select(s => new
            {
                s.Id,
                s.ClassId,
                ClassName = s.Class.Name,
                s.InstructorId,
                InstructorName = s.Instructor.Name,
                s.RoomId,
                RoomName = s.Room.Code,
                s.Type,
                s.GroupId,
                GroupName = s.Group.Name,
                s.StartAt,
                s.FinishAt
            })
            .ToListAsync();

        var sessions = rows.Select(r => new SessionDto
        {
            Id = r.Id,
            ClassId = r.ClassId,
            ClassName = r.ClassName,
            InstructorId = r.InstructorId,
            InstructorName = r.InstructorName,
            RoomId = r.RoomId,
            RoomName = r.RoomName,
            Type = r.Type,
            GroupId = r.GroupId,
            GroupName = r.GroupName,
            StartAt = r.StartAt,
            FinishAt = r.FinishAt
        }).ToList();

        return Ok(sessions);
    }
    
    [HttpGet("day/{year:int}/{month:int}/{day:int}/{courseId:int}")]
    public async Task<IActionResult> GetTimetablesForDay(int year, int month, int day, int courseId)
    {
        var (startUtc, endUtc) = DateHelpers.GetLocalDayWindowUtc(year, month, day);

        var rows = await _database.Sessions
            .Where(s => s.CourseId == courseId &&
                        s.StartAt >= startUtc &&
                        s.StartAt <  endUtc)
            .Select(s => new
            {
                s.Id,
                s.ClassId,
                ClassName = s.Class.Name,
                s.InstructorId,
                InstructorName = s.Instructor.Name,
                s.RoomId,
                RoomName = s.Room.Code,
                s.Type,
                s.GroupId,
                GroupName = s.Group.Name,
                s.StartAt,
                s.FinishAt
            })
            .ToListAsync();

        var sessions = rows.Select(r => new SessionDto
        {
            Id = r.Id,
            ClassId = r.ClassId,
            ClassName = r.ClassName,
            InstructorId = r.InstructorId,
            InstructorName = r.InstructorName,
            RoomId = r.RoomId,
            RoomName = r.RoomName,
            Type = r.Type,
            GroupId = r.GroupId,
            GroupName = r.GroupName,
            StartAt  = r.StartAt.ToLocalTime(),
            FinishAt = r.FinishAt.ToLocalTime()
        }).ToList();

        return Ok(sessions);
    }
    
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        var groups = await _database.Groups
            .ToListAsync();

        return Ok(groups);
    }
    
    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses()
    {
        var classes = await _database.Classes
            .ToListAsync();

        return Ok(classes);
    }
    
    [HttpGet("instructors")]
    public async Task<IActionResult> GetInstructors()
    {
        var instructors = await _database.Instructors
            .ToListAsync();

        return Ok(instructors);
    }
    
    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _database.Rooms
            .ToListAsync();

        return Ok(rooms);
    }
    
    [HttpGet("latestCheck/{courseId:int}")]
    public async Task<IActionResult> GetLatestCheckForCourse(int courseId)
    {
        var course = await _database.Courses.FirstOrDefaultAsync(c => c.Id == courseId);

        return Ok(new
        {
            CourseId = course.Id,
            LatestCheck = course.LatestCheck.ToLocalTime()
        });
    }
}