using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class AppUser : IdentityUser
{
    public string? DisplayName {get; set;}
    public string? AvatarUrl {get; set;}
    
    // User preferences for timetable
    public string? PreferredGrade {get; set;}
    public string? PreferredProject {get; set;}
    /// <summary>
    /// The student's timetable, as JSON: {"v":2,"selections":[{subjectId, name, code, picks}]}.
    /// The column keeps its old name because it previously held the per-class group filter of
    /// the BV20-only timetable; the version tag is what tells the two apart.
    /// </summary>
    public string? GroupFilters {get; set;}
    
    public List<UserEvent> Events {get; set;} = new();
}