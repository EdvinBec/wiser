using backend.DTOs;
using backend.Infrastructure.Database;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormController : ControllerBase
{
    private readonly ExcelFetcherService _excelFetcherService;
    private readonly AppDbContext _dbContext;

    public FormController(ExcelFetcherService excelFetcherService, AppDbContext dbContext)
    {
        _excelFetcherService = excelFetcherService;
        _dbContext = dbContext;
    }

    [HttpGet("options")]
    public async Task<ActionResult<FormOptionsDto>> GetFormOptions()
    {
        try
        {
            var options = await _excelFetcherService.ScrapeFormOptionsAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("course")]
    public async Task<ActionResult<int>> GetCourseId([FromQuery] string code, [FromQuery] string grade, [FromQuery] string project)
    {
        try
        {
            if (!int.TryParse(grade, out int gradeNumber))
            {
                return BadRequest(new { message = $"Invalid grade value: {grade}" });
            }

            var course = await _dbContext.Courses
                .FirstOrDefaultAsync(c => c.Code == code && c.Grade == gradeNumber && c.Project == project);

            if (course == null)
            {
                return NotFound(new { message = $"Course not found for {code}, grade {grade}, project {project}" });
            }

            return Ok(course.Id);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
