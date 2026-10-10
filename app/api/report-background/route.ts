import { NextResponse } from "next/server";
import { prepareBackgroundImage } from "@/lib/background-image";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  BACKGROUND_TYPES,
  MAX_BACKGROUND_BYTES,
  validBackgroundControls,
} from "@/lib/background";
import { backgroundStorage, storageConfigured } from "@/lib/background-storage";
import {
  currentAdmin,
  reportBackground,
  sameOrigin,
} from "@/lib/background-server";
export const maxDuration = 60;
async function discardUpload(path: string) {
  try {
    await backgroundStorage().remove([path]);
  } catch {
    // A cleanup failure must not undo a saved setting or hide the original error.
  }
}
export async function GET() {
  try {
    return NextResponse.json(
      { background: await reportBackground(), configured: storageConfigured() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "โหลดการตั้งค่าพื้นหลังไม่สำเร็จ กรุณาตรวจการอัปเดตฐานข้อมูล" },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const admin = await currentAdmin();
  if (!admin)
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const controlsValid = validBackgroundControls(body);
  if (
    !body ||
    !controlsValid ||
    !Number.isInteger(body.revision) ||
    body.revision < 0 ||
    (body.reset !== undefined && typeof body.reset !== "boolean") ||
    (body.reset === true && body.uploadPath)
  )
    return NextResponse.json(
      { error: "การตั้งค่าไม่ถูกต้อง" },
      { status: 400 },
    );
  const controls = {
    positionX: Math.round(body.positionX),
    positionY: Math.round(body.positionY),
    wash: Math.round(body.wash),
  };
  let newPath: string | null = null;
  let temporary: string | null = null;
  let committed = false;
  try {
    const previous = await reportBackground();
    if (previous.revision !== body.revision)
      return NextResponse.json(
        { error: "มีแอดมินเปลี่ยนพื้นหลังแล้ว กรุณาโหลดหน้าใหม่" },
        { status: 409 },
      );
    if (body.uploadPath) {
      if (
        typeof body.uploadPath !== "string" ||
        !new RegExp(
          `^pending/${admin.id}/[a-f0-9-]{36}\\.(jpg|png|webp)$`,
        ).test(body.uploadPath)
      )
        return NextResponse.json(
          { error: "ไฟล์อัปโหลดไม่ถูกต้อง" },
          { status: 400 },
        );
      temporary = body.uploadPath;
      const storage = backgroundStorage();
      const { data, error } = await storage.download(temporary!);
      if (error || !data)
        throw new Error("อ่านไฟล์อัปโหลดไม่ได้ กรุณาเลือกภาพอีกครั้ง");
      if (
        data.size > MAX_BACKGROUND_BYTES ||
        !BACKGROUND_TYPES.includes(data.type)
      )
        throw new Error("รองรับ JPG, PNG, WebP ไม่เกิน 10 MB");
      const input = Buffer.from(await data.arrayBuffer());
      // Decode and re-encode; never publish the unvalidated original.
      const output = await prepareBackgroundImage(input);
      newPath = `published/${randomUUID()}.webp`;
      const uploaded = await storage.upload(newPath, output, {
        contentType: "image/webp",
        upsert: false,
      });
      if (uploaded.error) throw new Error("บันทึกภาพไม่สำเร็จ");
    }
    const path = body.reset === true ? null : newPath || previous.path;
    const saved = await prisma.$transaction(async (tx) => {
      await tx.reportAppearance.upsert({
        where: { id: "default" },
        create: { id: "default" },
        update: {},
      });
      return tx.reportAppearance.updateMany({
        where: { id: "default", revision: body.revision },
        data: { path, ...controls, revision: { increment: 1 } },
      });
    });
    if (!saved.count) {
      if (newPath) await discardUpload(newPath);
      return NextResponse.json(
        { error: "มีแอดมินเปลี่ยนพื้นหลังแล้ว กรุณาโหลดหน้าใหม่" },
        { status: 409 },
      );
    }
    committed = true;
    return NextResponse.json({ background: await reportBackground() });
  } catch (error) {
    if (newPath && !committed) await discardUpload(newPath);
    // Return only controlled messages; never provider errors or credentials.
    const message =
      error instanceof Error &&
      /^(ยังไม่ได้|อ่านไฟล์|รองรับ|รูปภาพ|บันทึกภาพ)/.test(error.message)
        ? error.message
        : "บันทึกพื้นหลังไม่สำเร็จ กรุณาลองใหม่";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    if (temporary) await discardUpload(temporary);
  }
}
