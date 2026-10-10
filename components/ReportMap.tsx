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
          key={area.id}
          data-region={area.id}
          d={area.d}
          fill={rainColor(data[area.id])}
          stroke="#203d37"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      ))}
      {areas.map((area) => {
        const station = STATIONS.find((s) => s.id === area.id)!;
        const color = rainTextColor(rainColor(data[area.id]));
        const small = area.id === "kpt-thung-pho";
        const name = small ? ["นิคมฯ ทุ่ง", "โพธิ์ทะเล"] : [station.name];
        return (
          <g key={area.id} transform={`translate(${area.x},${area.y})`}>
            <title>
              {station.name}: {rainLabel(data[area.id])} มม.
            </title>
            <text
              textAnchor="middle"
              style={{
                fontFamily: "Tahoma, Arial, sans-serif",
                fontWeight: 700,
                fontSize: small ? 23 : station.isMain ? 32 : 29,
                fill: color,
                stroke: color === "#000000" ? "#ffffff" : "#000000",
                strokeWidth: 1.5,
                paintOrder: "stroke",
                strokeLinejoin: "round",
              }}
            >
              {name.map((line, i) => (
                <tspan key={line} x="0" y={i * 29 - 12}>
                  {line}
                </tspan>
              ))}
            </text>
            <text
              textAnchor="middle"
              y={small ? 52 : 35}
              style={{
                fontFamily: "Tahoma, Arial, sans-serif",
                fontSize: small ? 34 : 43,
                fontWeight: 900,
                fill: color,
                stroke: color === "#000000" ? "#ffffff" : "#000000",
                strokeWidth: 1,
                paintOrder: "stroke",
              }}
            >
              {rainLabel(data[area.id])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
