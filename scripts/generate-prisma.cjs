const { loadEnvConfig } = require('@next/env');
const { spawnSync } = require('node:child_process');
const { writeFileSync, readFileSync } = require('node:fs');
loadEnvConfig(process.cwd());
const postgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
if (process.env.VERCEL && !postgres) {
  console.error('Vercel requires a PostgreSQL DATABASE_URL. SQLite is local-only.');
  process.exit(1);
}
if (process.env.DATABASE_URL && !postgres) {
  console.error('DATABASE_URL must use PostgreSQL. Unset it to use the local SQLite database.');
  process.exit(1);
}
let schema = 'prisma/schema.prisma';
if (!postgres) {
  // Derive the development schema so models cannot drift from production.
  schema = 'prisma/schema.local.prisma';
  const source = readFileSync('prisma/schema.prisma', 'utf8');
  writeFileSync(schema, source.replace(/datasource db \{[\s\S]*?\}/, 'datasource db {\n  provider = "sqlite"\n  url = "file:./dev.db"\n}'));
}
console.log(`Generating Prisma Client for ${postgres ? 'PostgreSQL' : 'local SQLite'}.`);
const result = spawnSync(process.execPath, [require.resolve('prisma'), 'generate', '--schema', schema], { stdio: 'inherit' });
if (result.error) console.error('Unable to start Prisma generation:', result.error.code);
process.exit(result.status ?? 1);
