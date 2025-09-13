import { PrismaClient } from '@prisma/primary';
import { seedDeviceTypes } from './seeds/seed-device-types';
import { seedVehicleTypes } from './seeds/seed-vehicle-type';
import { seedDocumentTypes } from './seeds/seed-document-types';
import { seedEmailTemplates } from './seeds/seed-email-templates';
import { seedCustomCommands } from './seeds/seed-custom-commands';
import { seedCommandTypes } from './seeds/seed-command-types';
import { seedVehicleReminderTypes } from './seeds/seed-vehicle-reminder-types';
import { seedCustomSystemVariables } from './seeds/seed-system-custom-variable';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('🚀 Starting Prisma seed...');

    // Seed device types
    await seedDeviceTypes(prisma);
    await seedVehicleTypes(prisma);
    await seedDocumentTypes(prisma);
    await seedCommandTypes(prisma)
    await seedEmailTemplates(prisma);    
    await seedCustomCommands(prisma);
    await seedVehicleReminderTypes(prisma);
    await seedCustomSystemVariables(prisma);

    console.log('✅ Prisma seed completed successfully');
  } catch (error: any) {
    console.error('❌ Prisma seed failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute when run via `ts-node prisma/seed.ts` or `prisma db seed`
main();
