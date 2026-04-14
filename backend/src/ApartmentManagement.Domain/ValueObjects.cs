namespace ApartmentManagement.Domain.ValueObjects;

/// <summary>Immutable address value object.</summary>
public sealed record Address(string Street, string City, string State, string PostalCode, string Country)
{
    public void Validate()
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(Street, nameof(Street));
        ArgumentException.ThrowIfNullOrWhiteSpace(City, nameof(City));
        ArgumentException.ThrowIfNullOrWhiteSpace(State, nameof(State));
        ArgumentException.ThrowIfNullOrWhiteSpace(PostalCode, nameof(PostalCode));
        ArgumentException.ThrowIfNullOrWhiteSpace(Country, nameof(Country));
    }

    public override string ToString() => $"{Street}, {City}, {State} {PostalCode}, {Country}";
}


/// <summary>Contact information value object.</summary>
public sealed record ContactInfo(string Name, string Email, string Phone)
{
    public void Validate()
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(Name, nameof(Name));
        ArgumentException.ThrowIfNullOrWhiteSpace(Email, nameof(Email));
        ArgumentException.ThrowIfNullOrWhiteSpace(Phone, nameof(Phone));
        if (!Email.Contains('@'))
            throw new ArgumentException("Email address is invalid.", nameof(Email));
    }
}
