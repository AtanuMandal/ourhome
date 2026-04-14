using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Application.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class FeeOverdueHandlerTests
{
    [Fact]
    public async Task Handle_MarksPaymentsOverdue_AfterThreshold()
    {
        var feePaymentRepo = new Mock<IFeePaymentRepository>();
        var societyRepo = new Mock<ISocietyRepository>();
        var eventPublisher = new Mock<IEventPublisher>();
        var logger = new Mock<ILogger<ApartmentManagement.Application.Commands.Fee.ProcessOverdueFeesCommandHandler>>();

        var threshold = 5; // days
        var soc = ApartmentManagement.Domain.Entities.Society.Create("TestSoc", new ApartmentManagement.Domain.ValueObjects.Address("St","City","ST","12345","Country"), "a@b.com", "+911234567890", 1, 1);
        soc.SetOverdueThreshold(threshold);

        societyRepo.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(soc);

        var oldDue = DateTime.UtcNow.AddDays(-(threshold + 2));
        var payment = FeePayment.Create(soc.Id, "apt-1", "sched-1", "Monthly", 100m, oldDue);

        feePaymentRepo.Setup(r => r.GetByStatusAsync(It.IsAny<string>(), PaymentStatus.Pending, It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FeePayment> { payment });

        feePaymentRepo.Setup(r => r.UpdateAsync(It.IsAny<FeePayment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FeePayment p, CancellationToken _) => p);

        var handler = new ApartmentManagement.Application.Commands.Fee.ProcessOverdueFeesCommandHandler(feePaymentRepo.Object, societyRepo.Object, eventPublisher.Object, logger.Object);

        var result = await handler.Handle(new ApartmentManagement.Application.Commands.Fee.ProcessOverdueFeesCommand(soc.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        feePaymentRepo.Verify(r => r.UpdateAsync(It.Is<FeePayment>(p => p.Status == PaymentStatus.Overdue), It.IsAny<CancellationToken>()), Times.Once);
        eventPublisher.Verify(e => e.PublishAsync(It.IsAny<ApartmentManagement.Domain.Events.FeePaymentDueEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
