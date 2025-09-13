import { PrismaClient } from "@prisma/primary";

const toStr = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v.length ? v : null;
};

// name → slug (lowercase, hyphenated, no special chars)
const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Row = { name: string };

// Curated, deduped, globally useful list
const rows: Row[] = [
  // Passenger & Light
  { name: "Car" },
  { name: "Hatchback" },
  { name: "Sedan" },
  { name: "SUV" },
  { name: "Crossover" },
  { name: "Coupe" },
  { name: "Convertible" },
  { name: "Pickup" },
  { name: "Van" },
  { name: "Minivan" },
  { name: "Taxi" },
  { name: "Rideshare" },

  // Two/Three Wheelers
  { name: "Motorcycle" },
  { name: "Scooter" },
  { name: "Moped" },
  { name: "E-Bike" },
  { name: "E-Scooter" },
  { name: "Auto Rickshaw" },
  { name: "Three Wheeler" },

  // Light & Medium Commercial
  { name: "LCV" },
  { name: "Panel Van" },
  { name: "Box Truck (Light)" },
  { name: "Flatbed (Light)" },
  { name: "Refrigerated Van" },

  // Heavy Commercial / Freight
  { name: "Truck" },
  { name: "Lorry" },
  { name: "HCV" },
  { name: "Prime Mover / Tractor Unit" },
  { name: "Semi-Trailer Truck" },
  { name: "Container Truck" },
  { name: "Car Carrier (Truck)" },
  { name: "Tipper / Dumper" },
  { name: "Mixer Truck (Concrete)" },
  { name: "Tanker Truck (Fuel)" },
  { name: "Tanker Truck (Water)" },
  { name: "Tanker Truck (Chemicals)" },
  { name: "Refrigerated Truck" },
  { name: "Bulk Carrier (Dry Bulk)" },
  { name: "Dump Truck" },

  // Buses
  { name: "Bus" },
  { name: "Mini Bus" },
  { name: "City Bus" },
  { name: "Coach" },
  { name: "School Bus" },

  // Emergency & Municipal
  { name: "Ambulance" },
  { name: "Fire Truck" },
  { name: "Police Vehicle" },
  { name: "Garbage Truck / Refuse Compactor" },
  { name: "Street Sweeper" },
  { name: "Vacuum Tanker / Sewer Cleaning" },
  { name: "Road Maintenance / Paver" },
  { name: "Snowplow" },

  // Construction & Heavy Equipment
  { name: "Bulldozer" },
  { name: "Excavator" },
  { name: "Backhoe Loader" },
  { name: "Wheel Loader" },
  { name: "Motor Grader" },
  { name: "Skid-Steer" },
  { name: "Compactor / Road Roller" },
  { name: "Asphalt Paver" },
  { name: "Concrete Pump (Truck-mounted)" },
  { name: "Crane Truck" },
  { name: "Aerial Work Platform / Cherry Picker" },
  { name: "Scissor Lift" },
  { name: "Articulated Dump Truck" },
  { name: "Mining Haul Truck" },

  // Agriculture
  { name: "Agricultural Tractor" },
  { name: "Combine Harvester" },
  { name: "Forage Harvester" },
  { name: "Sprayer" },
  { name: "Baler" },

  // Yard & Terminal
  { name: "Forklift" },
  { name: "Telehandler" },
  { name: "Reach Stacker" },
  { name: "Container Handler" },
  { name: "Yard Tractor / Terminal Tractor" },

  // Trailers (towables)
  { name: "Trailer (Dry Van)" },
  { name: "Trailer (Reefer)" },
  { name: "Trailer (Container / Skeletal)" },
  { name: "Trailer (Flatbed)" },
  { name: "Trailer (Lowboy)" },
  { name: "Trailer (Step Deck)" },
  { name: "Trailer (Dump)" },
  { name: "Trailer (Tanker)" },
  { name: "Trailer (Car Hauler)" },
  { name: "Trailer (Dolly)" },

  // Rail
  { name: "Locomotive" },
  { name: "Railcar / Wagon" },

  // Marine
  { name: "Boat" },
  { name: "Barge" },
  { name: "Ship" },

  // Aviation
  { name: "Aircraft" },
  { name: "Helicopter" },
  { name: "Drone (UAV)" },

  // Recreation & Utility
  { name: "ATV" },
  { name: "UTV / Utility Vehicle" },
  { name: "Golf Cart" },
  { name: "Snowmobile" },

  // Specialized / Security
  { name: "Cash Van / Armored" },
  { name: "Hazmat Transport" },

  // Micromobility & Others
  { name: "Bicycle" },
];

export async function seedVehicleTypes(prisma: PrismaClient) {
  // Idempotent seeding similar to your device seeder (findFirst + update/create).
  for (const r of rows) {
    const name = r.name.trim();
    const slug = toSlug(name);

    const data = {
      name,
      slug,
    };

    const existing = await prisma.vehicleType.findFirst({ where: { name } });
    if (existing) {
      await prisma.vehicleType.update({ where: { id: existing.id }, data });
    } else {
      await prisma.vehicleType.create({ data });
    }
  }
  console.log("Vehicle types seeded (idempotent).");
}

// Allow running this file directly for ad-hoc seeding
if (require.main === module) {
  const prisma = new PrismaClient();
  seedVehicleTypes(prisma)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
