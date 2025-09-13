import { PrismaClient } from '@prisma/primary';
import { publicIpv4 } from 'public-ip';

export async function seedCustomSystemVariables(prisma: PrismaClient): Promise<void> {
  console.log('Seeding custom_system_variables...');

  // Dynamically fetch system’s public IP
  let systemIp = '127.0.0.1';
  try {
    systemIp = (await publicIpv4()) || systemIp;
  } catch (err) {
    console.warn('⚠️ Could not fetch public IP, using fallback 127.0.0.1');
  }

  const DATA = [
    {
      name: 'Device_host_ip',
      initial_value: systemIp,
    },
  ];

  await prisma.custom_System_Variable.createMany({
    data: DATA,
    skipDuplicates: true, // ✅ no duplicate insert if name exists
  });

  console.log(`✅ Inserted (or skipped existing) ${DATA.length} custom_system_variables records`);
}
