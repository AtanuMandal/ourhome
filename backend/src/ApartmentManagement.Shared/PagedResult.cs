namespace ApartmentManagement.Shared.Models;

/// <summary>A paginated result set.</summary>
public sealed class PagedResult<T>
{
    /// <summary>Items in the current page.</summary>
    public IReadOnlyList<T> Items { get; }

    /// <summary>Total number of matching records across all pages.</summary>
    public int TotalCount { get; }

    /// <summary>1-based current page number.</summary>
    public int Page { get; }

    /// <summary>Maximum items per page.</summary>
    public int PageSize { get; }

    /// <summary>Total number of pages.</summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;

    /// <summary>Whether a next page exists.</summary>
    public bool HasNextPage => Page < TotalPages;

    /// <summary>Whether a previous page exists.</summary>
    public bool HasPreviousPage => Page > 1;

    public PagedResult(IReadOnlyList<T> items, int totalCount, int page, int pageSize)
    {
        Items = items ?? throw new ArgumentNullException(nameof(items));
        TotalCount = totalCount;
        Page = page;
        PageSize = pageSize;
    }

    /// <summary>Returns an empty first-page result.</summary>
    public static PagedResult<T> Empty(int pageSize = 20) =>
        new(Array.Empty<T>(), 0, 1, pageSize);
}
