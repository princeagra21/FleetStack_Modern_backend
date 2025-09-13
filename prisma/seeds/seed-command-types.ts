// prisma/seeds/seed-command-types.ts
import { PrismaClient } from "@prisma/primary";

type Row = { name: string; des?: string | null };

const toStr = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v.length ? v : null;
};

const rows: Row[] = [
  { name: "Status", des: "Query device status / info / firmware" },
  { name: "Position Single", des: "Request one-time GPS position (positionSingle)" },
  { name: "Position Periodic Start", des: "Start periodic reporting (positionPeriodic)" },
  { name: "Position Periodic Stop", des: "Stop periodic reporting (positionStop)" },
  { name: "Set Reporting Interval", des: "Set fix/upload/report intervals; aka Timer" },
  { name: "Set Heartbeat Interval", des: "Set heartbeat/keepalive interval" },
  { name: "Set Timezone", des: "Configure device timezone offset" },
  { name: "Sync Time", des: "Sync device time with server (NTP/GPS)" },
  { name: "Set APN", des: "APN/APN user/APN password configuration" },
  { name: "Set Server", des: "Server host and port; primary/backup" },
  { name: "Set DNS", des: "Configure DNS server(s)" },
  { name: "Set GPRS/SMS Mode", des: "Switch transport: GPRS <-> SMS" },
  { name: "Set Data Protocol", des: "Choose protocol variant (e.g., JT808/GT06 vendor mode)" },
  { name: "Engine Stop", des: "Immobilize vehicle (relay off)" },
  { name: "Engine Resume", des: "Mobilize vehicle (relay on)" },
  { name: "Output Control", des: "Set digital output ON/OFF (e.g., siren, buzzer)" },
  { name: "Door Lock", des: "Lock vehicle doors (if supported)" },
  { name: "Door Unlock", des: "Unlock vehicle doors (if supported)" },
  { name: "Alarm Arm", des: "Enable security alarms" },
  { name: "Alarm Disarm", des: "Disable security alarms" },
  { name: "Movement Alarm", des: "Enable/disable movement alarm" },
  { name: "Vibration Alarm", des: "Enable/disable shock/vibration alarm" },
  { name: "Overspeed Alarm", des: "Set speed limit / overspeed alarm threshold" },
  { name: "Geo-fence Add", des: "Create/assign geo-fence (circle/polygon)" },
  { name: "Geo-fence Delete", des: "Remove geo-fence" },
  { name: "Panic Acknowledge", des: "Acknowledge SOS/Panic event" },
  { name: "Reboot Device", des: "Soft reboot / restart" },
  { name: "Power Off", des: "Power down device (if supported)" },
  { name: "Factory Reset", des: "Reset to defaults" },
  { name: "Sleep Mode On", des: "Enable sleep/low power mode" },
  { name: "Sleep Mode Off", des: "Disable sleep/low power mode" },
  { name: "LED Control", des: "Enable/disable LED indicators" },
  { name: "Buzzer Control", des: "Enable/disable buzzer/beeper" },
  { name: "Set SOS Number", des: "Configure SOS/emergency numbers" },
  { name: "Clear SOS Number", des: "Clear SOS numbers" },
  { name: "Set Authorized Numbers", des: "Whitelist numbers allowed to control device" },
  { name: "Set Odometer", des: "Initialize/adjust odometer value" },
  { name: "Reset Mileage", des: "Reset trip mileage counter" },
  { name: "Fuel Calibration", des: "Calibrate analog/digital fuel sensor" },
  { name: "Temperature Calibration", des: "Calibrate temperature probe(s)" },
  { name: "Harsh Driving Thresholds", des: "Set accel/brake/turn sensitivity" },
  { name: "Request Photo", des: "Take snapshot / request image" },
  { name: "Start Video", des: "Start video stream/recording" },
  { name: "Stop Video", des: "Stop video stream/recording" },
  { name: "Request DTC", des: "Read OBD diagnostic trouble codes" },
  { name: "Clear DTC", des: "Clear OBD diagnostic trouble codes" },
  { name: "Set PID Poll Interval", des: "OBD/CAN PID polling rate" },
  { name: "Enable CANBus", des: "Enable CAN/J1939/J1708 data capture" },
  { name: "Bind BLE Beacon", des: "Pair BLE tag / beacon" },
  { name: "Unbind BLE Beacon", des: "Unpair BLE tag / beacon" },
  { name: "RFID Whitelist", des: "Manage allowed RFID/Driver IDs" },
  { name: "FOTA Set URL", des: "Configure firmware/asset URL" },
  { name: "FOTA Start", des: "Start firmware update" },
  { name: "Upload Logs", des: "Upload diagnostic logs" },
  { name: "Voice Monitor", des: "One-way audio monitor / listen-in" },
  { name: "Send USSD", des: "Send USSD code via modem" },
  { name: "Send SMS", des: "Send outbound SMS via device SIM" },
  { name: "LBS/Wi-Fi Scan", des: "Toggle LBS/Wi-Fi scan for hybrid positioning" },
  { name: "A-GPS Assist", des: "Download A-GPS assistance data" },
];

export async function seedCommandTypes(prisma: PrismaClient) {
  for (const r of rows) {
    await prisma.commandType.upsert({
      where: { name: r.name },
      update: { des: toStr(r.des) },
      create: { name: r.name, des: toStr(r.des) },
    });
  }
  console.log("Command types seeded.");
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCommandTypes(prisma)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
