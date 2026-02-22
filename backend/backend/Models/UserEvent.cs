namespace backend.Models;

public class UserEvent
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset FinishAt { get; set; }
    public string Color { get; set; } = "#3B82F6";
}
