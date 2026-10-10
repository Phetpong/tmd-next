"use client";
/* eslint-disable @next/next/no-img-element */
import { forwardRef } from "react";
import ReportMap from "./ReportMap";
import "./report-readability.css";
import { DEFAULT_BACKGROUND, type ReportBackground } from "@/lib/background";
import { CalendarDays, MapPin, Globe, Phone } from "lucide-react";
import {
  STATIONS,
  RAIN_BANDS,
  numericRain,
  rainColor,
  rainTextColor,
  thaiDate,
  type RainData,
} from "@/lib/rainfall";
const RainReport = forwardRef<
  HTMLDivElement,
  { date: string; data: RainData; background?: ReportBackground }
>(function RainReport({ date, data, background = DEFAULT_BACKGROUND }, ref) {
  const reported = STATIONS.filter((s) => numericRain(data[s.id]) !== null);
  const max = reported.length
    ? Math.max(...reported.map((s) => numericRain(data[s.id])!))
    : null;
  const winners = reported.filter((s) => numericRain(data[s.id]) === max);
  const summaryBackground = rainColor(max === null ? "" : max.toFixed(1));
  const summaryText = rainTextColor(summaryBackground);
  const winnerText =
    winners.length === STATIONS.length
      ? "ทุกจุดรายงาน"
      : winners.map((s) => s.name).join(" / ");
  return (
    <div ref={ref} className="rain-report" id="dashboard-main">
      <img
        className="report-background"
        src={background.url}
        style={{
          objectPosition: `${background.positionX}% ${background.positionY}%`,
        }}
        onError={(e) => {
          if (!e.currentTarget.src.endsWith("/bg-beautiful.jpg"))
            e.currentTarget.src = "/bg-beautiful.jpg";
        }}
        alt=""
      />
      <div
        className="background-wash"
        style={{ opacity: background.wash / 100 }}
      />
      <header className="report-heading">
        <img
          className="report-logo ministry-logo"
          src="/report-assets/logo1upleft.jpg"
          alt="กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม"
        />
        <div className="report-title">
          <h1>รายงานปริมาณน้ำฝน</h1>
        </div>
        <img
          className="report-logo tmd-logo"
          src="/report-assets/logo2upright.jpg"
          alt="กรมอุตุนิยมวิทยา"
        />
      </header>
      <div className="report-date">
        <CalendarDays size={27} />
        {thaiDate(date)}
      </div>
      <div className="report-location">
        <MapPin size={29} />
        <span>แผนที่ปริมาณน้ำฝนตามจุดรายงาน · จังหวัดกำแพงเพชร</span>
      </div>
      <div className="report-map">
        <div className="map-unit">หน่วยวัดปริมาณน้ำฝน · มิลลิเมตร (มม.)</div>
        <ReportMap data={data} />
      </div>
      <aside
        className="report-summary"
        style={{ background: "#ffffff", color: "#173b38" }}
      >
        <h3>ปริมาณฝนสูงสุด</h3>
        <strong style={{ background: summaryBackground, color: summaryText }}>
          {max === null ? "—" : max.toFixed(1)} <small>มม.</small>
        </strong>
        <p className={winnerText.length > 110 ? "many-winners" : ""}>
          {max === null ? "ยังไม่มีข้อมูลปริมาณฝน" : winnerText}
        </p>
        <span>
          รายงานแล้ว {reported.length}/{STATIONS.length} จุด
        </span>
      </aside>
      <section className="report-legend">
        <h3>เกณฑ์ปริมาณน้ำฝน (มม.)</h3>
        <div>
          {[...RAIN_BANDS].reverse().map((b) => (
            <p key={b.label}>
              <i style={{ background: b.color }} />
              <span>
                {b.label}
                <small>{b.description}</small>
              </span>
            </p>
          ))}
          <p>
            <i className="missing-swatch" />
            <span>ไม่มีรายงาน / เครื่องวัดฝนขัดข้อง</span>
          </p>
        </div>
      </section>
      <div className="report-decoration">
        <img
          src="/report-assets/robot.jpg"
          alt="หุ่นยนต์กรมอุตุนิยมวิทยา"
          style={{
            width: 120,
            height: 112,
            objectFit: "contain",
            background: "white",
            borderRadius: "48%",
            padding: 6,
            boxShadow: "0 0 16px 10px #ffffffb0",
            mixBlendMode: "normal",
          }}
        />
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
