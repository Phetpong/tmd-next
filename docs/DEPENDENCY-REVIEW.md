# Dependency review (2026-10-14)

- Node is constrained to `24.x`, matching CI and preventing automatic major upgrades on Vercel.
- Vercel Web Analytics 2.0.1 is installed in the root layout alongside Speed Insights. Enable Web Analytics in the Vercel dashboard if it is not already enabled; view traffic for the v3 Preview deployment until v3 is promoted to production.
- Install scripts are approved only for pinned installed versions of Prisma client, Prisma engines, Prisma, and unrs-resolver (native resolver preparation).
- `npm audit --omit=dev` reports zero known vulnerabilities. Full audit still reports five high-severity dependency entries from one unpatched braces advisory, GHSA-vfj7-8cjw-p6xm, through the Next ESLint plugin. These tools consume repository-controlled patterns; do not pass untrusted patterns into them. Recheck when upstream publishes a fix.
- Do not use `npm audit fix --force`: its proposed eslint-config-next downgrade to 14.2.35 does not match Next 16.4.0.
- ESLint 9 is deprecated, but the current eslint-plugin-react peer range does not support ESLint 10. Keep the compatible toolchain until upstream support is available, rather than forcing incompatible peers.
- Prisma's suggested 8.0.0-rc.22 upgrade is not part of this change. A major database-client migration requires separate compatibility testing.
- No repository setting defines `cache-dir`. The warning is from the deployment's npm environment; inspect/remove `npm_config_cache_dir` in Vercel if user-defined, or use the supported `npm_config_cache` setting. Do not hide all npm warnings.
