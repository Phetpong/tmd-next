"use client";
import { useEffect, useRef, useState } from "react";
import BackgroundEditor from "./BackgroundEditor";
import { DEFAULT_BACKGROUND, type ReportBackground } from "@/lib/background";
import { useSession, signOut } from "next-auth/react";
import { toPng } from "html-to-image";
import { toast, Toaster } from "react-hot-toast";
import {
  Download,
  Save,
  CloudRain,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
} from "lucide-react";
import RainReport from "./RainReport";
import {
  STATIONS,
  emptyData,
  numericRain,
  rainColor,
  validDate,
  validValue,
  bangkokDate,
  type RainData,
} from "@/lib/rainfall";
export default function Dashboard() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === "admin" || role === "editor";
  const [date, setDate] = useState("");
  const [data, setData] = useState<RainData>(emptyData);
  const [background, setBackground] =
    useState<ReportBackground>(DEFAULT_BACKGROUND);
  const [storageReady, setStorageReady] = useState(false);
  const [draftBackground, setDraftBackground] =
    useState<ReportBackground | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [revision, setRevision] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const report = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const busy = saving || exporting || draftBackground !== null;
  useEffect(() => {
    const timer = window.setTimeout(() => setDate(bangkokDate()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/rainfall?date=${date}`, {
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch("/api/report-background", {
        signal: controller.signal,
        cache: "no-store",
      }),
    ])
      .then(async ([response, mapResponse]) => {
        if (!response.ok || !mapResponse.ok)
          throw new Error("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
        const values: RainData = await response.json();
        const appearance = await mapResponse.json();
        if (!controller.signal.aborted) {
          setRevision(response.headers.get("X-Report-Revision") || "");
          setConflict(false);
          setBackground(appearance.background);
          setStorageReady(appearance.configured);
          setData({ ...emptyData(), ...values });
          setDirty(false);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [date, retry]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / 840)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function selectDate(next: string) {
    if (!validDate(next) || busy || next === date) return;
    if (
      dirty &&
      !window.confirm(
        "มีข้อมูลที่ยังไม่บันทึก ต้องการทิ้งการแก้ไขและเปลี่ยนวันหรือไม่?",
      )
    )
      return;
    setLoading(true);
    setError("");
    setDate(next);
  }
  function moveDate(days: number) {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    selectDate(d.toISOString().slice(0, 10));
  }
  function change(id: string, value: string) {
    setData((previous) => ({ ...previous, [id]: value }));
    setDirty(true);
  }
  async function save() {
    if (!canEdit || loading || error) return false;
    const invalid = STATIONS.find((s) => !validValue(data[s.id]));
    if (invalid) {
      toast.error(
        `ตรวจสอบค่า ${invalid.name}: ตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 1 ตำแหน่ง`,
      );
      return false;
    }
    setSaving(true);
    try {
      const values = Object.fromEntries(
        STATIONS.map((s) => [
          s.id,
          numericRain(data[s.id]) === null
            ? ""
            : Number(data[s.id]).toFixed(1),
        ]),
      );
      const response = await fetch("/api/rainfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          data: values,
          expectedRevision: revision,
        }),
      });
      if (response.status === 409) setConflict(true);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "บันทึกไม่สำเร็จ");
      setRevision(body.revision);
      setData((previous) => ({ ...previous, ...values }));
      setDirty(false);
      toast.success("บันทึกข้อมูลแล้ว");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function download(high: boolean) {
    if (busy || loading || error || !report.current) return;
    if (STATIONS.some((s) => !validValue(data[s.id]))) {
      toast.error(
        "พบค่าที่ไม่รองรับ กรุณาให้เจ้าหน้าที่แก้ไขข้อมูลก่อนดาวน์โหลด",
      );
      return;
    }
    setExporting(true);
    try {
      if (dirty && !(await save())) return;
      await document.fonts.ready;
      await Promise.all(
        Array.from(report.current.querySelectorAll("img")).map((img) =>
          img.decode(),
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const url = await toPng(report.current, {
        backgroundColor: "#ffffff",
        width: 840,
        height: 1188,
        canvasWidth: high ? 2480 : 1240,
        canvasHeight: high ? 3508 : 1754,
        pixelRatio: 1,
        cacheBust: true,
        includeQueryParams: true,
        style: { transform: "none", margin: "0" },
      });
      const link = document.createElement("a");
      link.download = `rainfall-kamphaengphet-${date}${high ? "-A4" : ""}.png`;
      link.href = url;
      link.click();
      toast.success("ดาวน์โหลดภาพแล้ว");
    } catch {
      toast.error("สร้างภาพไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setExporting(false);
    }
  }
  const legacy = STATIONS.filter((s) => !validValue(data[s.id]));
  return (
    <div className="workspace">
      <Toaster />
      <header className="workspace-header">
        <div>
          <CloudRain size={29} />
          <span>
            <b>รายงานปริมาณน้ำฝน</b>
            <small>สถานีอุตุนิยมวิทยากำแพงเพชร</small>
          </span>
        </div>
        {session ? (
          <button
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm("ออกจากระบบโดยไม่บันทึกการแก้ไข?"))
                void signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut size={17} />
            ออกจากระบบ
          </button>
        ) : (
          <a href="/login">
            <LogIn size={17} />
            เข้าสู่ระบบเพื่อกรอกข้อมูล
          </a>
        )}
      </header>
      <div className={`workspace-body ${canEdit ? "with-editor" : ""}`}>
        {canEdit && (
          <aside className="editor">
            <div className="editor-title">
              <span className="eyebrow">DAILY REPORT</span>
              <h2>ข้อมูลประจำวัน</h2>
              <p>
                กรอกปริมาณฝนเป็นมิลลิเมตร
                <br />
                ทศนิยมไม่เกิน 1 ตำแหน่ง
              </p>
            </div>
            <section
              className="entry-guidance"
              aria-label="คำแนะนำสำหรับผู้บันทึกข้อมูล"
            >
              <h3>คำแนะนำสำหรับผู้บันทึก</h3>
              <p>
                บันทึกปริมาณน้ำฝนของวันที่เลือก
                โดยสีแต่ละพื้นที่แผนที่อ้างอิงค่าของจุดรายงานนั้น
              </p>
              <p>
                กรอกตัวเลขเพื่อแสดงสีตามเกณฑ์ปริมาณฝน
                <br />
                <b>เว้นว่าง</b> = ไม่มีข้อมูล แสดงสีเทาและเครื่องหมาย —
                <br />
                <b>0.0</b> = มีข้อมูลค่า 0 แสดงสีขาว
              </p>
            </section>
            <div className="save-status" role="status">
              {dirty
                ? "● มีการแก้ไขที่ยังไม่บันทึก"
                : "ข้อมูลตรงกับที่บันทึกในระบบ"}
            </div>
            {legacy.length > 0 && (
              <p className="error-message">
                พบค่าเดิมที่ไม่รองรับ กรุณาแก้ไข{" "}
                {legacy.map((s) => s.name).join(", ")} ก่อนบันทึก
              </p>
            )}
            {conflict && (
              <div className="error-message">
                ข้อมูลถูกแก้ไขจากอีกหน้าจอ{" "}
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "ทิ้งการแก้ไขในหน้านี้และโหลดข้อมูลล่าสุด?",
                      )
                    ) {
                      setLoading(true);
                      setRetry((n) => n + 1);
                    }
                  }}
                >
                  โหลดข้อมูลล่าสุด
                </button>
              </div>
            )}
            <fieldset disabled={loading || busy || !!error}>
              {STATIONS.filter((s) => s.isMain).map((main) => (
                <section className="station-group" key={main.id}>
                  <h3>อ.{main.district}</h3>
                  {STATIONS.filter((s) => s.district === main.district).map(
                    (s) => (
                      <div className="station-field" key={s.id}>
                        <label htmlFor={s.id}>
                          <i style={{ background: rainColor(data[s.id]) }} />
                          {s.name}
                          {!s.isMain && <small>จุดย่อย</small>}
                        </label>
                        <div className="station-controls">
                          <input
                            id={s.id}
                            aria-invalid={!validValue(data[s.id])}
                            inputMode="decimal"
                            value={
                              numericRain(data[s.id]) !== null ||
                              !validValue(data[s.id])
                                ? data[s.id]
                                : ""
                            }
                            placeholder="เว้นว่าง = ไม่มีข้อมูล"
                            style={{ width: "100%" }}
                            onChange={(e) => change(s.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </section>
              ))}
            </fieldset>
            <button
              className="save-button"
              disabled={busy || loading || !!error || !dirty}
              onClick={() => void save()}
            >
              <Save size={18} />
              {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
            </button>
          </aside>
        )}
        <main className="preview-panel">
          {role === "admin" && (
            <BackgroundEditor
              current={background}
              storageReady={storageReady}
              disabled={saving || exporting}
              onPreview={setDraftBackground}
              onSaved={(value) => {
                setBackground(value);
                setDraftBackground(null);
              }}
            />
          )}
          <div className="preview-toolbar">
            <div className="date-controls">
              <button
                aria-label="วันก่อนหน้า"
                disabled={!date || loading || busy}
                onClick={() => moveDate(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <input
                aria-label="วันที่รายงาน"
                type="date"
                value={date}
                disabled={busy}
                onChange={(e) => selectDate(e.target.value)}
              />
              <button
                aria-label="วันถัดไป"
                disabled={!date || loading || busy}
                onClick={() => moveDate(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="download-controls">
              <button
                disabled={loading || busy || !!error}
                onClick={() => void download(false)}
              >
                <Download size={17} />
                {exporting
                  ? "กำลังสร้างภาพ…"
                  : dirty
                    ? "บันทึกและดาวน์โหลด"
                    : "ดาวน์โหลด PNG"}
              </button>
              <button
                disabled={loading || busy || !!error}
                onClick={() => void download(true)}
              >
                A4 ความละเอียดสูง
              </button>
            </div>
          </div>
          <div className="preview-caption">
            <span>ภาพตัวอย่างก่อนดาวน์โหลด</span>
            <span>A4 · แนวตั้ง</span>
          </div>
          <div ref={viewport} className="preview-viewport">
            {loading ? (
              <div className="preview-message" role="status">
                กำลังโหลดรายงาน…
              </div>
            ) : error ? (
              <div className="preview-message" role="alert">
                {error}
                <button
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setRetry((n) => n + 1);
                  }}
                >
                  ลองใหม่
                </button>
              </div>
            ) : (
              date && (
                <div
                  style={{
                    width: 840 * scale,
                    height: 1188 * scale,
                    margin: "0 auto",
                  }}
                >
                  <div
                    style={{
                      width: 840,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <RainReport
                      ref={report}
                      date={date}
                      data={data}
                      background={draftBackground || background}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
