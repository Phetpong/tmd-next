const { loadEnvConfig } = require('@next/env');
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');
const { resolve } = require('node:path');
loadEnvConfig(process.cwd());

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Only --apply is supported.');
  const source = new DatabaseSync(resolve('prisma/dev.db'), { readOnly: true });
  let rows;
  try { rows = source.prepare('SELECT date, stationId, value FROM RainfallRecord ORDER BY date, stationId').all(); }
  finally { source.close(); }
  console.log(`SQLite rainfall records: ${rows.length}. User accounts will not be imported.`);
  if (!args.includes('--apply')) {
    console.log('Dry run only. After migrating Supabase and generating its client, use npm run db:import-sqlite -- --apply.'); return;
  }
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '')) throw new Error('Configure the target Supabase DATABASE_URL before applying.');
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async tx => {
      let created = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500).map(r => ({ date: r.date, stationId: r.stationId, value: r.value }));
        created += (await tx.rainfallRecord.createMany({ data: batch, skipDuplicates: true })).count;
      }
      return created;
    }, { timeout: 120000 });
    console.log(`Imported ${result}; skipped ${rows.length - result} existing records. Existing values were not overwritten.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error('Import failed:', error.code || 'Check source database and target configuration.'); process.exitCode = 1; });
