using backend.Infrastructure.Database;
using backend.Models;
using backend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using backend.Misc;

namespace backend.Services;

public class DatabaseService
{
    private readonly AppDbContext _context;
    private readonly Logger _logger;

    public DatabaseService(AppDbContext context, Logger logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> CreateCourseAsync(string code, int grade, DateTimeOffset now)
    {
        // check if already exists
        var existing = await _context.Courses
            .FirstOrDefaultAsync(c => c.Code == code && c.Grade == grade);

        if (existing != null)
        {
            return existing.Id;
        }

        // create new
        var course = new Course
        {
            Code = code,
            Grade = grade,
            LatestCheck = now.ToUniversalTime()
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        return course.Id;
    }

    public async Task<int> UpdateCourseAsync(string code, int grade, DateTimeOffset now)
    {
        var existing = await _context.Courses
            .FirstOrDefaultAsync(c => c.Code == code && c.Grade == grade);

        if (existing == null)
        {
            throw new InvalidOperationException($"Course with code {code} and grade {grade} doesn't exist.");
        }
        
        existing.LatestCheck = now.ToUniversalTime();
        await _context.SaveChangesAsync();

        return existing.Id;
    }
    
    public async Task<int> CreateGroupAsync(string name, int courseId)
    {
        // check if already exists
        var existing = await _context.Groups
            .FirstOrDefaultAsync(c => c.Name == name && c.CourseId == courseId);

        if (existing != null)
        {
            return existing.Id;
        }

        // create new
        var group = new Group
        {
            Name = name,
            CourseId = courseId
        };

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        return group.Id;
    }

    public async Task<int> CreateClassAsync(string name, int courseId)
    {
        var existing = await _context.Classes
            .FirstOrDefaultAsync(c => c.Name == name && c.CourseId == courseId);

        if (existing != null)
        {
            return existing.Id;
        }

        var clas = new Class
        {
            Name = name,
            CourseId = courseId
        };

        _context.Classes.Add(clas);
        await _context.SaveChangesAsync();

        return clas.Id;
    }

    public async Task<int> CreateInstructorAsync(string name)
    {
        var existing = await _context.Instructors
            .FirstOrDefaultAsync(i => i.Name == name);

        if (existing != null)
        {
            return existing.Id;
        }

        var instructor = new Instructor
        {
            Name = name,
        };

        _context.Instructors.Add(instructor);
        await _context.SaveChangesAsync();

        return instructor.Id;
    }

    public async Task<int> CreateRoomAsync(string code)
    {
        var existing = await _context.Rooms
            .FirstOrDefaultAsync(r => r.Code == code && r.Building == code);

        if (existing != null)
        {
            return existing.Id;
        }

        var room = new Room
        {
            Building = code,
            Code = code
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return room.Id;
    }

    public async Task<int> CreateSessionAsync(
        int courseId, int classId, int instructorId, int roomId, int groupId,
        DateTime startAt, DateTime finishAt, SessionType type)
    {
        var existing = await _context.Sessions.FirstOrDefaultAsync(s =>
            s.CourseId == courseId &&
            s.ClassId == classId &&
            s.InstructorId == instructorId &&
            s.RoomId == roomId &&
            s.StartAt == startAt &&
            s.FinishAt == finishAt &&
            s.GroupId == groupId &&
            s.Type == type);

        if (existing != null)
        {
            return existing.Id;
        }

        var session = new Session
        {
            CourseId = courseId,
            ClassId = classId,
            InstructorId = instructorId,
            RoomId = roomId,
            GroupId = groupId,
            StartAt = startAt,
            FinishAt = finishAt,
            Type = type,
        };

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        return session.Id;
    }
    
    public async Task DeleteSessionsByCourseAsync(int courseId)
    {
        var sessions = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .ToListAsync();

        if (sessions.Count == 0)
        {
            await _logger.LogAsync(LogLevel.Information, $"No existing sessions to delete for courseId={courseId}");
            return; // nothing to delete
        }

        await _logger.LogAsync(LogLevel.Information, $"Deleting {sessions.Count} existing sessions for courseId={courseId}");
        _context.Sessions.RemoveRange(sessions);
        await _context.SaveChangesAsync();
    }
    
    public async Task ExecuteInTransactionAsync(Func<Task> action)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await _logger.LogAsync(LogLevel.Information, "DB transaction begin");
            await action();
            await transaction.CommitAsync();
            await _logger.LogAsync(LogLevel.Information, "DB transaction committed");
        }
        catch
        {
            await transaction.RollbackAsync();
            await _logger.LogAsync(LogLevel.Warning, "DB transaction rolled back");
            throw;
        }
    }

    public async Task AddSessions(List<Session> sessions)
    {
        await _logger.LogAsync(LogLevel.Information, $"Adding {sessions?.Count ?? 0} new sessions");
        foreach (var s in sessions)
        {
            _context.Sessions.Add(s);
        }
    }

    public async Task SaveContext()
    {
        await _context.SaveChangesAsync();
    }

}
