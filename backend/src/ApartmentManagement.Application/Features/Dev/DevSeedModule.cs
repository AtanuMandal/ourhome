using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

// "Apartment" and "User" also name sibling Commands.* namespaces (Commands.Apartment,
// Commands.User), which shadow the bare entity names from within any other Commands.*
// namespace — alias them so DomainApartment.Create(...) / DomainUser.Create(...) resolve
// unambiguously (same reason the Staff module needed a DomainStaff alias).
using DomainApartment = ApartmentManagement.Domain.Entities.Apartment;
using DomainUser = ApartmentManagement.Domain.Entities.User;

namespace ApartmentManagement.Application.Commands.Dev;

/// <summary>
/// Dev-only test-data generator. Creates N apartments, each with an owner and a tenant, and
/// three maintenance charges per apartment — one Pending (due soon), one Overdue (unpaid, due
/// well in the past), and one Paid with a submitted payment proof. Gated behind
/// <c>InfrastructureSettings.AllowTestDataSeeding</c> at the Functions layer.
/// </summary>
public record SeedTestDataCommand(string SocietyId, int ApartmentCount) : IRequest<Result<SeedTestDataResponse>>;

public sealed class SeedTestDataCommandHandler(
    ISocietyRepository societyRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    IMaintenanceChargeRepository chargeRepository,
    IMaintenanceChargeGridViewRepository gridViewRepository,
    ILogger<SeedTestDataCommandHandler> logger)
    : IRequestHandler<SeedTestDataCommand, Result<SeedTestDataResponse>>
{
    private const decimal ChargeAmount = 2500m;
    private const string ScheduleId = "seed-monthly-maintenance";
    private const string ScheduleName = "Monthly Maintenance (Seeded)";

    public async Task<Result<SeedTestDataResponse>> Handle(SeedTestDataCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var overdueDueDate = DateTime.UtcNow.Date.AddDays(-(society.MaintenanceOverdueThresholdDays + 30));
            var runSuffix = DateTime.UtcNow.ToString("MMddHHmmss");

            var seeded = new List<SeededApartmentInfo>();
            var errors = new List<string>();

            for (var i = 1; i <= request.ApartmentCount; i++)
            {
                try
                {
                    seeded.Add(await SeedOneApartmentAsync(request.SocietyId, runSuffix, i, overdueDueDate, ct));
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to seed test apartment {Index} for society {SocietyId}", i, request.SocietyId);
                    errors.Add($"Apartment {i}: {ex.Message}");
                }
            }

            return Result<SeedTestDataResponse>.Success(
                new SeedTestDataResponse(seeded.Count, errors.Count, seeded, errors));
        }
        catch (NotFoundException ex)
        {
            return Result<SeedTestDataResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed test data for society {SocietyId}", request.SocietyId);
            return Result<SeedTestDataResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private async Task<SeededApartmentInfo> SeedOneApartmentAsync(
        string societyId, string runSuffix, int index, DateTime overdueDueDate, CancellationToken ct)
    {
        var tag = $"{runSuffix}-{index}";

        var apartment = DomainApartment.Create(societyId, $"SEED-{tag}", "SEED", index, 2, [], 800, 900, 1000);
        apartment = await apartmentRepository.CreateAsync(apartment, ct);

        var owner = DomainUser.Create(
            societyId, $"Seed Owner {tag}", $"seed.owner.{tag}@test.local", $"9000{tag.Replace("-", "")}"[..10],
            UserRole.SUUser, ResidentType.Owner);
        owner.Verify();
        owner = await userRepository.CreateAsync(owner, ct);

        var tenant = DomainUser.Create(
            societyId, $"Seed Tenant {tag}", $"seed.tenant.{tag}@test.local", $"9111{tag.Replace("-", "")}"[..10],
            UserRole.SUUser, ResidentType.Tenant);
        tenant.Verify();
        tenant = await userRepository.CreateAsync(tenant, ct);

        apartment.AssignOwner(owner.Id, owner.FullName);
        apartment.AssignTenant(tenant.Id, tenant.FullName);
        apartment = await apartmentRepository.UpdateAsync(apartment, ct);

        var apartmentLabel = apartment.ToDisplayLabel();

        owner.LinkApartment(apartment.Id, apartmentLabel, ResidentType.Owner, makePrimary: true);
        await userRepository.UpdateAsync(owner, ct);

        tenant.LinkApartment(apartment.Id, apartmentLabel, ResidentType.Tenant, makePrimary: true);
        await userRepository.UpdateAsync(tenant, ct);

        var chargeIds = new List<string>(3)
        {
            await CreatePendingChargeAsync(societyId, apartment.Id, ct),
            await CreateOverdueChargeAsync(societyId, apartment.Id, overdueDueDate, ct),
            await CreatePaidChargeAsync(societyId, apartment.Id, owner.Id, ct),
        };

        return new SeededApartmentInfo(apartment.Id, apartmentLabel, owner.Id, owner.Email, tenant.Id, tenant.Email, chargeIds);
    }

    private async Task<string> CreatePendingChargeAsync(string societyId, string apartmentId, CancellationToken ct)
    {
        var charge = MaintenanceCharge.Create(
            societyId, apartmentId, ScheduleId, ScheduleName, ChargeAmount,
            DateTime.UtcNow.Date.AddDays(10), "Seeded test data — pending");
        var created = await chargeRepository.CreateAsync(charge, ct);
        await MaintenanceGridProjectionHelper.RebuildForChargeAsync(created, chargeRepository, apartmentRepository, gridViewRepository, ct);
        return created.Id;
    }

    private async Task<string> CreateOverdueChargeAsync(string societyId, string apartmentId, DateTime overdueDueDate, CancellationToken ct)
    {
        var charge = MaintenanceCharge.Create(
            societyId, apartmentId, ScheduleId, ScheduleName, ChargeAmount,
            overdueDueDate, "Seeded test data — overdue");
        var created = await chargeRepository.CreateAsync(charge, ct);
        await MaintenanceGridProjectionHelper.RebuildForChargeAsync(created, chargeRepository, apartmentRepository, gridViewRepository, ct);
        return created.Id;
    }

    private async Task<string> CreatePaidChargeAsync(string societyId, string apartmentId, string payerUserId, CancellationToken ct)
    {
        var charge = MaintenanceCharge.Create(
            societyId, apartmentId, ScheduleId, ScheduleName, ChargeAmount,
            DateTime.UtcNow.Date.AddMonths(-1), "Seeded test data — paid");
        charge.SubmitProof($"files/maintenance-proofs/seed-{apartmentId}-proof.jpg", "Seeded test payment proof", payerUserId);
        charge.MarkPaid("UPI", $"SEED-{Guid.NewGuid():N}"[..16], $"files/maintenance-proofs/seed-{apartmentId}-receipt.pdf", "Seeded test data — paid");

        var created = await chargeRepository.CreateAsync(charge, ct);
        await MaintenanceGridProjectionHelper.RebuildForChargeAsync(created, chargeRepository, apartmentRepository, gridViewRepository, ct);
        return created.Id;
    }
}
