"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  BACKGROUND_TYPES,
  DEFAULT_BACKGROUND,
  MAX_BACKGROUND_BYTES,
  type ReportBackground,
} from "@/lib/background";

export default function BackgroundEditor({
  current,
  storageReady,
  disabled,
  onPreview,
  onSaved,
}: {
  current: ReportBackground;
  storageReady: boolean;
  disabled: boolean;
  onPreview: (value: ReportBackground | null) => void;
  onSaved: (value: ReportBackground) => void;
}) {
  const [draft, setDraft] = useState<ReportBackground | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState("");
  const objectUrl = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const value = draft || current;
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  function preview(next: ReportBackground) {
    setDraft(next);
    onPreview(next);
  }
  function cancel() {
    generation.current++;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setDraft(null);
    setFile(null);
    setWarning("");
    onPreview(null);
    if (input.current) input.current.value = "";
  }
  async function choose(selected?: File) {
    if (!selected) return;
    const token = ++generation.current;
    if (
      !BACKGROUND_TYPES.includes(selected.type) ||
      selected.size > MAX_BACKGROUND_BYTES
    ) {
      toast.error("เลือก JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB");
      return;
    }
    const url = URL.createObjectURL(selected);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (token !== generation.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (image.naturalWidth * image.naturalHeight > 40_000_000)
        throw new Error("ภาพมีขนาดเกิน 40 ล้านพิกเซล");
      setWarning(
        image.naturalWidth < 1240 || image.naturalHeight < 1754
          ? "ภาพนี้มีความละเอียดต่ำ อาจไม่คมชัดเมื่อดาวน์โหลด A4"
          : "",
      );
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      setFile(selected);
      preview({ ...current, url, positionX: 50, positionY: 50 });
    } catch {
      URL.revokeObjectURL(url);
      toast.error("อ่านรูปภาพไม่ได้ หรือภาพมีขนาดเกิน 40 ล้านพิกเซล");
    }
  }
  async function save(reset = false) {
    setSaving(true);
    try {
      let uploadPath: string | undefined;
      if (file && !reset) {
        const response = await fetch("/api/report-background/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: file.type, size: file.size }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        const uploaded = await fetch(body.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploaded.ok) throw new Error("อัปโหลดภาพไม่สำเร็จ กรุณาลองใหม่");
        uploadPath = body.path;
      }
      const controls = reset ? DEFAULT_BACKGROUND : value;
      const response = await fetch("/api/report-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadPath,
          reset,
          positionX: controls.positionX,
          positionY: controls.positionY,
          wash: controls.wash,
          revision: current.revision,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      cancel();
      onSaved(body.background);
      toast.success("บันทึกพื้นหลังรายงานแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="background-editor">
      <summary>
        ตั้งค่าพื้นหลังรายงาน <span>สำหรับแอดมิน</span>
      </summary>
      <p>
        ใช้กับรายงานทุกวันที่เปิดหรือสร้างภาพใหม่
        ภาพที่ดาวน์โหลดไว้แล้วจะไม่เปลี่ยน
      </p>
      {!storageReady && (
        <p className="background-warning" role="status">
          ยังไม่ได้เชื่อมต่อพื้นที่จัดเก็บรูปภาพ ทดลองดูตัวอย่างได้
          แต่ยังบันทึกภาพใหม่ไม่ได้
        </p>
      )}
      <div className="background-guidance">
        <b>ภาพแบบไหนเหมาะกับรายงาน?</b>
        <ul>
          <li>ภาพแนวตั้งสัดส่วน A4 ประมาณ 1:1.414 แนะนำ 2480 × 3508 พิกเซล</li>
          <li>JPG, PNG หรือ WebP ไม่เกิน 10 MB และ 40 ล้านพิกเซล</li>
          <li>
            ภาพท้องฟ้า ธรรมชาติ หรือสถานที่สำคัญ มีพื้นที่ว่างด้านบนและกลางภาพ
          </li>
          <li>หลีกเลี่ยงภาพที่มีข้อความ โลโก้ หรือรายละเอียดหนาแน่น</li>
          <li>ระบบครอบภาพให้เต็มหน้า ตรวจภาพตัวอย่างก่อนบันทึก</li>
        </ul>
      </div>
      <fieldset disabled={disabled || saving}>
        <label className="background-file">
          เลือกรูปพื้นหลัง
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void choose(e.target.files?.[0])}
          />
        </label>
        {warning && (
          <p role="status" className="background-warning">
            {warning}
          </p>
        )}
        <div className="background-sliders">
          {(
            [
              ["positionX", "ตำแหน่งแนวนอน"],
              ["positionY", "ตำแหน่งแนวตั้ง"],
              ["wash", "เพิ่มความสว่างพื้นหลัง"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label} · {value[key]}%
              <input
                type="range"
                min="0"
                max="100"
                value={value[key]}
                onChange={(e) =>
                  preview({ ...value, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {draft && (
          <p role="status">
            กำลังดูตัวอย่างพื้นหลังที่ยังไม่บันทึก —
            บันทึกหรือยกเลิกก่อนดาวน์โหลดรายงาน
          </p>
        )}
        <div className="background-actions">
          <button
            disabled={!draft || (!!file && !storageReady)}
            onClick={() => void save()}
          >
            {saving ? "กำลังบันทึก…" : "บันทึกและใช้พื้นหลังนี้"}
          </button>
          <button disabled={!draft} onClick={cancel}>
            ยกเลิกตัวอย่าง
          </button>
          <button onClick={() => void save(true)}>
            คืนค่าพื้นหลังเริ่มต้น
          </button>
        </div>
      </fieldset>
    </details>
  );
}
