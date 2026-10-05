namespace backend.Services.Wise;

/// <summary>One event as Wise publishes it. Times are Ljubljana wall time, no offset.</summary>
public sealed record WiseEvent(
    string EventId,
    DateTime Start,
    DateTime Finish,
    string Subject,
    string ExecutionType,
    string Room,
    IReadOnlyList<string> Lecturers,
    IReadOnlyList<string> Groups)
{
    /// <summary>
    /// Stable identity of the group combination this event is held for. Events of the same
    /// subject and execution type that share this key are the same variant — the same
    /// seminar group, the same lecture stream.
    /// </summary>
    public string GroupKey => Groups.Count == 0 ? "" : string.Join(" + ", Groups.OrderBy(g => g, StringComparer.Ordinal));
}

/// <summary>A study programme, e.g. "RAČUNALNIŠTVO IN INFORMACIJSKE TEHNOLOGIJE VS" / "BV20".</summary>
public sealed record WiseProgramme(int Id, string Name, string? Code);

/// <summary>A study branch: one programme, one year, one specialisation.</summary>
public sealed record WiseBranch(string Key, string Label, string Programme, int Year);

public sealed record WiseSubject(int Id, string Name, string? Code);

public sealed record WiseGroupRef(int Id, string Name);

/// <summary>One option a student can pick for a given execution type.</summary>
public sealed record WiseVariantOption(string Key, string Label, int Occurrences);

/// <summary>
/// All variants of one execution type of a subject. When <see cref="Options"/> holds a single
/// entry the type is common to everyone and needs no choice; more than one and the student picks.
/// </summary>
public sealed record WiseVariantSet(string ExecutionType, IReadOnlyList<WiseVariantOption> Options)
{
    public bool NeedsChoice => Options.Count > 1;
}

public sealed record WiseSubjectShape(
    int SubjectId,
    string Name,
    string? Code,
    IReadOnlyList<WiseVariantSet> Variants);

/// <summary>What the student picked for one subject: the chosen option key per execution type.</summary>
public sealed class WiseSelection
{
    public int SubjectId { get; set; }
    public Dictionary<string, string> Picks { get; set; } = new();
}

public sealed class WiseTimetableRequest
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public List<WiseSelection> Selections { get; set; } = new();
}

public sealed record WiseSessionDto(
    string Id,
    int SubjectId,
    string Subject,
    string? Code,
    string Type,
    string Room,
    IReadOnlyList<string> Lecturers,
    IReadOnlyList<string> Groups,
    string StartAt,
    string FinishAt);
