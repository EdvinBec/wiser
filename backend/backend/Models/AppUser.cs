using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class AppUser : IdentityUser
{
    public string? DisplayName {get; set;}
    public string? AvatarUrl {get; set;}
    public List<UserSavedGroup> SavedGroups {get; set;} = new();
    public List<UserEvent> Events {get; set;} = new();
}