namespace ApartmentManagement.Shared.Models;

/// <summary>Pagination parameters for list queries.</summary>
public sealed class PaginationParams
{
    private int _page = 1;
    private int _pageSize = 20;

    public static readonly int MaxPageSize = 100;

    /// <summary>1-based page number. Defaults to 1.</summary>
    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    /// <summary>Items per page. Capped at 100. Defaults to 20.</summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value < 1 ? 20 : value > MaxPageSize ? MaxPageSize : value;
    }

    /// <summary>Field name to sort by (optional).</summary>
    public string? SortBy { get; set; }

    /// <summary>Sort in descending order when true.</summary>
    public bool SortDescending { get; set; }

    /// <summary>Zero-based offset for database OFFSET/LIMIT queries.</summary>
    public int Offset => (Page - 1) * PageSize;
}
