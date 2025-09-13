#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const clients = [
  'node_modules/@prisma/primary',
  'node_modules/@prisma/address', 
  'node_modules/@prisma/logs'
];

const schemas = [
  'src/database/prisma/primary.prisma',
  'src/database/prisma/address.prisma',
  'src/database/prisma/logs.prisma'
];

function checkAndGenerateClients() {
  let needsGeneration = false;
  
  // Check if any client is missing
  for (const clientPath of clients) {
    if (!fs.existsSync(clientPath)) {
      console.log(`🔄 Missing Prisma client: ${clientPath}`);
      needsGeneration = true;
      break;
    }
  }
  
  // Check if any schema is newer than the client
  if (!needsGeneration) {
    for (let i = 0; i < schemas.length; i++) {
      const schemaPath = schemas[i];
      const clientPath = clients[i];
      
      if (fs.existsSync(schemaPath) && fs.existsSync(clientPath)) {
        const schemaStats = fs.statSync(schemaPath);
        const clientStats = fs.statSync(path.join(clientPath, 'index.js'));
        
        if (schemaStats.mtime > clientStats.mtime) {
          console.log(`🔄 Schema ${schemaPath} is newer than client`);
          needsGeneration = true;
          break;
        }
      }
    }
  }
  
  if (needsGeneration) {
    console.log('🚀 Generating Prisma clients...');
    try {
      execSync('npm run prisma:generate:all', { stdio: 'inherit' });
      console.log('✅ All Prisma clients generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate Prisma clients:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ All Prisma clients are up to date');
  }
}

// Run the check
checkAndGenerateClients();
