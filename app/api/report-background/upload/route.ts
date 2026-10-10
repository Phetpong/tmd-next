import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentAdmin, sameOrigin } from "@/lib/background-server";
import { backgroundStorage, storageConfigured } from "@/lib/background-storage";
import { BACKGROUND_TYPES, MAX_BACKGROUND_BYTES } from "@/lib/background";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const admin = await currentAdmin();
  if (!admin)
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });
  if (!storageConfigured())
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase Storage สำหรับพื้นหลัง" },
      { status: 503 },
    );
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !BACKGROUND_TYPES.includes(body.type) ||
    !Number.isInteger(body.size) ||
    body.size <= 0 ||
    body.size > MAX_BACKGROUND_BYTES
  )
    return NextResponse.json(
      { error: "รองรับ JPG, PNG, WebP ไม่เกิน 10 MB" },
      { status: 400 },
    );
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[body.type as string];
  const path = `pending/${admin.id}/${randomUUID()}.${extension}`;
  const { data, error } = await backgroundStorage().createSignedUploadUrl(path);
  if (error || !data)
    return NextResponse.json(
      { error: "เตรียมพื้นที่อัปโหลดไม่สำเร็จ กรุณาตรวจการตั้งค่า Storage" },
      { status: 503 },
    );
  return NextResponse.json({ path, signedUrl: data.signedUrl });
}
