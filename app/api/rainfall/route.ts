import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { STATIONS, validDate, validValue, numericRain } from "@/lib/rainfall";
import { createHash } from "node:crypto";

function revision(
  records: { stationId: string; value: string; updatedAt: Date }[],
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        records
          .map((r) => [r.stationId, r.value, r.updatedAt.toISOString()])
          .sort((a, b) => a[0].localeCompare(b[0])),
      ),
    )
    .digest("hex");
}

// GET: Fetch rainfall data for a specific date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!validDate(date)) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 },
      );
    }

    const records = await prisma.rainfallRecord.findMany({
      where: { date },
    });

    // Format into a dictionary: { [stationId]: value }
    const data: Record<string, string> = {};
    records.forEach((record) => {
      data[record.stationId] = record.value;
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Report-Revision": revision(records),
      },
    });
  } catch {
    console.error("Failed to fetch rainfall data");
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

// POST: Save rainfall data for a specific date
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์แก้ไขข้อมูล" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    const { date, data, expectedRevision } = body;

    if (
      !validDate(date) ||
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).length === 0
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (
      Object.entries(data).some(
        ([id, value]) =>
          !STATIONS.some((s) => s.id === id) || !validValue(value),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "กรุณาตรวจสถานีและค่าฝน ต้องเป็นตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 1 ตำแหน่ง",
        },
        { status: 400 },
      );
    }
    if (typeof expectedRevision !== "string")
      return NextResponse.json(
        { error: "กรุณาโหลดรายงานใหม่ก่อนบันทึก" },
        { status: 400 },
      );

    const nextRevision = await prisma.$transaction(async (tx) => {
      const existing = await tx.rainfallRecord.findMany({ where: { date } });
      if (revision(existing) !== expectedRevision) return null;
      for (const [stationId, value] of Object.entries(data)) {
        const n = numericRain(value);
        const val = n === null ? (value as string) : n.toFixed(1);
        await tx.rainfallRecord.upsert({
          where: {
            date_stationId: {
              date,
              stationId,
            },
          },
          update: {
            value: val,
          },
          create: {
            date,
            stationId,
            value: val,
          },
        });
      }
      return revision(await tx.rainfallRecord.findMany({ where: { date } }));
    }, { isolationLevel: "Serializable", timeout: 15000 });
    if (nextRevision === null)
      return NextResponse.json(
        { error: "มีผู้แก้ไขรายงานนี้แล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก" },
        { status: 409 },
      );

    return NextResponse.json({ success: true, revision: nextRevision });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "???????????????????????? ???????????????????????????????" }, { status: 409 });
    }
    console.error("Failed to save rainfall data");
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
