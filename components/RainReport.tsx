"use client";
/* eslint-disable @next/next/no-img-element */
import { forwardRef } from "react";
import ReportMascot from "./ReportMascot";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { CalendarDays, CloudRain, MapPin, Globe, Phone } from "lucide-react";
import {
  STATIONS,
  RAIN_BANDS,
  numericRain,
  rainColor,
  rainTextColor,
  rainLabel,
  thaiDate,
  type RainData,
} from "@/lib/rainfall";
// Preserve the existing projection, centroids and main station offsets.
const projection = geoMercator()
  .scale(36000)
  .center([99.52, 16.33])
  .translate([400, 500]);
const path = geoPath(projection);
const RainReport = forwardRef<
  HTMLDivElement,
  { date: string; data: RainData; geo: FeatureCollection }
>(function RainReport({ date, data, geo }, ref) {
  const bounds = path.bounds(geo);
  const viewBox = `${bounds[0][0] - 50} ${bounds[0][1] - 45} ${bounds[1][0] - bounds[0][0] + 100} ${bounds[1][1] - bounds[0][1] + 90}`;
  const reported = STATIONS.filter((s) => numericRain(data[s.id]) !== null);
  const max = reported.length
    ? Math.max(...reported.map((s) => numericRain(data[s.id])!))
    : null;
  const winners = reported.filter((s) => numericRain(data[s.id]) === max);
  const summaryBackground = rainColor(max === null ? "" : max.toFixed(1));
  const summaryText = rainTextColor(summaryBackground);
  const winnerText =
    winners.length > 2
      ? `${winners[0].name} และอีก ${winners.length - 1} จุด`
      : winners.map((s) => s.name).join(" / ");
  return (
    <div ref={ref} className="rain-report" id="dashboard-main">
      <img className="report-background" src="/bg-beautiful.jpg" alt="" />
      <header className="report-heading">
        <img
          className="report-logo"
          src="/tmd_logo.png"
          alt="กรมอุตุนิยมวิทยา"
        />
        <div className="report-title">
          <p>กรมอุตุนิยมวิทยา · THAI METEOROLOGICAL DEPARTMENT</p>
          <h1>รายงานปริมาณน้ำฝน</h1>
          <h2>จังหวัดกำแพงเพชร</h2>
        </div>
        <CloudRain className="heading-weather" strokeWidth={1.4} />
      </header>
      <div className="report-date">
        <CalendarDays size={27} />
        ประจำวันที่ {thaiDate(date)}
      </div>
      <div className="report-location">
        <MapPin size={29} />
        <span>แผนที่แสดงปริมาณน้ำฝนรายอำเภอของจังหวัดกำแพงเพชร</span>
      </div>
      <div className="report-map">
        <div className="map-unit">หน่วยวัดปริมาณน้ำฝน · มิลลิเมตร (มม.)</div>
        <svg
          viewBox={viewBox}
          role="img"
          aria-label="แผนที่ปริมาณน้ำฝนจังหวัดกำแพงเพชร"
        >
          <defs>
            <pattern
              id="missing-rain"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <rect width="12" height="12" fill="white" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="#d6dfdf"
                strokeWidth="2"
              />
            </pattern>
          </defs>
          {geo.features.map((feature) => {
            const name = feature.properties?.amp_th;
            const station = STATIONS.find(
              (s) => s.isMain && s.district === name,
            );
            const value = station ? data[station.id] : "";
            return (
              <path
                key={String(name)}
                d={path(feature) || ""}
                fill={
                  numericRain(value) === null
                    ? "url(#missing-rain)"
                    : rainColor(value)
                }
                stroke="#203d37"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            );
          })}
          {geo.features.flatMap((feature) => {
            const point = projection(geoCentroid(feature));
            if (!point) return [];
            return STATIONS.filter(
              (s) => s.district === feature.properties?.amp_th,
            ).map((s) => (
              <g
                key={s.id}
                transform={`translate(${point[0] + s.offsetX},${point[1] + s.offsetY})`}
              >
                <text
                  style={{
                    fontFamily: "Tahoma, Arial, sans-serif",
                    fontSize: s.isMain ? 19 : 14,
                    fontWeight: 700,
                    fill: "#122e37",
                    stroke: "white",
                    strokeWidth: s.isMain ? 4 : 3,
                    paintOrder: "stroke",
                    strokeLinejoin: "round",
                  }}
                  className={s.isMain ? "map-name" : "map-name map-minor"}
                  textAnchor="middle"
                  y="-19"
                >
                  {s.isMain ? "อ." : ""}
                  {s.name}
                </text>
                <rect
                  x={s.isMain ? -38 : -32}
                  y="-9"
                  width={s.isMain ? 76 : 64}
                  height="28"
                  rx="14"
                  fill="white"
                  stroke={s.isMain ? "#14634d" : "#778b83"}
                  strokeWidth="2"
                />
                <text
                  style={{
                    fontFamily: "Tahoma, Arial, sans-serif",
                    fontSize: 19,
                    fontWeight: 700,
                    fill: "#173b38",
                  }}
                  className="map-value"
                  textAnchor="middle"
                  y="11"
                >
                  {rainLabel(data[s.id])}
                </text>
              </g>
            ));
          })}
        </svg>
      </div>
      <aside
        className="report-summary"
        style={{ background: summaryBackground, color: summaryText }}
      >
        <CloudRain size={57} strokeWidth={1.5} />
        <div className="summary-eyebrow">ปริมาณน้ำฝนประจำวันที่รายงาน</div>
        <h3>ปริมาณฝนสูงสุด</h3>
        <strong>
          {max === null ? "—" : max.toFixed(1)} <small>มม.</small>
        </strong>
        <p>{max === null ? "ยังไม่มีข้อมูลปริมาณฝน" : winnerText}</p>
        <span>
          จากจุดที่รายงาน {reported.length} / {STATIONS.length} จุด
        </span>
      </aside>
      <section className="report-legend">
        <h3>เกณฑ์ปริมาณน้ำฝนสะสม (มม.)</h3>
        <div>
          {RAIN_BANDS.map((b) => (
            <p key={b.label}>
              <i style={{ background: b.color }} />
              <span>ปริมาณฝนสะสม {b.label}</span>
            </p>
          ))}
          <p>
            <i className="missing-swatch" />
            <span>ไม่มีรายงาน / เครื่องวัดฝนขัดข้อง</span>
          </p>
        </div>
      </section>
      <div className="report-decoration">
        <ReportMascot />
      </div>
      <footer className="report-footer">
        <div className="footer-heading">
          <b>สถานีอุตุนิยมวิทยากำแพงเพชร</b>
          <span>ช่องทางติดต่อ</span>
        </div>
        <div className="footer-contacts">
          <a
            className="footer-contact"
            href="https://cmmet.tmd.go.th/station/kpt/"
          >
            <i>
              <Globe size={23} />
            </i>
            <span>
              <small>เว็บไซต์</small>
              <strong>cmmet.tmd.go.th/station/kpt/</strong>
            </span>
          </a>
          <div className="footer-contact">
            <i>
              <Phone size={23} />
            </i>
            <span>
              <small>โทรศัพท์</small>
              <strong>
                <a href="tel:055711470">055-711470</a> ·{" "}
                <a href="tel:0922460100">092-2460100</a>
              </strong>
            </span>
          </div>
          <a
            className="footer-contact"
            href="https://www.facebook.com/profile.php?id=61555665693617"
          >
            <i className="footer-facebook" aria-hidden="true">
              f
            </i>
            <span>
              <small>Facebook</small>
              <strong>สถานีอุตุนิยมวิทยากำแพงเพชร</strong>
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
});
export default RainReport;
