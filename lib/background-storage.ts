import { createClient } from "@supabase/supabase-js";
export const BACKGROUND_BUCKET = "report-backgrounds-v2";
export function backgroundStorage() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("ยังไม่ได้ตั้งค่า Supabase Storage สำหรับพื้นหลัง");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(BACKGROUND_BUCKET);
}
export function storageConfigured() {
  return !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
