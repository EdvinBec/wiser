namespace backend.DTOs;

public class DropdownOptionDto
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Selector { get; set; } = string.Empty;
}

public class FormOptionsDto
{
    public List<DropdownOptionDto> CourseOptions { get; set; } = new();
    public List<DropdownOptionDto> GradeOptions { get; set; } = new();
    public List<DropdownOptionDto> ProjectOptions { get; set; } = new();
    public Dictionary<string, List<DropdownOptionDto>> ProjectsByGrade { get; set; } = new();
}
