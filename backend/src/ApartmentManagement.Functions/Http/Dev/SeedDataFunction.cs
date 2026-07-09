using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;

namespace ApartmentManagement.Functions.Http.Dev;

/// <summary>
/// One-shot dev/QA endpoint: POST /api/seed
/// Creates Green Valley Residency with 200 apartments, residents,
/// maintenance schedule (₹2.36/sqft), vendors, notices, complaints,
/// amenities, and sample visitors.
/// Guard: requires header  x-seed-key matching config "SeedKey" (default "dev-seed-2024").
/// </summary>
public class SeedDataFunction(
    ISocietyRepository            societyRepo,
    IApartmentRepository          apartmentRepo,
    IUserRepository               userRepo,
    IMaintenanceScheduleRepository scheduleRepo,
    IMaintenanceChargeRepository  chargeRepo,
    IVendorRepository             vendorRepo,
    IVendorRecurringScheduleRepository recurringRepo,
    IVendorChargeRepository       vendorChargeRepo,
    INoticeRepository             noticeRepo,
    IComplaintRepository          complaintRepo,
    IAmenityRepository            amenityRepo,
    IAmenityBookingRepository     amenityBookingRepo,
    IVisitorLogRepository         visitorRepo,
    IShiftRepository              shiftRepo,
    IStaffRepository              staffRepo,
    IStaffAttendanceRepository    staffAttendanceRepo,
    ISosAlertRepository           sosAlertRepo,
    ICompetitionRepository        competitionRepo,
    ICompetitionEntryRepository   competitionEntryRepo,
    IRewardPointsRepository       rewardPointsRepo,
    IServiceProviderRepository    serviceProviderRepo,
    IServiceProviderRequestRepository serviceRequestRepo,
    IPollRepository               pollRepo,
    IPollVoteRepository           pollVoteRepo,
    IAgmSessionRepository         agmSessionRepo,
    IAuthService                  authService,
    IConfiguration                config)
{
    // ── layout constants ─────────────────────────────────────────────────────────
    private static readonly string[] Blocks  = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    private const int FloorsPerBlock   = 4;
    private const int UnitsPerFloor    = 5;

    // ── area bands per floor (sqft), rate ────────────────────────────────────────
    private static readonly (double Min, double Max)[] AreaByFloor =
    [
        (70,  300),   // floor 1  – studios / small 1BHK
        (300, 700),   // floor 2  – 1-2 BHK
        (700, 1100),  // floor 3  – 2-3 BHK
        (1100,1500),  // floor 4  – 3-4 BHK
    ];
    private const decimal MaintenanceRate = 2.36m;

    // ── seed names ───────────────────────────────────────────────────────────────
    private static readonly string[] FirstNames =
    [
        "Aarav","Aditya","Akash","Amitabh","Ananya","Anjali","Arjun","Arnav","Aryan",
        "Deepa","Deepak","Divya","Gaurav","Geeta","Himanshu","Ishaan","Jaya","Kabir",
        "Kiran","Kavya","Lakshmi","Manish","Meera","Mihir","Nandita","Nikhil","Nisha",
        "Pooja","Priya","Rahul","Rajesh","Ravi","Rekha","Rohit","Sanjay","Sarita",
        "Shilpa","Shivam","Sneha","Suresh","Swati","Tanvi","Uday","Vaibhav","Vandana",
        "Vikram","Vinita","Vivek","Yash","Zara",
    ];
    private static readonly string[] LastNames =
    [
        "Agarwal","Bhatia","Chandra","Desai","Ghosh","Gupta","Iyer","Jain","Joshi",
        "Kapoor","Khanna","Kumar","Malhotra","Mehta","Mishra","Nair","Patel","Pillai",
        "Rao","Reddy","Saxena","Shah","Sharma","Singh","Sinha","Srivastava","Tiwari",
        "Varma","Verma","Yadav",
    ];

    [Function("SeedData")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "seed")] HttpRequest req,
        CancellationToken ct)
    {
        // Guard
        var expectedKey = config["SeedKey"] ?? "dev-seed-2024";
        if (!req.Headers.TryGetValue("x-seed-key", out var key) || key != expectedKey)
            return new UnauthorizedResult();

        var log = new List<string>();
        var rng = new Random(Environment.TickCount); // fixed seed for reproducibility

        // ── 1. Society ────────────────────────────────────────────────────────────
        var society = Society.Create(
            $"Green Valley Residency {rng.Next(0,1000)}",
            new Address("12 Garden Road", "Bengaluru", "Karnataka", "560001", "India"),
            "admin@greenvalley.in", "9845000001",
            Blocks.Length, Blocks.Length * FloorsPerBlock * UnitsPerFloor);
        society.Activate();
        await societyRepo.CreateAsync(society, ct);
        log.Add($"Society: {society.Id}");

        // ── 2. SUAdmin ────────────────────────────────────────────────────────────
        var admin = User.Create(society.Id, "Ramesh Gupta", $"admin@{society.Name.Replace(" ", "")}.in",
            "9845000001", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        admin.SetPasswordHash(authService.HashPassword("Admin@123"));
        admin.Verify();
        await userRepo.CreateAsync(admin, ct);
        society.AssignAdmin(admin.Id);
        await societyRepo.UpdateAsync(society, ct);
        log.Add($"Admin: {admin.Id}");

        // ── 3. SUSecurity ─────────────────────────────────────────────────────────
        var security = User.Create(society.Id, "Mohan Lal", $"security@{society.Name.Replace(" ", "")}.in",
            "9845000002", UserRole.SUSecurity, ResidentType.SocietyAdmin);
        security.SetPasswordHash(authService.HashPassword("Security@123"));
        security.Verify();
        await userRepo.CreateAsync(security, ct);
        log.Add($"Security: {security.Id}");

        // ── 4. Apartments + Residents ─────────────────────────────────────────────
        var apartments   = new List<Apartment>(400);
        var allResidents = new List<User>(800);
        int aptIndex     = 0;

        foreach (var block in Blocks)
        {
            for (int floor = 1; floor <= FloorsPerBlock; floor++)
            {
                var (areaMin, areaMax) = AreaByFloor[floor - 1];

                for (int unit = 1; unit <= UnitsPerFloor; unit++)
                {
                    // Area: spread linearly across the band for each unit, plus a small jitter
                    double rawArea = areaMin + (areaMax - areaMin) * ((unit - 1) / (double)(UnitsPerFloor - 1));
                    double jitter  = (rng.NextDouble() - 0.5) * (areaMax - areaMin) * 0.08;
                    double area    = Math.Clamp(rawArea + jitter, areaMin, areaMax);
                    area = Math.Round(area, 1);

                    double buildUp  = Math.Round(area * 1.15, 1);
                    double superBuild = Math.Round(area * 1.25, 1);
                    int    rooms    = area < 300 ? 1 : area < 700 ? 2 : area < 1100 ? 3 : 4;
                    string aptNo    = $"{floor}0{unit}";

                    var apt = Apartment.Create(society.Id, aptNo, block, floor, rooms, null,
                        area, buildUp, superBuild);
                    await apartmentRepo.CreateAsync(apt, ct);
                    apartments.Add(apt);

                    // Resident pattern by round-robin
                    int pattern = aptIndex % 3; // 0=1owner, 1=2owners, 2=1owner+1tenant
                    aptIndex++;

                    var owner1 = CreateResident(society.Id, apt.Id, aptIndex, 0, rng,
                        UserRole.SUUser, ResidentType.Owner, society);
                    owner1.SetPasswordHash(authService.HashPassword("Resident@123"));
                    owner1.Verify();
                    owner1.AssignApartment(apt.Id);
                    await userRepo.CreateAsync(owner1, ct);
                    allResidents.Add(owner1);

                    if (pattern == 1)
                    {
                        var owner2 = CreateResident(society.Id, apt.Id, aptIndex, 1, rng,
                            UserRole.SUUser, ResidentType.Owner, society);
                        owner2.SetPasswordHash(authService.HashPassword("Resident@123"));
                        owner2.Verify();
                        owner2.AssignApartment(apt.Id);
                        await userRepo.CreateAsync(owner2, ct);
                        allResidents.Add(owner2);
                    }
                    else if (pattern == 2)
                    {
                        var tenant = CreateResident(society.Id, apt.Id, aptIndex, 1, rng,
                            UserRole.SUUser, ResidentType.Tenant, society);
                        tenant.SetPasswordHash(authService.HashPassword("Resident@123"));
                        tenant.Verify();
                        tenant.AssignApartment(apt.Id);
                        await userRepo.CreateAsync(tenant, ct);
                        allResidents.Add(tenant);
                    }
                }
            }
        }

        log.Add($"Apartments: {apartments.Count}  Residents: {allResidents.Count}");

        // ── 5. Maintenance schedule (₹2.36 per sqft, super build-up) ─────────────
        var now     = DateTime.UtcNow;
        var fyStart = now.Month >= 4 ? now.Year : now.Year - 1;

        var schedule = MaintenanceSchedule.Create(
            society.Id, null,
            "Monthly Society Maintenance",
            "Per super build-up area @ ₹2.36/sqft",
            MaintenanceRate,
            MaintenancePricingType.PerSquareFoot,
            MaintenanceAreaBasis.SuperBuildUpArea,
            FeeFrequency.Monthly,
            dueDay: 5,
            startMonth: 4, startYear: fyStart,
            endMonth: 3,   endYear: fyStart + 2);
        await scheduleRepo.CreateAsync(schedule, ct);
        log.Add($"Schedule: {schedule.Id}");

        // ── 6. Maintenance charges (last 6 months per apartment) ──────────────────
        int chargesCreated = 0;
        foreach (var apt in apartments)
        {
            double area = apt.SuperBuildArea;
            decimal amount = Math.Round((decimal)area * MaintenanceRate, 0);

            for (int m = 5; m >= 0; m--)
            {
                var month    = now.AddMonths(-m);
                var dueDate  = new DateTime(month.Year, month.Month, 5, 0, 0, 0, DateTimeKind.Utc);
                var charge   = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id,
                    "Monthly Society Maintenance", amount, dueDate);

                // oldest 4 months: paid; newest 2: pending
                if (m >= 2)
                    charge.MarkPaid("UPI", $"TXN{apt.Id[..8].ToUpperInvariant()}{m}", null);

                await chargeRepo.CreateAsync(charge, ct);
                chargesCreated++;
            }
        }
        log.Add($"Maintenance charges: {chargesCreated}");

        // ── 7. Vendors + recurring charges ────────────────────────────────────────
        var vendorDefs = new[]
        {
            ("Eagle Security Services",  "Security & surveillance for the premises",  15_000m, "Security"),
            ("CleanSphere Housekeeping", "Daily housekeeping and waste management",    8_500m,  "Cleaning"),
            ("LiftTech Solutions",       "Monthly elevator service and maintenance",   6_000m,  "Elevator"),
            ("Greenthumb Landscaping",   "Garden and landscape upkeep",                3_500m,  "Landscaping"),
            ("AquaPure Water Systems",   "Water purification plant AMC",              4_200m,  "Utilities"),
        };

        foreach (var (name, overview, amount, bizType) in vendorDefs)
        {
            var vendor = Vendor.Create(society.Id, name,
                new Address("45 Industrial Estate", "Bengaluru", "Karnataka", "560044", "India"),
                null, "Suresh", "Kumar", $"98{rng.Next(10_000_000, 99_999_999)}",
                $"{name.ToLowerInvariant().Replace(' ', '.')}@vendor.in",
                overview, DateTime.UtcNow.AddYears(2), 30,
                "Bengaluru", bizType, null);
            await vendorRepo.CreateAsync(vendor, ct);

            var recurr = VendorRecurringSchedule.Create(
                society.Id, vendor.Id,
                VendorPaymentFrequency.Monthly, amount,
                new DateTime(fyStart, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(fyStart + 2, 3, 31, 0, 0, 0, DateTimeKind.Utc),
                $"{bizType} – monthly retainer");
            await recurringRepo.CreateAsync(recurr, ct);

            // Past 6 months of ad-hoc charges (paid)
            for (int m = 5; m >= 0; m--)
            {
                var month  = now.AddMonths(-m);
                var effDate = new DateTime(month.Year, month.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var vc = VendorCharge.CreateAdHoc(society.Id, vendor.Id, vendor.Name,
                    amount, effDate, 30, $"{bizType} – {month:MMM yyyy}");
                if (m >= 1)
                    vc.MarkPaid(effDate.AddDays(28), "NEFT", $"NEFT{rng.Next(100000, 999999)}", "https://receipts.greenvalley.in/placeholder.pdf", null);
                await vendorChargeRepo.CreateAsync(vc, ct);
            }
        }
        log.Add("Vendors + charges: 5");

        // ── 8. Notices ────────────────────────────────────────────────────────────
        var noticeDefs = new[]
        {
            (NoticeCategory.Events,       "Annual General Meeting – FY " + fyStart,
             "The Annual General Meeting of Green Valley Residency will be held on the last Sunday of April. All apartment owners are requested to attend in person or send their proxy. Agenda: financial review, elections, upcoming capital works."),

            (NoticeCategory.Maintenance,  "Water Supply Interruption – Tank Cleaning",
             "Scheduled rooftop tank cleaning on the 2nd Saturday of the month from 06:00 to 14:00. Please store adequate water. Borewell supply will remain active."),

            (NoticeCategory.Financial,    "Maintenance Dues – Q1 Reminder",
             "Residents with pending maintenance dues for April–June are requested to clear outstanding amounts by the 10th. Late payment penalty of ₹50/day will apply thereafter."),

            (NoticeCategory.Events,       "Diwali Celebration – Society Grounds",
             "The Residents Welfare Association invites all families to the society Diwali celebration. Community rangoli, diyas, and snacks. Children's event at 6 PM. Fireworks after 8 PM strictly within society grounds."),

            (NoticeCategory.General,      "Parking Policy Update – Effective Immediately",
             "Residents are reminded that visitor vehicles must be parked in designated visitor bays only. Vehicles blocking emergency access will be towed without prior notice. Residents must display parking stickers issued by the admin office."),

            (NoticeCategory.Emergency,    "Fire Safety Drill – Mandatory Participation",
             "A mandatory fire evacuation drill will be conducted by the local fire department. All residents must vacate their apartments and assemble at the designated muster point (Gate 2) within 5 minutes of the alarm. No elevator use during the drill."),

            (NoticeCategory.Maintenance,  "Swimming Pool – Seasonal Reopening",
             "The swimming pool has been cleaned, shock-treated, and certified safe for use. Pool hours: 6 AM–9 AM and 5 PM–8 PM. Children under 12 must be accompanied by an adult. Pool cap mandatory."),

            (NoticeCategory.General,      "Society Security Advisory",
             "Residents are advised not to let in unknown persons claiming to be service technicians without verifying with the admin office. All vendors and service personnel must check in at the security cabin and collect a visitor pass."),
        };

        var createdNotices = new List<Notice>(noticeDefs.Length);
        foreach (var (category, title, content) in noticeDefs)
        {
            var notice = Notice.Create(society.Id, admin.Id, title, content, category,
                DateTime.UtcNow.AddDays(-rng.Next(1, 60)),
                DateTime.UtcNow.AddDays(rng.Next(30, 120)));
            await noticeRepo.CreateAsync(notice, ct);
            createdNotices.Add(notice);
        }
        log.Add($"Notices: {noticeDefs.Length}");

        // ── 9. Complaints ─────────────────────────────────────────────────────────
        var complaintDefs = new[]
        {
            (ComplaintCategory.Maintenance,  ComplaintPriority.High,
             "Lift Out of Service – Block A",   "The passenger lift in Block A has been non-functional for 3 days. Elderly residents are severely impacted. Immediate repair required."),

            (ComplaintCategory.Noise,        ComplaintPriority.Medium,
             "Loud Music After 11 PM",          "Flat B-302 is playing loud music regularly after 11 PM, disturbing sleep. Multiple residents on the floor have complained verbally with no improvement."),

            (ComplaintCategory.Cleanliness,  ComplaintPriority.Medium,
             "Garbage Not Collected – C Wing",  "The garbage collection team has missed C-wing for the past two days. Waste is overflowing near the bin area on G floor."),

            (ComplaintCategory.Security,     ComplaintPriority.Critical,
             "CCTV Camera Vandalism – Gate 2",  "The CCTV camera covering Gate 2 was found damaged. This is a blind spot and a security risk. Replacement/repair is urgent."),

            (ComplaintCategory.Parking,      ComplaintPriority.Low,
             "Visitor Parking Misuse",          "Multiple registered residents appear to be using visitor parking bays permanently. Genuine visitors are unable to find space."),

            (ComplaintCategory.Maintenance,  ComplaintPriority.Medium,
             "Water Leakage – Terrace D Block", "Rainwater is leaking into D-401 through the terrace. The plaster on the ceiling is peeling. Issue persists since last monsoon."),

            (ComplaintCategory.Other,        ComplaintPriority.Low,
             "Stray Dogs in Society Premises", "A pack of stray dogs has been spotted near the children's play area. This is a safety hazard for children and senior citizens. Please coordinate with the municipality."),

            (ComplaintCategory.Cleanliness,  ComplaintPriority.Medium,
             "Foul Smell Near E-Block Drain",   "There is a persistent foul smell from the open drain near E-block main entrance. The drain appears to be blocked. Urgent de-clogging needed."),

            (ComplaintCategory.Maintenance,  ComplaintPriority.High,
             "Broken Streetlight – Main Path",  "Three streetlights along the main internal road have been non-functional for a week, making the path unsafe at night."),

            (ComplaintCategory.Security,     ComplaintPriority.High,
             "Security Guard Absent – Night Shift", "The security guard at Gate 1 was found absent during the 2–4 AM window on multiple nights. Gate was unmanned. This is a serious lapse."),
        };

        for (int i = 0; i < complaintDefs.Length; i++)
        {
            var (category, priority, title, desc) = complaintDefs[i];
            var apt       = apartments[i * 20]; // spread across blocks
            var resident  = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
            var complaint = Complaint.Create(society.Id, apt.Id, resident.Id,
                title, desc, category, priority);
            await complaintRepo.CreateAsync(complaint, ct);
        }
        log.Add($"Complaints: {complaintDefs.Length}");

        // ── 10. Amenities ─────────────────────────────────────────────────────────
        var amenityDefs = new[]
        {
            ("Clubhouse",         "Multipurpose hall for events, meetings and parties",          80,
             "No smoking. Advance booking required. Clean up after use.", 60,
             new TimeOnly(8,0), new TimeOnly(22,0), 14),
            ("Swimming Pool",     "Temperature-controlled lap pool and children's wading pool",  40,
             "Pool cap mandatory. No food or glass near pool. Children under 12 must have adult supervision.", 30,
             new TimeOnly(6,0), new TimeOnly(20,0), 3),
            ("Gymnasium",         "Fully equipped gym with cardio and free weights",              25,
             "Personal towel mandatory. Wipe down equipment after use. Proper gym attire required.", 60,
             new TimeOnly(5,30), new TimeOnly(22,0), 1),
            ("Terrace Garden",    "Open landscaped terrace with seating and BBQ zone",           30,
             "No loud music after 9 PM. No pets on terrace. BBQ pit must be cleaned after use.", 120,
             new TimeOnly(7,0), new TimeOnly(22,0), 2),
            ("Badminton Court",   "Two synthetic-floored indoor badminton courts",               8,
             "Proper sports shoes only. Court shoes mandatory — no street shoes.", 60,
             new TimeOnly(6,0), new TimeOnly(21,0), 2),
        };

        foreach (var (name, desc, cap, rules, slot, open, close, advance) in amenityDefs)
        {
            var amenity = Amenity.Create(society.Id, name, desc, cap, rules, slot, open, close, advance);
            await amenityRepo.CreateAsync(amenity, ct);
        }
        log.Add($"Amenities: {amenityDefs.Length}");

        // ── 11. Sample visitors ───────────────────────────────────────────────────
        var visitorSamples = new[]
        {
            ("Raju Delivery", "9000000001", "Package delivery",  "Amazon",           false),
            ("Kavitha Nurse",  "9000000002", "Home nursing visit", "CareFirst",       true),
            ("Sunil Plumber",  "9000000003", "Plumbing repair",    "Self",            true),
            ("Leela Maid",     "9000000004", "Domestic help",      "Self",            true),
            ("Anand Guest",    "9000000005", "Personal visit",     null,              true),
            ("Zara Courier",   "9000000006", "Courier delivery",   "BlueDart",        false),
            ("Ramki Painter",  "9000000007", "Interior painting",  "Sri Ganesh Works",true),
            ("Priya Friend",   "9000000008", "Personal visit",     null,              true),
        };

        for (int i = 0; i < visitorSamples.Length; i++)
        {
            var (name, phone, purpose, company, preApproved) = visitorSamples[i];
            var apt      = apartments[i * 25];
            var resident = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
            var visitor  = VisitorLog.Create(
                society.Id, name, phone, null, company, purpose,
                apt.Id, resident.Id, resident.FullName,
                apt.BlockName, apt.FloorNumber, apt.ApartmentNumber,
                preApproved);
            if (preApproved) visitor.Approve();
            await visitorRepo.CreateAsync(visitor, ct);
        }
        log.Add($"Visitors: {visitorSamples.Length}");

        // ── 12. Shifts & Staff (workforce / attendance module) ───────────────────────
        var shiftDefs = new (string Name, TimeSpan Start, TimeSpan End, int Grace)[]
        {
            ("Morning Security", new TimeSpan(6, 0, 0),  new TimeSpan(14, 0, 0), 15),
            ("Night Security",   new TimeSpan(22, 0, 0), new TimeSpan(6, 0, 0),  15),
            ("Housekeeping Day", new TimeSpan(8, 0, 0),  new TimeSpan(16, 0, 0), 30),
        };

        var shifts = new List<Shift>(shiftDefs.Length);
        foreach (var (name, start, end, grace) in shiftDefs)
        {
            var shift = Shift.Create(society.Id, name, start, end, grace);
            await shiftRepo.CreateAsync(shift, ct);
            shifts.Add(shift);
        }
        log.Add($"Shifts: {shifts.Count}");

        var morningShift = shifts[0];
        var nightShift = shifts[1];
        var housekeepingShift = shifts[2];

        var staffDefs = new (string Name, string Phone, StaffCategory Category, StaffEmploymentType EmploymentType, Shift? Shift)[]
        {
            ("Bahadur Thapa",    "9876500001", StaffCategory.Security,     StaffEmploymentType.OnPayroll,  morningShift),
            ("Suresh Yadav",     "9876500002", StaffCategory.Security,     StaffEmploymentType.OnPayroll,  morningShift),
            ("Ramlal Chaudhary", "9876500003", StaffCategory.Security,     StaffEmploymentType.OnPayroll,  nightShift),
            ("Ganesh Tamang",    "9876500004", StaffCategory.Security,     StaffEmploymentType.OnPayroll,  nightShift),
            ("Kamla Devi",       "9876500005", StaffCategory.Housekeeping, StaffEmploymentType.OnPayroll,  housekeepingShift),
            ("Sita Ram",         "9876500006", StaffCategory.Housekeeping, StaffEmploymentType.OnPayroll,  housekeepingShift),
            ("Mahesh Mali",      "9876500007", StaffCategory.Gardener,     StaffEmploymentType.Contractor, null),
            ("Ravi Kumar",       "9876500008", StaffCategory.Plumber,      StaffEmploymentType.Contractor, null),
            ("Anil Sharma",      "9876500009", StaffCategory.Electrician,  StaffEmploymentType.Contractor, null),
        };

        var staffList = new List<Staff>(staffDefs.Length);
        foreach (var (name, phone, category, employmentType, shift) in staffDefs)
        {
            var staffMember = Staff.Create(society.Id, name, phone, category, employmentType,
                shiftId: shift?.Id, shiftName: shift?.Name);
            await staffRepo.CreateAsync(staffMember, ct);
            staffList.Add(staffMember);
        }
        log.Add($"Staff: {staffList.Count}");

        // Attendance history for the 6 shift-assigned staff — a mix of on-time/late check-ins,
        // completed shifts, and absences so every attendance state is represented.
        var today = DateTime.UtcNow.Date;
        var attendanceCreated = 0;

        async Task CheckInOutAsync(Staff staffMember, Shift shift, DateTime day, bool late, bool completed)
        {
            var checkInTime = DateTime.SpecifyKind(day + shift.StartTime, DateTimeKind.Utc)
                .AddMinutes(late ? shift.GraceMinutes + 30 : 5);
            var attendance = StaffAttendance.CheckIn(society.Id, staffMember.Id, staffMember.FullName, shift.Id, checkInTime, late);
            if (completed)
                attendance.CheckOut(checkInTime.AddHours(8));
            await staffAttendanceRepo.CreateAsync(attendance, ct);
            attendanceCreated++;
        }

        async Task MarkAbsentAsync(Staff staffMember, string shiftId, DateTime day)
        {
            var attendance = StaffAttendance.CreateAbsent(society.Id, staffMember.Id, staffMember.FullName, shiftId, day);
            await staffAttendanceRepo.CreateAsync(attendance, ct);
            attendanceCreated++;
        }

        var g1 = staffList[0]; // Morning guard — on duty now
        var g2 = staffList[1]; // Morning guard — one absence, one late arrival
        var g3 = staffList[2]; // Night guard — on duty now, arrived late
        var g4 = staffList[3]; // Night guard — one absence
        var h1 = staffList[4]; // Housekeeper — on duty now
        var h2 = staffList[5]; // Housekeeper — absent today

        await CheckInOutAsync(g1, morningShift, today.AddDays(-2), late: false, completed: true);
        await CheckInOutAsync(g1, morningShift, today.AddDays(-1), late: false, completed: true);
        await CheckInOutAsync(g1, morningShift, today, late: false, completed: false); // currently on duty

        await CheckInOutAsync(g2, morningShift, today.AddDays(-2), late: true, completed: true);
        await MarkAbsentAsync(g2, morningShift.Id, today.AddDays(-1));
        await CheckInOutAsync(g2, morningShift, today, late: false, completed: true);

        await CheckInOutAsync(g3, nightShift, today.AddDays(-2), late: false, completed: true);
        await CheckInOutAsync(g3, nightShift, today.AddDays(-1), late: false, completed: true);
        await CheckInOutAsync(g3, nightShift, today, late: true, completed: false); // on duty, arrived late

        await MarkAbsentAsync(g4, nightShift.Id, today.AddDays(-2));
        await CheckInOutAsync(g4, nightShift, today.AddDays(-1), late: false, completed: true);
        await CheckInOutAsync(g4, nightShift, today, late: false, completed: true);

        await CheckInOutAsync(h1, housekeepingShift, today.AddDays(-2), late: false, completed: true);
        await CheckInOutAsync(h1, housekeepingShift, today.AddDays(-1), late: false, completed: true);
        await CheckInOutAsync(h1, housekeepingShift, today, late: false, completed: false); // on duty

        await CheckInOutAsync(h2, housekeepingShift, today.AddDays(-2), late: false, completed: true);
        await CheckInOutAsync(h2, housekeepingShift, today.AddDays(-1), late: false, completed: true);
        await MarkAbsentAsync(h2, housekeepingShift.Id, today);

        log.Add($"Staff attendance records: {attendanceCreated}");

        // ── 13. Amenity bookings ──────────────────────────────────────────────────
        var amenities = await amenityRepo.GetAllAsync(society.Id, ct);
        var bookingsCreated = 0;
        foreach (var amenity in amenities)
        {
            for (int i = 0; i < 3; i++)
            {
                var apt      = apartments[(bookingsCreated * 7) % apartments.Count];
                var resident = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
                var start    = today.AddDays(i + 1).Add(amenity.OperatingStart.ToTimeSpan());
                var end      = start.AddMinutes(amenity.BookingSlotMinutes);

                var booking = AmenityBooking.Create(society.Id, amenity.Id, amenity.Name,
                    resident.Id, apt.Id, start, end);
                if (i == 0) booking.Approve("Confirmed by admin");
                else if (i == 2) booking.Reject("Slot double-booked — please choose another time");
                await amenityBookingRepo.CreateAsync(booking, ct);
                bookingsCreated++;
            }
        }
        log.Add($"Amenity bookings: {bookingsCreated}");

        // ── 14. SOS alerts ────────────────────────────────────────────────────────
        var sosDefs = new (SosCategory Category, string? Note)[]
        {
            (SosCategory.Fire,              "Smoke smell from kitchen exhaust"),
            (SosCategory.Medical,            "Elderly resident needs urgent assistance"),
            (SosCategory.SecurityIntrusion,  "Unknown person attempting to enter through the back gate"),
            (SosCategory.Other,              "Water leakage flooding the ground floor lobby"),
        };
        var sosAlerts = new List<SosAlert>(sosDefs.Length);
        for (int i = 0; i < sosDefs.Length; i++)
        {
            var (category, note) = sosDefs[i];
            var apt      = apartments[i * 40];
            var resident = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
            var alert    = SosAlert.Create(society.Id, apt.Id, resident.Id, resident.FullName, category, note);

            switch (i)
            {
                case 1: alert.Acknowledge(security.Id, security.FullName); break;
                case 2: alert.Acknowledge(security.Id, security.FullName); alert.Resolve(security.Id, security.FullName); break;
                case 3: alert.MarkFalseAlarm(); break;
                // case 0 stays Triggered — still active
            }
            await sosAlertRepo.CreateAsync(alert, ct);
            sosAlerts.Add(alert);
        }
        log.Add($"SOS alerts: {sosAlerts.Count}");

        // ── 15. Competitions + entries ────────────────────────────────────────────
        var gardenComp  = Competition.Create(society.Id, admin.Id, "Best Balcony Garden",
            "Show off your green thumb — best balcony garden wins a shopping voucher.",
            now.AddDays(20), now.AddDays(35), "₹2,000 voucher", maxParticipants: 30);
        await competitionRepo.CreateAsync(gardenComp, ct);

        var cricketComp = Competition.Create(society.Id, admin.Id, "Society Cricket Tournament",
            "Inter-block box cricket tournament on the central lawn every weekend this month.",
            now.AddDays(-10), now.AddDays(10), "Trophy + ₹10,000", maxParticipants: 40);
        cricketComp.Start();
        await competitionRepo.CreateAsync(cricketComp, ct);

        var rangoliComp = Competition.Create(society.Id, admin.Id, "Diwali Rangoli Contest",
            "Traditional rangoli competition judged by the RWA committee on Diwali eve.",
            now.AddDays(-30), now.AddDays(-25), "₹5,000 voucher", maxParticipants: 20);
        rangoliComp.Start();
        rangoliComp.Complete();
        await competitionRepo.CreateAsync(rangoliComp, ct);

        var competitions = new[] { gardenComp, cricketComp, rangoliComp };
        log.Add($"Competitions: {competitions.Length}");

        int entriesCreated = 0;

        async Task<CompetitionEntry> AddEntryAsync(Competition competition, Apartment apt, decimal score = 0m)
        {
            var resident = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
            var entry = CompetitionEntry.Create(society.Id, competition.Id, apt.Id, resident.Id);
            if (score != 0m) entry.UpdateScore(score);
            await competitionEntryRepo.CreateAsync(entry, ct);
            entriesCreated++;
            return entry;
        }

        // Garden contest — registrations only, judging hasn't started.
        for (int i = 0; i < 3; i++)
            await AddEntryAsync(gardenComp, apartments[i * 15]);

        // Cricket — mid-tournament, scores updated as matches are played, no final ranking yet.
        for (int i = 0; i < 4; i++)
            await AddEntryAsync(cricketComp, apartments[i * 12 + 5], score: rng.Next(1, 6));

        // Rangoli — judged and ranked; top 3 entries get a placement.
        var rangoliEntries = new List<CompetitionEntry>();
        for (int i = 0; i < 5; i++)
            rangoliEntries.Add(await AddEntryAsync(rangoliComp, apartments[i * 18 + 2], score: 100 - i * 8));
        rangoliEntries[0].SetRank(1);
        rangoliEntries[1].SetRank(2);
        rangoliEntries[2].SetRank(3);
        foreach (var entry in rangoliEntries.Take(3))
            await competitionEntryRepo.UpdateAsync(entry, ct);
        log.Add($"Competition entries: {entriesCreated}");

        // ── 16. Reward points ─────────────────────────────────────────────────────
        var rewardDefs = new (int Index, int Points, string Reason)[]
        {
            (0, 100, "Diwali Rangoli Contest — 1st place"),
            (1, 60,  "Diwali Rangoli Contest — 2nd place"),
            (2, 40,  "Diwali Rangoli Contest — 3rd place"),
            (3, 25,  "Timely maintenance payment — Q1 bonus"),
            (4, 25,  "Timely maintenance payment — Q1 bonus"),
            (5, 30,  "Community volunteer — AGM setup"),
            (6, 20,  "Referral bonus — new resident onboarding"),
            (7, -50, "Redeemed for society store voucher"),
        };
        foreach (var (index, points, reason) in rewardDefs)
        {
            var resident = allResidents[index * 23 % allResidents.Count];
            var apt      = apartments.First(a => a.Id == resident.ApartmentId);
            var reward   = RewardPoints.Create(society.Id, resident.Id, apt.Id, points, reason);
            await rewardPointsRepo.CreateAsync(reward, ct);
        }
        log.Add($"Reward points records: {rewardDefs.Length}");

        // ── 17. Service providers + requests ──────────────────────────────────────
        var providerDefs = new[]
        {
            ("Om Plumbing Works",     "Ravi Om",     "9900011111", "om.plumbing@services.in",     new[] { "Plumbing" },              "24x7 plumbing repairs and installations", 4.5m),
            ("Bright Spark Electric", "Naveen Kumar","9900022222", "brightspark@services.in",     new[] { "Electrical" },            "Licensed electricians for home and society work", 4.2m),
            ("SafeGuard Pest Control","Ajay Rathi",  "9900033333", "safeguard.pest@services.in",  new[] { "Pest Control" },           "Eco-friendly pest control treatments", 4.0m),
            ("CoolAir HVAC Services", "Farhan Sheikh","9900044444","coolair.hvac@services.in",    new[] { "AC Repair", "Appliance" }, "AC servicing, repair, and gas refilling", 0m),
            ("Woodcraft Carpentry",   "Manoj Verma", "9900055555", "woodcraft@services.in",       new[] { "Carpentry" },              "Custom furniture and repair work", 4.7m),
        };

        var serviceProviders = new List<ServiceProvider>(providerDefs.Length);
        foreach (var (name, contact, phone, email, types, desc, rating) in providerDefs)
        {
            var provider = ServiceProvider.Create(name, contact, phone, email, types, desc, society.Id);
            if (rating > 0m)
            {
                provider.Approve();
                provider.UpdateRating(rating);
            }
            // CoolAir HVAC Services is left Pending to represent an unreviewed onboarding request.
            await serviceProviderRepo.CreateAsync(provider, ct);
            serviceProviders.Add(provider);
        }
        log.Add($"Service providers: {serviceProviders.Count}");

        var plumber      = serviceProviders[0];
        var electrician   = serviceProviders[1];
        var pestControl  = serviceProviders[2];
        var carpenter    = serviceProviders[4];

        var requestDefs = new (int AptIndex, string ServiceType, string Description, ServiceProvider? Provider, ServiceRequestStatus Status, int? Rating)[]
        {
            (10,  "Plumbing",    "Kitchen sink tap is leaking continuously.",           plumber,     ServiceRequestStatus.Completed, 5),
            (35,  "Electrical",  "Living room switchboard sparking intermittently.",    electrician, ServiceRequestStatus.Completed, 4),
            (60,  "Pest Control","Ants infestation in the kitchen cabinets.",           pestControl, ServiceRequestStatus.InProgress, null),
            (85,  "Carpentry",   "Bedroom wardrobe door hinge needs replacement.",      carpenter,   ServiceRequestStatus.Accepted,   null),
            (110, "Plumbing",    "Bathroom drain is clogged and draining slowly.",      null,        ServiceRequestStatus.Open,       null),
            (135, "Electrical",  "Need an extra power outlet installed in the study.",  null,        ServiceRequestStatus.Cancelled,  null),
        };

        var serviceRequestsCreated = 0;
        foreach (var (requestAptIndex, serviceType, desc, provider, status, rating) in requestDefs)
        {
            var apt      = apartments[requestAptIndex];
            var resident = allResidents.FirstOrDefault(u => u.ApartmentId == apt.Id) ?? allResidents[0];
            var request  = ServiceProviderRequest.Create(society.Id, apt.Id, resident.Id, serviceType, desc,
                now.AddDays(rng.Next(1, 10)));

            if (provider is not null && status is ServiceRequestStatus.Accepted or ServiceRequestStatus.InProgress or ServiceRequestStatus.Completed)
                request.Accept(provider.Id);
            if (status is ServiceRequestStatus.InProgress or ServiceRequestStatus.Completed)
                request.StartWork();
            if (status == ServiceRequestStatus.Completed)
            {
                request.Complete();
                if (rating.HasValue) request.AddReview(rating.Value, "Great service, would book again.");
            }
            if (status == ServiceRequestStatus.Cancelled)
                request.Cancel();

            await serviceRequestRepo.CreateAsync(request, ct);
            serviceRequestsCreated++;
        }
        log.Add($"Service provider requests: {serviceRequestsCreated}");

        // ── 18. AGM session + poll resolutions + standalone polls ────────────────
        var agmSession = AgmSession.Create(society.Id, admin.Id,
            $"Annual General Meeting – FY {fyStart}",
            "Annual General Meeting covering budget approval, committee elections, and corpus fund review.",
            new DateTime(fyStart + 1, 4, 26, 10, 0, 0, DateTimeKind.Utc));
        await agmSessionRepo.CreateAsync(agmSession, ct);
        log.Add($"AGM sessions: 1");

        var pollsCreated = 0;
        var pollVotesCreated = 0;

        async Task<int> CastApartmentVotesAsync(Poll poll, int apartmentCount, Func<int, string> pickOptionId)
        {
            var cast = 0;
            for (int i = 0; i < apartmentCount; i++)
            {
                var apt   = apartments[i];
                var owner = allResidents.First(u => u.ApartmentId == apt.Id && u.Role == UserRole.SUUser);
                var vote  = PollVote.Create(society.Id, poll.Id, apt.Id, owner.Id, [pickOptionId(i)]);
                await pollVoteRepo.CreateAsync(vote, ct);
                cast++;
            }
            return cast;
        }

        async Task<int> CastResidentVotesAsync(Poll poll, int residentCount, Func<int, string> pickOptionId)
        {
            var cast = 0;
            for (int i = 0; i < residentCount; i++)
            {
                var voter = allResidents[i];
                var vote  = PollVote.Create(society.Id, poll.Id, voter.Id, voter.Id, [pickOptionId(i)]);
                await pollVoteRepo.CreateAsync(vote, ct);
                cast++;
            }
            return cast;
        }

        // Resolution 1 — budget approval, closed with quorum met and a Passed outcome.
        var budgetResolution = Poll.Create(society.Id, admin.Id,
            $"Approve Annual Budget FY {fyStart}-{fyStart + 1}",
            "Review and approve the proposed annual maintenance and capital expenditure budget.",
            PollType.SingleChoice, ["Approve", "Reject"],
            now.AddDays(-10), now.AddDays(-1),
            PollEligibilityUnit.PerApartment, PollAnonymity.Identified, PollVisibility.AfterClose,
            null, 50, isAgmResolution: true, allowVoteChange: false, agmSession.Id);
        await pollRepo.CreateAsync(budgetResolution, ct);
        pollsCreated++;

        var approveId = budgetResolution.Options[0].Id;
        var rejectId  = budgetResolution.Options[1].Id;
        var budgetVotes = await CastApartmentVotesAsync(budgetResolution, 100, i => i % 5 == 0 ? rejectId : approveId);
        pollVotesCreated += budgetVotes;
        var budgetApproveCount = 80; // 20 of the 100 voting apartments (i % 5 == 0) voted Reject
        budgetResolution.Close(eligibleCount: apartments.Count, participantCount: budgetVotes, leadingOptionVoteCount: budgetApproveCount);
        await pollRepo.UpdateAsync(budgetResolution, ct);

        // Resolution 2 — committee election, still open, live tally visible.
        var electionResolution = Poll.Create(society.Id, admin.Id,
            "Elect New Committee Members",
            "Vote for the resident who will represent your block on the Managing Committee for the next term.",
            PollType.SingleChoice, ["Ramesh Gupta (Block A)", "Sunita Rao (Block D)", "Vikram Shah (Block G)"],
            now.AddDays(-5), now.AddDays(10),
            PollEligibilityUnit.PerApartment, PollAnonymity.Identified, PollVisibility.Immediately,
            null, null, isAgmResolution: true, allowVoteChange: true, agmSession.Id);
        await pollRepo.CreateAsync(electionResolution, ct);
        pollsCreated++;

        var electionOptionIds = electionResolution.Options.Select(o => o.Id).ToArray();
        pollVotesCreated += await CastApartmentVotesAsync(electionResolution, 40, i => electionOptionIds[i % electionOptionIds.Length]);

        // Resolution 3 — corpus fund increase, still open, participation short of quorum so far.
        var corpusResolution = Poll.Create(society.Id, admin.Id,
            "Approve Corpus Fund Increase",
            "Proposal to increase the monthly corpus fund contribution to build a reserve for major repairs.",
            PollType.SingleChoice, ["Yes", "No"],
            now.AddDays(-3), now.AddDays(12),
            PollEligibilityUnit.PerApartment, PollAnonymity.Identified, PollVisibility.Immediately,
            null, 50, isAgmResolution: true, allowVoteChange: true, agmSession.Id);
        await pollRepo.CreateAsync(corpusResolution, ct);
        pollsCreated++;

        var corpusYesId = corpusResolution.Options[0].Id;
        var corpusNoId  = corpusResolution.Options[1].Id;
        pollVotesCreated += await CastApartmentVotesAsync(corpusResolution, 15, i => i % 4 == 0 ? corpusNoId : corpusYesId);

        // Standalone community poll — linked to the Diwali notice, open, resident-level voting.
        var diwaliNotice = createdNotices.First(n => n.Title.Contains("Diwali", StringComparison.OrdinalIgnoreCase));
        var timingPoll = Poll.Create(society.Id, admin.Id,
            "Preferred Diwali Event Timing",
            "Help us plan the Diwali celebration — which slot works best for your family?",
            PollType.SingleChoice, ["Evening (6 PM)", "Night (8 PM)"],
            now.AddDays(-7), now.AddDays(7),
            PollEligibilityUnit.PerResident, PollAnonymity.Anonymous, PollVisibility.Immediately,
            diwaliNotice.Id, null, isAgmResolution: false, allowVoteChange: true);
        await pollRepo.CreateAsync(timingPoll, ct);
        pollsCreated++;

        var timingOptionIds = timingPoll.Options.Select(o => o.Id).ToArray();
        pollVotesCreated += await CastResidentVotesAsync(timingPoll, 40, i => timingOptionIds[i % 3 == 0 ? 1 : 0]);

        // Standalone community poll — scheduled to open in the future, no votes yet.
        var repaintPoll = Poll.Create(society.Id, admin.Id,
            "Should We Repaint the Common Corridors?",
            "Proposal to repaint all block corridors and stairwells before the next monsoon season.",
            PollType.SingleChoice, ["Yes", "No"],
            now.AddDays(5), now.AddDays(20),
            PollEligibilityUnit.PerResident, PollAnonymity.Anonymous, PollVisibility.Immediately,
            null, null, isAgmResolution: false, allowVoteChange: true);
        await pollRepo.CreateAsync(repaintPoll, ct);
        pollsCreated++;

        log.Add($"Polls: {pollsCreated}");
        log.Add($"Poll votes: {pollVotesCreated}");

        // ── Validation — re-read every module back from Cosmos to confirm persistence ─
        var validation = new List<string>();

        async Task ValidateCountAsync<T>(string label, Func<Task<IReadOnlyList<T>>> fetch, int expected)
        {
            var actual = (await fetch()).Count;
            validation.Add(actual == expected
                ? $"OK {label}: {actual}/{expected} persisted"
                : $"MISMATCH {label}: expected {expected}, found {actual}");
        }

        await ValidateCountAsync("Apartments", () => apartmentRepo.GetAllAsync(society.Id, ct), apartments.Count);
        await ValidateCountAsync("Users (residents + admin + security)", () => userRepo.GetAllAsync(society.Id, ct), allResidents.Count + 2);
        await ValidateCountAsync("Maintenance charges", () => chargeRepo.GetAllAsync(society.Id, ct), chargesCreated);
        await ValidateCountAsync("Vendors", () => vendorRepo.GetAllAsync(society.Id, ct), vendorDefs.Length);
        await ValidateCountAsync("Vendor charges", () => vendorChargeRepo.GetAllAsync(society.Id, ct), vendorDefs.Length * 6);
        await ValidateCountAsync("Notices", () => noticeRepo.GetAllAsync(society.Id, ct), noticeDefs.Length);
        await ValidateCountAsync("Complaints", () => complaintRepo.GetAllAsync(society.Id, ct), complaintDefs.Length);
        await ValidateCountAsync("Amenities", () => amenityRepo.GetAllAsync(society.Id, ct), amenityDefs.Length);
        await ValidateCountAsync("Visitors", () => visitorRepo.GetAllAsync(society.Id, ct), visitorSamples.Length);
        await ValidateCountAsync("Shifts", () => shiftRepo.GetAllAsync(society.Id, ct), shifts.Count);
        await ValidateCountAsync("Staff", () => staffRepo.GetAllAsync(society.Id, ct), staffList.Count);
        await ValidateCountAsync("Staff attendance", () => staffAttendanceRepo.GetAllAsync(society.Id, ct), attendanceCreated);
        await ValidateCountAsync("Amenity bookings", () => amenityBookingRepo.GetAllAsync(society.Id, ct), bookingsCreated);
        await ValidateCountAsync("SOS alerts", () => sosAlertRepo.GetAllAsync(society.Id, ct), sosAlerts.Count);
        await ValidateCountAsync("Competitions", () => competitionRepo.GetAllAsync(society.Id, ct), competitions.Length);
        await ValidateCountAsync("Competition entries", () => competitionEntryRepo.GetAllAsync(society.Id, ct), entriesCreated);
        await ValidateCountAsync("Reward points", () => rewardPointsRepo.GetAllAsync(society.Id, ct), rewardDefs.Length);
        await ValidateCountAsync("Service providers", () => serviceProviderRepo.GetAllAsync(society.Id, ct), serviceProviders.Count);
        await ValidateCountAsync("Service provider requests", () => serviceRequestRepo.GetAllAsync(society.Id, ct), serviceRequestsCreated);
        await ValidateCountAsync("AGM sessions", () => agmSessionRepo.GetAllAsync(society.Id, ct), 1);
        await ValidateCountAsync("Polls", () => pollRepo.GetAllAsync(society.Id, ct), pollsCreated);
        await ValidateCountAsync("Poll votes", () => pollVoteRepo.GetAllAsync(society.Id, ct), pollVotesCreated);

        // Spot-checks beyond raw counts — confirm specific field values round-tripped correctly.
        var reloadedSociety = await societyRepo.GetByIdAsync(society.Id, society.Id, ct);
        validation.Add(reloadedSociety is not null && reloadedSociety.Name == society.Name
            ? "OK Society: re-read matches (id, name)"
            : "MISMATCH Society: re-read failed or name differs");

        var reloadedAdmin = await userRepo.GetByIdAsync(admin.Id, society.Id, ct);
        validation.Add(reloadedAdmin?.Role == UserRole.SUAdmin
            ? "OK Admin user: role persisted as SUAdmin"
            : $"MISMATCH Admin user: role is {reloadedAdmin?.Role.ToString() ?? "null (not found)"}");

        var reloadedCharges = await chargeRepo.GetAllAsync(society.Id, ct);
        validation.Add(reloadedCharges.Any(c => c.Status == PaymentStatus.Paid)
            ? "OK Maintenance charges: at least one Paid charge persisted"
            : "MISMATCH Maintenance charges: no Paid charge found");

        var onDutyNow = await staffAttendanceRepo.GetOnDutyAsync(society.Id, ct);
        validation.Add(onDutyNow.Count > 0
            ? $"OK Staff attendance: {onDutyNow.Count} staff currently on duty"
            : "MISMATCH Staff attendance: expected at least one staff member currently checked in");

        var reloadedBookings = await amenityBookingRepo.GetAllAsync(society.Id, ct);
        validation.Add(reloadedBookings.Any(b => b.Status == BookingStatus.Approved)
            ? "OK Amenity bookings: at least one Approved booking persisted"
            : "MISMATCH Amenity bookings: no Approved booking found");

        var reloadedSos = await sosAlertRepo.GetAllAsync(society.Id, ct);
        validation.Add(reloadedSos.Count(a => a.Status == SosAlertStatus.Resolved) == 1
            ? "OK SOS alerts: resolved alert persisted with its status"
            : "MISMATCH SOS alerts: expected exactly one Resolved alert");

        var reloadedRangoli = await competitionRepo.GetByIdAsync(rangoliComp.Id, society.Id, ct);
        validation.Add(reloadedRangoli?.Status == CompetitionStatus.Completed
            ? "OK Competitions: Diwali Rangoli Contest persisted as Completed"
            : $"MISMATCH Competitions: expected Completed, found {reloadedRangoli?.Status.ToString() ?? "null (not found)"}");

        var reloadedRangoliEntries = await competitionEntryRepo.GetByCompetitionAsync(society.Id, rangoliComp.Id, ct);
        validation.Add(reloadedRangoliEntries.Count(e => e.Rank is >= 1 and <= 3) == 3
            ? "OK Competition entries: top-3 ranked entries persisted"
            : "MISMATCH Competition entries: expected exactly 3 ranked entries");

        var reloadedRewards = await rewardPointsRepo.GetAllAsync(society.Id, ct);
        validation.Add(reloadedRewards.Any(r => r.Points < 0)
            ? "OK Reward points: negative-points redemption entry persisted"
            : "MISMATCH Reward points: no redemption (negative points) entry found");

        var reloadedProviders = await serviceProviderRepo.GetApprovedAsync(society.Id, ct);
        validation.Add(reloadedProviders.Count == 4
            ? $"OK Service providers: {reloadedProviders.Count}/4 approved providers persisted"
            : $"MISMATCH Service providers: expected 4 approved, found {reloadedProviders.Count}");

        var reloadedRequests = await serviceRequestRepo.GetByStatusAsync(society.Id, ServiceRequestStatus.Completed, 1, 10, ct);
        validation.Add(reloadedRequests.Any(r => r.Rating.HasValue)
            ? "OK Service provider requests: completed request with a review persisted"
            : "MISMATCH Service provider requests: no completed+reviewed request found");

        var reloadedBudget = await pollRepo.GetByIdAsync(budgetResolution.Id, society.Id, ct);
        validation.Add(reloadedBudget?.Status == PollStatus.Closed && reloadedBudget.Outcome == PollOutcome.Passed
            ? "OK Polls: budget resolution closed with a Passed outcome"
            : $"MISMATCH Polls: expected Closed/Passed, found {reloadedBudget?.Status.ToString() ?? "null"}/{reloadedBudget?.Outcome?.ToString() ?? "null"}");

        var reloadedBudgetVotes = await pollVoteRepo.GetByPollAsync(society.Id, budgetResolution.Id, ct);
        validation.Add(reloadedBudgetVotes.Count == budgetVotes
            ? $"OK Poll votes: {reloadedBudgetVotes.Count}/{budgetVotes} budget resolution votes persisted"
            : $"MISMATCH Poll votes: expected {budgetVotes}, found {reloadedBudgetVotes.Count}");

        var reloadedAgmSession = await agmSessionRepo.GetByIdAsync(agmSession.Id, society.Id, ct);
        var reloadedAgmResolutions = (await pollRepo.GetAllAsync(society.Id, ct)).Count(p => p.AgmSessionId == agmSession.Id);
        validation.Add(reloadedAgmSession is not null && reloadedAgmResolutions == 3
            ? "OK AGM sessions: session persisted with all 3 linked resolutions"
            : $"MISMATCH AGM sessions: session {(reloadedAgmSession is null ? "not found" : "found")}, {reloadedAgmResolutions}/3 resolutions linked");

        var failedChecks = validation.Count(v => v.StartsWith("MISMATCH", StringComparison.Ordinal));
        log.Add($"Validation: {validation.Count - failedChecks}/{validation.Count} checks passed");

        // ── Summary ───────────────────────────────────────────────────────────────
        return new OkObjectResult(new
        {
            societyId = society.Id,
            adminEmail = $"admin@{society.Name.Replace(" ", "")}.in",
            adminPassword = "Admin@123",
            securityEmail = $"security@{society.Name.Replace(" ", "")}.in",
            securityPassword = "Security@123",
            residentPassword = "Resident@123",
            stats = log,
            validationPassed = failedChecks == 0,
            validation,
        });
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private User CreateResident(string societyId, string aptId, int aptIndex, int slot,
        Random rng, UserRole role, ResidentType residentType, Society society)
    {
        string first = FirstNames[(aptIndex * 7 + slot * 31) % FirstNames.Length];
        string last  = LastNames[(aptIndex * 13 + slot * 17) % LastNames.Length];
        string email = $"{first.ToLowerInvariant()}.{last.ToLowerInvariant()}.{aptIndex}{slot}@{society.Name.Replace(" ", "")}.in";
        string phone = $"9{rng.Next(100_000_000, 999_999_999)}";
        return User.Create(societyId, $"{first} {last}", email, phone, role, residentType, aptId);
    }
}
