using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class AppUser : IdentityUser
{
    public string? DisplayName {get; set;}
    public string? AvatarUrl {get; set;}
    
    // User preferences for timetable
    public string? PreferredGrade {get; set;}
    public string? PreferredProject {get; set;}
    public string? GroupFilters {get; set;} // JSON: {"classId": [groupId1, groupId2]}
    
    public List<UserSavedGroup> SavedGroups {get; set;} = new();
    public List<UserEvent> Events {get; set;} = new();
}