export const STATIONS = [
  {
    id: "kpt",
    name: "เมืองกำแพงเพชร",
    district: "เมืองกำแพงเพชร",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-forest",
    name: "คลองลาน",
    district: "คลองลาน",
    isMain: true,
    offsetX: 0,
    offsetY: -10,
  },
  {
    id: "kpt-khlong-khlung",
    name: "คลองขลุง",
    district: "คลองขลุง",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-pabong",
    name: "พรานกระต่าย",
    district: "พรานกระต่าย",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-bueng-samakkhi",
    name: "บึงสามัคคี",
    district: "บึงสามัคคี",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-pang-sila-thong",
    name: "ปางศิลาทอง",
    district: "ปางศิลาทอง",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-khanu",
    name: "ขาณุวรลักษบุรี",
    district: "ขาณุวรลักษบุรี",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-lan-krabue",
    name: "ลานกระบือ",
    district: "ลานกระบือ",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-sai-ngam",
    name: "ไทรงาม",
    district: "ไทรงาม",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-kosamphi",
    name: "โกสัมพีนคร",
    district: "โกสัมพีนคร",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: "kpt-thung-sai",
    name: "ทรายทองวัฒนา",
    district: "ทรายทองวัฒนา",
    isMain: true,
    offsetX: 0,
    offsetY: 0,
  },
  // New points from the supplied reference. Existing main-point offsets stay unchanged.
  {
    id: "kpt-tha-phutsa",
    name: "บ้านท่าพุทรา",
    district: "โกสัมพีนคร",
    isMain: false,
    offsetX: -65,
    offsetY: 70,
  },
  {
    id: "kpt-thung-pho",
    name: "นิคมสร้างตนเองทุ่งโพธิ์ทะเล",
    district: "เมืองกำแพงเพชร",
    isMain: false,
    offsetX: 40,
    offsetY: -82,
  },
  {
    id: "kpt-mod-daeng",
    name: "อ่างคลองมดแดง",
    district: "คลองลาน",
    isMain: false,
    offsetX: -65,
    offsetY: -90,
  },
  {
    id: "kpt-khlong-khayaeng",
    name: "บ้านคลองแขยง",
    district: "คลองลาน",
    isMain: false,
    offsetX: 65,
    offsetY: -90,
  },
  {
    id: "kpt-plaeng-si",
    name: "บ้านแปลงสี่",
    district: "คลองลาน",
    isMain: false,
    offsetX: 40,
    offsetY: 65,
  },
];

export const RAIN_BANDS = [
  {
    max: 0,
    color: "#ffffff",
    label: "0.0 มม.",
    description: "ฝนวัดปริมาณไม่ได้",
  },
  {
    max: 10,
    color: "#00cc33",
    label: "0.1 – 10.0 มม.",
    description: "ฝนเล็กน้อย",
  },
  {
    max: 35,
    color: "#ffff00",
    label: "10.1 – 35.0 มม.",
    description: "ฝนปานกลาง",
  },
  {
    max: 90,
    color: "#ffa500",
    label: "35.1 – 90.0 มม.",
    description: "ฝนหนัก",
  },
  {
    max: Infinity,
    color: "#ff0000",
    label: "90.1 มม. ขึ้นไป",
    description: "ฝนหนักมาก",
  },
];
export type RainData = Record<string, string>;
export const emptyData = (): RainData =>
  Object.fromEntries(STATIONS.map((s) => [s.id, ""]));
export function numericRain(value: unknown): number | null {
  return typeof value === "string" &&
    /^\d+(\.\d)?$/.test(value) &&
    Number.isFinite(Number(value)) &&
    Number(value) <= Number.MAX_SAFE_INTEGER / 10
    ? Number(value)
    : null;
}
export function validValue(value: unknown): value is string {
  return (
    value === "" ||
    value === "-" ||
    value === "broken" ||
    numericRain(value) !== null
  );
}
export function rainColor(value: unknown) {
  const n = numericRain(value);
  return n === null ? "#999999" : RAIN_BANDS.find((b) => n <= b.max)!.color;
}
// Choose the higher-contrast text color, including on bright red and yellow.
export function rainTextColor(background: string) {
  const channels = background.match(/[a-f\d]{2}/gi)!.map((hex) => {
    const value = parseInt(hex, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
}
export function rainLabel(value: unknown) {
  const n = numericRain(value);
  return n !== null ? n.toFixed(1) : "—";
}
export function validDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(date + "T12:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}
export function bangkokDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function thaiDate(date: string) {
  return new Date(date + "T12:00:00+07:00").toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
