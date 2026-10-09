const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const errors = [];
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  try {
    const url = new URL(process.env[key]);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.password || /PROJECT_REF|PASSWORD|POOLER_HOST/.test(process.env[key])) throw new Error();
    if (url.searchParams.get('sslmode') !== 'require') errors.push(`${key} must include sslmode=require.`);
    if (key === 'DIRECT_URL' && url.port === '6543') errors.push('DIRECT_URL must use a direct or session-mode connection, not transaction mode.');
    if (key === 'DATABASE_URL' && url.port === '6543' && url.searchParams.get('pgbouncer') !== 'true') errors.push('DATABASE_URL must include pgbouncer=true for the transaction pooler.');
  } catch { errors.push(`${key} is missing or is not a configured PostgreSQL connection string.`); }
}
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) errors.push('NEXTAUTH_SECRET must contain at least 32 characters.');
try {
  const url = new URL(process.env.NEXTAUTH_URL);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.pathname !== '/') throw new Error();
} catch { errors.push('NEXTAUTH_URL must be the HTTPS origin of this deployment.'); }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Deployment environment is configured (secret values are not displayed).');
