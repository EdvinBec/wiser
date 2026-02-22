namespace backend.Models;

public class UserSavedGroup
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public int GroupId { get; set; }
    public Group Group { get; set; } = null!;
}