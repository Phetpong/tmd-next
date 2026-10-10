export type ReportBackground = {
  path: string | null;
  url: string;
  positionX: number;
  positionY: number;
  wash: number;
  revision: number;
};
export const DEFAULT_BACKGROUND: ReportBackground = {
  path: null,
  url: "/bg-beautiful.jpg",
  positionX: 50,
  positionY: 50,
  wash: 0,
  revision: 0,
};
export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;
export const BACKGROUND_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validBackgroundControls(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["positionX", "positionY", "wash"].every(
    (key) =>
      typeof v[key] === "number" &&
      Number.isFinite(v[key]) &&
      v[key] >= 0 &&
      v[key] <= 100,
  );
}
