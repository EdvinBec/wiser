using backend.Infrastructure.Database;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;

    public UserController(UserManager<AppUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /user/me
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

        if (user == null) return NotFound();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            user.AvatarUrl,
        });
    }


    // GET /user/events
    [HttpGet("events")]
    public async Task<IActionResult> GetEvents()
    {
        var events = await _db.UserEvents
            .Where(e => e.UserId == CurrentUserId)
            .ToListAsync();

        return Ok(events);
    }

    // POST /user/events
    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest req)
    {
        var ev = new UserEvent
        {
            UserId = CurrentUserId,
            Title = req.Title,
            Description = req.Description,
            StartAt = req.StartAt,
            FinishAt = req.FinishAt,
            Color = req.Color ?? "#3B82F6"
        };

        _db.UserEvents.Add(ev);
        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // PUT /user/events/{id}
    [HttpPut("events/{id}")]
    public async Task<IActionResult> UpdateEvent(int id, [FromBody] CreateEventRequest req)
    {
        var ev = await _db.UserEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);

        if (ev == null) return NotFound();

        ev.Title = req.Title;
        ev.Description = req.Description;
        ev.StartAt = req.StartAt;
        ev.FinishAt = req.FinishAt;
        ev.Color = req.Color ?? ev.Color;

        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // DELETE /user/events/{id}
    [HttpDelete("events/{id}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var ev = await _db.UserEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);

        if (ev == null) return NotFound();

        _db.UserEvents.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /user/preferences
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        return Ok(new
        {
            user.PreferredGrade,
            user.PreferredProject
        });
    }

    // PUT /user/preferences
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest req)
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        user.PreferredGrade = req.PreferredGrade;
        user.PreferredProject = req.PreferredProject;

        await _db.SaveChangesAsync();
        return Ok(new
        {
            user.PreferredGrade,
            user.PreferredProject
        });
    }

    // GET /user/filters
    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters()
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        return Ok(new
        {
            GroupFilters = user.GroupFilters ?? "{}"
        });
    }

    // PUT /user/filters
    [HttpPut("filters")]
    public async Task<IActionResult> UpdateFilters([FromBody] UpdateFiltersRequest req)
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        user.GroupFilters = req.GroupFilters;

        await _db.SaveChangesAsync();
        return Ok(new
        {
            GroupFilters = user.GroupFilters
        });
    }
}

public record CreateEventRequest(string Title, string? Description, DateTimeOffset StartAt, DateTimeOffset FinishAt, string? Color);
public record UpdatePreferencesRequest(string? PreferredGrade, string? PreferredProject);
public record UpdateFiltersRequest(string? GroupFilters);
