import areas from "@/lib/report-map.json";
import {
  STATIONS,
  rainColor,
  rainTextColor,
  rainLabel,
  type RainData,
} from "@/lib/rainfall";

export default function ReportMap({ data }: { data: RainData }) {
  return (
    <svg
      viewBox="45 70 1395 1395"
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label="แผนที่ปริมาณน้ำฝน 16 พื้นที่รายงาน จังหวัดกำแพงเพชร"
    >
      {areas.map((area) => (
        <path
          key={`edge-${area.id}`}
          d={area.d}
          fill="#203d37"
          stroke="#203d37"
          strokeWidth={8}
          strokeLinejoin="round"
          aria-hidden="true"
        />
      ))}
      {areas.map((area) => (
        <path
          key={area.id}
          data-region={area.id}
          d={area.d}
          fill={rainColor(data[area.id])}
          stroke="#203d37"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      {areas.map((area) => {
        const station = STATIONS.find((s) => s.id === area.id)!;
        const callout =
          area.id === "kpt-thung-pho"
            ? {
                x: 1200,
                y: 205,
                points: "965,640 1035,425 1060,285 1200,285",
                name: ["นิคมฯ ทุ่งโพธิ์ทะเล"],
              }
            : area.id === "kpt-tha-phutsa"
              ? {
                  x: 185,
                  y: 455,
                  points: "310,628 210,535 185,535",
                  name: [station.name],
                }
              : null;
        const color = callout
          ? "#000000"
          : rainTextColor(rainColor(data[area.id]));
        const name = callout?.name || [station.name];
        const x = callout?.x ?? area.x;
        const y = area.id === "kpt-thung-sai" ? 856 : (callout?.y ?? area.y);
        return (
          <g key={area.id}>
            {callout && (
              <g aria-hidden="true">
                <polyline
                  points={callout.points}
                  fill="none"
                  stroke="white"
                  strokeWidth={10}
                  strokeLinejoin="round"
                />
                <polyline
                  points={callout.points}
                  fill="none"
                  stroke="#203d37"
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                <circle
                  cx={area.x}
                  cy={area.y}
                  r={8}
                  fill="#203d37"
                  stroke="white"
                  strokeWidth={3}
                />
              </g>
            )}
            <g transform={`translate(${x},${y})`}>
              <title>
                {station.name}: {rainLabel(data[area.id])} มม.
              </title>
              <text
                textAnchor="middle"
                style={{
                  fontFamily: "Tahoma, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: area.id === "kpt-thung-sai" ? 34 : station.isMain ? 38 : 35,
                  fill: color,
                }}
              >
                {name.map((line, i) => (
                  <tspan key={line} x="0" y={i * 39 - 18}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text
                textAnchor="middle"
                y={(name.length - 1) * 39 + 42}
                style={{
                  fontFamily: "Tahoma, Arial, sans-serif",
                  fontSize: 55,
                  fontWeight: 900,
                  fill: color,
                }}
              >
                {rainLabel(data[area.id])}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
