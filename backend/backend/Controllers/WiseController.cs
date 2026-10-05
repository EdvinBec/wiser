using backend.Services.Wise;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Proxy and cache in front of the published Wise Timetable web layer.
///
/// The frontend cannot reach Wise itself — wise-tt.com sends no CORS headers on /web/ — so every
/// catalogue lookup and every event goes through here. Each endpoint is at most one upstream
/// request, cached, so the picker cascade stays responsive.
/// </summary>
[ApiController]
[Route("api/wise")]
public class WiseController : ControllerBase
{
    private readonly WiseClient _wise;

    public WiseController(WiseClient wise) => _wise = wise;

    /// <summary>Study programmes — the first step of the picker.</summary>
    [HttpGet("programmes")]
    public async Task<IActionResult> GetProgrammes(CancellationToken ct)
        => Ok(await _wise.GetProgrammesAsync(ct));

    /// <summary>Years of study a programme runs. Not visible until a programme is chosen.</summary>
    [HttpGet("programmes/{prog:int}/years")]
    public async Task<IActionResult> GetYears(int prog, CancellationToken ct)
        => Ok(await _wise.GetYearsAsync(prog, ct));

    /// <summary>
    /// Branches of one programme year. Some programmes have exactly one, in which case the
    /// frontend should skip the step rather than show a list of one.
    /// </summary>
    [HttpGet("programmes/{prog:int}/years/{year:int}/branches")]
    public async Task<IActionResult> GetBranches(int prog, int year, CancellationToken ct)
        => Ok(await _wise.GetBranchesAsync(prog, year, ct));

    /// <summary>Subjects taught to one branch. Omit <c>br</c> for the union across branches.</summary>
    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects(
        [FromQuery] int prog,
        [FromQuery] int year,
        [FromQuery] int? br,
        CancellationToken ct)
    {
        if (prog <= 0 || year <= 0)
            return BadRequest(new {message = "prog and year are required"});

        return Ok(await _wise.GetSubjectsAsync(prog, year, br, ct));
    }

    /// <summary>
    /// What this subject asks the student to choose. Execution types with a single group
    /// combination are shown for information and need no answer; types with several are the
    /// ones that need a pick — RV groups, usually.
    /// </summary>
    [HttpGet("subjects/{subjectId:int}/shape")]
    public async Task<IActionResult> GetSubjectShape(int subjectId, CancellationToken ct)
        => Ok(await _wise.GetSubjectShapeAsync(subjectId, ct));

    /// <summary>The student's own timetable: their selections, each narrowed to the chosen variant.</summary>
    [HttpPost("timetable")]
    public async Task<IActionResult> GetTimetable([FromBody] WiseTimetableRequest request, CancellationToken ct)
    {
        if (request.Selections.Count == 0) return Ok(Array.Empty<WiseSessionDto>());

        if (request.To < request.From)
            return BadRequest(new {message = "'to' falls before 'from'"});

        if (request.To.DayNumber - request.From.DayNumber > 400)
            return BadRequest(new {message = "Range is longer than 400 days"});

        return Ok(await _wise.GetTimetableAsync(request, ct));
    }

    /// <summary>When the school last published. Use it to decide whether a refresh is worth it.</summary>
    [HttpGet("published")]
    public async Task<IActionResult> GetPublished(CancellationToken ct)
        => Ok(new {publishedAt = await _wise.GetPublishedAtAsync(ct)});
}
