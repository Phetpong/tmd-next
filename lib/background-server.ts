import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BACKGROUND } from "@/lib/background";
export async function currentAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  // Recheck the database so revoking an admin takes effect immediately.
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  return user?.role === "admin" ? user : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
export async function reportBackground() {
  const record = await prisma.reportAppearance.findUnique({
    where: { id: "default" },
  });
  if (!record) return DEFAULT_BACKGROUND;
  return {
    ...record,
    url: record.path
      ? `/api/report-background/image?v=${record.revision}`
      : DEFAULT_BACKGROUND.url,
  };
}
