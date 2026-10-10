// Run after setting SUPABASE_URL and a server-only secret key.
require("@next/env").loadEnvConfig(process.cwd());
const { createClient } = require("@supabase/supabase-js");
(async () => {
  const url = process.env.SUPABASE_URL,
    key =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env first.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const id = "report-backgrounds-v2";
  const options = {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  };
  const existing = await client.storage.getBucket(id);
  const result = existing.data
    ? await client.storage.updateBucket(id, options)
    : await client.storage.createBucket(id, options);
  if (result.error)
    throw new Error(
      "Storage setup failed. Check project URL and secret key permissions.",
    );
  const verify = await client.storage.getBucket(id);
  if (verify.error || verify.data.public)
    throw new Error("Storage verification failed.");
  console.log(
    "Private background bucket ready; 10 MB maximum, JPEG/PNG/WebP only.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
