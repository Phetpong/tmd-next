const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) {
    console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters) before seeding.');
    process.exitCode = 1; return;
  }
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log('Account already exists; password and role were not changed.'); return;
  }
  await prisma.user.create({ data: { username, password: await bcrypt.hash(password, 12), role: 'admin' } });
  console.log('Administrator created. Credentials are not logged.');
}
main().catch(error => { console.error('Unable to create administrator:', error.code || 'Check database configuration.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
