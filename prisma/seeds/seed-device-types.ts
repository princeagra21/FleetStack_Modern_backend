// prisma/seeds/seed-device-types.ts
// Run directly: npx ts-node prisma\seeds\seed-device-types.ts
// Or via orchestrator: npx prisma db seed

import { PrismaClient } from "@prisma/primary";

const toInt = (s?: string | null) => {
  const v = (s ?? "").trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toStr = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v.length ? v : null;
};

type Row = { deviceType: string; manufacture: string | null; portNo: string | null; protocol: string | null; firmwareVersion?: string | null };

const rows: Row[] = [
  { deviceType: 'GT06', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'JV200', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'WETRECK', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' }, // WeTrack
  { deviceType: 'GT300', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'JM09', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'LT05', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'L100', manufacture: 'Concox', portNo: '5093', protocol: 'watch' },   // watch-class devices often 5093
  { deviceType: 'FMB120', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'TK-905', manufacture: 'Coban', portNo: '5013', protocol: 'h02' },
  { deviceType: 'TK915', manufacture: 'Coban', portNo: '5013', protocol: 'h02' },
  { deviceType: 'ET300', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'BW08', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'RP06', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'TK103', manufacture: 'Coban', portNo: '5002', protocol: 'tk103' },
  { deviceType: 'AIS140', manufacture: '—', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'G800', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'TR02', manufacture: 'Meitrack', portNo: '5022', protocol: 'meitrack' },
  { deviceType: 'GPS-103', manufacture: 'Coban', portNo: '5002', protocol: 'tk103' },
  { deviceType: 'TK-100', manufacture: 'Coban', portNo: '5013', protocol: 'h02' },
  // Queclink GB100 -> queclink/5020 (your 5004 was a Meiligao port)
  { deviceType: 'GB100', manufacture: 'Queclink', portNo: '5020', protocol: 'queclink' },
  { deviceType: 'AT06', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT09', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'Cantrack-G05', manufacture: 'Cantrack', portNo: '5013', protocol: 'h02' },
  { deviceType: 'TR06', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'OBD189', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'FM1120', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'FMB920', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'Personal', manufacture: 'Concox', portNo: '5028', protocol: 'tkstar', firmwareVersion: '' }, // generic personal; protocol varies
  { deviceType: 'ZoomBox', manufacture: 'Concox', portNo: '5028', protocol: 'tkstar', firmwareVersion: '' },
  { deviceType: 'E-Track', manufacture: 'Concox', portNo: '5031', protocol: 'eview' },
  { deviceType: 'FM-Pro3-R', manufacture: 'Meitrack', portNo: '5022', protocol: 'meitrack' },
  { deviceType: 'A9', manufacture: '—', portNo: '5023', protocol: 'gt06', firmwareVersion: '' },
  { deviceType: 'iTrackPro', manufacture: 'iTrack', portNo: '5061', protocol: 'itrack' },
  { deviceType: 'MiniFinder Pico', manufacture: 'MiniFinder', portNo: '5062', protocol: 'minifinder' },
  { deviceType: 'GT-30', manufacture: 'Meiligao', portNo: '5131', protocol: 'gt30' },
  { deviceType: 'MM101A', manufacture: '—', portNo: '5176', protocol: 'tzone', firmwareVersion: '' },
  { deviceType: 'ITS', manufacture: '—', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'Watch', manufacture: '—', portNo: '5093', protocol: 'watch' },
  { deviceType: 'JT701', manufacture: 'Jointech', portNo: '5014', protocol: 'jt600' }, // sometimes 5013; verify on 5001 if unsure
  { deviceType: 'RP05', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'RP10', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'GB101', manufacture: 'Queclink', portNo: '5020', protocol: 'queclink' },
  // (Removed duplicate MM101A)
  { deviceType: 'We Track2', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'GT06E', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'GT06N', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'OB22', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'HVT001', manufacture: '—', portNo: '5023', protocol: 'gt06', firmwareVersion: '' },
  { deviceType: 'X3', manufacture: '—', portNo: '5093', protocol: 'watch', firmwareVersion: '' },
  { deviceType: 'GT08', manufacture: '—', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'ET25', manufacture: '—', portNo: '5023', protocol: 'gt06', firmwareVersion: '' },
  { deviceType: 'GT800', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'QBIT', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'Q2', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'GK309E', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'GK310', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT1', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT2', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT3', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT4', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AT6', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'B6XW01', manufacture: '—', portNo: '5023', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'FMB125', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'B8J801', manufacture: '—', portNo: '5023', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'FMB202', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'TMT250', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: '84A500', manufacture: '—', portNo: '5023', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'FMB001', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'A1LY01-1', manufacture: '—', portNo: '5023', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'FMB3001', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'LT05+', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AV06', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'Autocop', manufacture: 'Autocop', portNo: '5023', protocol: 'gt06' }, // many are Concox-based
  { deviceType: 'ZIPCON AIS 140', manufacture: 'Zipcon', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'Aquila-AIS140', manufacture: 'iTriangle', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'SIEWI', manufacture: 'Srishti Wireless Solution', portNo: '5135', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'FMB010', manufacture: 'Teltonika', portNo: '5027', protocol: 'teltonika' },
  { deviceType: 'TS101', manufacture: 'iTriangle', portNo: '5089', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'GT02D', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'Z1', manufacture: 'Volty', portNo: '5209', protocol: 'NEEDS_VERIFY' }, // Traccar forum suggests not officially supported
  { deviceType: 'EV02', manufacture: 'Wanway', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'RAIS (AIS140)', manufacture: '—', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'GS07 (Basic Tracker)', manufacture: '—', portNo: '5221', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'GS07H', manufacture: '—', portNo: '5221', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'SATCOP', manufacture: 'Satcop', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'Revit AIS 140', manufacture: 'Revit / Concox OEM', portNo: '5179', protocol: 'ais140' },
  { deviceType: 'AK1000', manufacture: 'Akhilesh', portNo: '5023', protocol: 'NEEDS_VERIFY' },
  { deviceType: 'SEEWORLD R11', manufacture: 'Seeworld', portNo: '5015', protocol: 'huabao', firmwareVersion: '' }, // many JT808/Huabao
  { deviceType: 'MAGNETIC DEVICE', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'V5', manufacture: 'Concox', portNo: '5023', protocol: 'gt06' },
  { deviceType: 'AK1001-LT', manufacture: 'AKLT', portNo: '5023', protocol: 'NEEDS_VERIFY' },
];

export async function seedDeviceTypes(prisma: PrismaClient) {
  // Idempotent seeding without requiring a unique index
  for (const r of rows) {
    const name = r.deviceType.trim();
    const data = {
      name,
      manufacturer: toStr(r.manufacture),
      port: toInt(r.portNo) ?? 0, // fallback to 0 when port not provided
      protocol: null as string | null,
      firmware_version: null as string | null,
    };

    const existing = await prisma.device_Type.findFirst({ where: { name } });
    if (existing) {
      await prisma.device_Type.update({ where: { id: existing.id }, data });
    } else {
      await prisma.device_Type.create({ data });
    }
  }
  console.log("Device types seeded (idempotent).");
}

// Allow running this file directly for ad-hoc seeding
if (require.main === module) {
  const prisma = new PrismaClient();
  seedDeviceTypes(prisma)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
