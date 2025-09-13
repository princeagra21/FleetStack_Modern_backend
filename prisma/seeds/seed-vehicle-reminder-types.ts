import { PrismaClient, RecurrenceType, NotifyAdvanceUnit } from "@prisma/primary";

const DATA = [
  { // every 10,000 km; remind 500 km before
    name: "Oil Change",
    des: "Replace engine oil",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 10000,
    notify_advance_value: 500,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 1 year; remind 7 days before
    name: "Coolant Flush",
    des: "Flush and refill engine coolant",
    recurrence_type: RecurrenceType.TIME,
    recurrence_interval: 365,
    notify_advance_value: 7,
    notify_advance_unit: NotifyAdvanceUnit.DAYS,
  },
  { // every 40,000 km; remind 1,000 km before
    name: "Transmission Fluid Change",
    des: "Replace gearbox/ATF fluid",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 40000,
    notify_advance_value: 1000,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 20,000 km; remind 500 km before
    name: "Brake Pad Replacement",
    des: "Replace worn brake pads",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 20000,
    notify_advance_value: 500,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 2 years; remind 14 days before
    name: "Brake Fluid Replacement",
    des: "Replace hydraulic brake fluid",
    recurrence_type: RecurrenceType.TIME,
    recurrence_interval: 730,
    notify_advance_value: 14,
    notify_advance_unit: NotifyAdvanceUnit.DAYS,
  },
  { // every 10,000 km; remind 500 km before
    name: "Tyre Rotation",
    des: "Rotate tyres for even wear",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 10000,
    notify_advance_value: 500,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 40,000 km; remind 1,000 km before
    name: "Tyre Replacement",
    des: "Replace worn-out tyres",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 40000,
    notify_advance_value: 1000,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 10,000 km; remind 500 km before
    name: "Wheel Alignment & Balancing",
    des: "Alignment and balancing service",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 10000,
    notify_advance_value: 500,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 15,000 km; remind 500 km before
    name: "Air Filter Replacement",
    des: "Replace engine air filter",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 15000,
    notify_advance_value: 500,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
  { // every 1 year; remind 7 days before
    name: "AC Service",
    des: "AC gas & HVAC service",
    recurrence_type: RecurrenceType.TIME,
    recurrence_interval: 365,
    notify_advance_value: 7,
    notify_advance_unit: NotifyAdvanceUnit.DAYS,
  },
  { // every 3,000 km; remind 100 km before
    name: "Vehicle Wash",
    des: "Regular exterior cleaning",
    recurrence_type: RecurrenceType.MILEAGE,
    recurrence_interval: 3000,
    notify_advance_value: 100,
    notify_advance_unit: NotifyAdvanceUnit.KM,
  },
];

export async function seedVehicleReminderTypes(prisma: PrismaClient): Promise<void> {
  console.log("Seeding vehicle_reminder_types...");

  const rows = DATA.map((r) => ({
    name: r.name,
    des: r.des,
    recurrence_type: r.recurrence_type,              // enum
    recurrence_interval: r.recurrence_interval, // BigInt amount
    notify_advance_value: r.notify_advance_value,
    notify_advance_unit: r.notify_advance_unit,      // enum
    is_active: true,
  }));

  await prisma.vehicle_Reminder_Types.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`✅ Inserted/kept ${rows.length} vehicle_reminder_types records`);
}
