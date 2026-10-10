import { reportBackground } from "@/lib/background-server";
import { backgroundStorage } from "@/lib/background-storage";
export async function GET(request: Request) {
  try {
    const appearance = await reportBackground();
    if (!appearance.path)
      return Response.redirect(new URL("/bg-beautiful.jpg", request.url));
    const { data, error } = await backgroundStorage().download(appearance.path);
    if (error || !data) throw new Error("missing");
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.redirect(new URL("/bg-beautiful.jpg", request.url));
  }
}
