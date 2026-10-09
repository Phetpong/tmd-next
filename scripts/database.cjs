const { loadEnvConfig } = require('@next/env');
const { spawnSync } = require('node:child_process');
loadEnvConfig(process.cwd());
function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const args = process.argv.slice(2);
if (args[0] === 'local') {
  if (process.env.DATABASE_URL || process.env.VERCEL) {
    console.error('Local initialization requires DATABASE_URL to be unset and cannot run on Vercel.'); process.exit(1);
  }
  run(['scripts/generate-prisma.cjs']);
  run([require.resolve('prisma'), 'db', 'push', '--schema', 'prisma/schema.local.prisma']);
} else {
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '') || !/^postgres(ql)?:\/\//.test(process.env.DIRECT_URL || '')) {
    console.error('Configure DATABASE_URL and DIRECT_URL for the target Supabase project first.'); process.exit(1);
  }
  if (args[0] !== 'migrate' || !['deploy', 'status'].includes(args[1]) || args.length !== 2) {
    console.error('Supported commands: local, migrate deploy, migrate status.'); process.exit(1);
  }
  run([require.resolve('prisma'), ...args, '--schema', 'prisma/schema.prisma']);
}
