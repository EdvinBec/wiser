using backend.Infrastructure.Database;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DebugController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public DebugController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("courses")]
    public async Task<IActionResult> GetAllCourses()
    {
        var courses = await _dbContext.Courses
            .Select(c => new { c.Id, c.Code, c.Grade, c.Project, c.LatestCheck })
            .ToListAsync();
        return Ok(courses);
    }

    [HttpGet("courses/ensure/{code}/{grade}/{project}")]
    public async Task<IActionResult> EnsureCourse(string code, string grade, string project)
    {
        if (!int.TryParse(grade, out int gradeNumber))
        {
            return BadRequest(new { message = $"Invalid grade value: {grade}" });
        }

        var course = await _dbContext.Courses
            .FirstOrDefaultAsync(c => c.Code == code && c.Grade == gradeNumber && c.Project == project);

        if (course != null)
        {
            return Ok(new { exists = true, courseId = course.Id });
        }

        // Create the course if it doesn't exist
        var newCourse = new backend.Models.Course
        {
            Code = code,
            Grade = gradeNumber,
            Project = project,
            LatestCheck = DateTimeOffset.UtcNow
        };

        _dbContext.Courses.Add(newCourse);
        await _dbContext.SaveChangesAsync();

        return Ok(new { exists = false, created = true, courseId = newCourse.Id });
    }
}
