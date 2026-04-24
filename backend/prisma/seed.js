// Seed script stub — filled out in Phase 1.
//
// Phase 1 will insert:
//   - 5 default roles (superadmin, admin, cfo, team_manager, employee)
//     with Arabic display names per MASTER_PLAN §3.
//   - Default module_access rows per role (MASTER_PLAN §4).
//   - ONE SuperAdmin user (username: superadmin, password: 246810@Ad — bcrypt-hashed).
//     Rotate this password after first deployment.
//   - Default settings rows from MASTER_PLAN §3 "Default Settings Seed Data".
//
// Run with: npm run db:seed (delegates to `node prisma/seed.js`)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Phase 0 stub — no data inserted. Phase 1 will populate roles, SuperAdmin, and settings.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
