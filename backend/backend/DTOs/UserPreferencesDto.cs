namespace backend.DTOs;

public class UserPreferencesDto
{
    public string? PreferredGrade { get; set; }
    public string? PreferredProject { get; set; }
}

public class UpdatePreferencesDto
{
    public string? PreferredGrade { get; set; }
    public string? PreferredProject { get; set; }
}
