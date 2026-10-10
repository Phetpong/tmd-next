import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validBackgroundControls } from "../lib/background.ts";
import { STATIONS, thaiDate } from "../lib/rainfall.ts";
import sharp from "sharp";
import { prepareBackgroundImage } from "../lib/background-image.ts";
test("uploaded images are decoded, normalized and stripped of metadata", async () => {
  for (const format of ["jpeg", "png", "webp"]) {
    const input = await sharp({create:{width:120,height:170,channels:3,background:"#128055"}}).toFormat(format).withMetadata().toBuffer();
    const result = await prepareBackgroundImage(input);
    const meta = await sharp(result).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 120);
    assert.equal(meta.height, 170);
    assert.equal(meta.exif, undefined);
  }
});
test("SVG and invalid bytes cannot be published as a background", async () => {
  await assert.rejects(prepareBackgroundImage(Buffer.from('not an image')));
  await assert.rejects(prepareBackgroundImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')));
});
test("report map has one closed independent area per station", () => {
  const areas = JSON.parse(
    readFileSync(new URL("../lib/report-map.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    areas.map((a) => a.id).sort(),
    STATIONS.map((s) => s.id).sort(),
  );
  for (const area of areas) {
    assert.match(area.d, /^M[\d,L]+Z$/);
    assert.ok(area.area > 9000);
    assert.ok(area.x > 0 && area.y > 0);
  }
});
test("background controls reject coercion and out of range values", () => {
  assert.equal(
    validBackgroundControls({ positionX: 0, positionY: 100, wash: 50 }),
    true,
  );
  for (const value of [
    null,
    {},
    { positionX: "50", positionY: 50, wash: 0 },
    { positionX: 50, positionY: 50, wash: -1 },
    { positionX: 50, positionY: 101, wash: 0 },
    { positionX: NaN, positionY: 50, wash: 0 },
  ])
    assert.equal(validBackgroundControls(value), false);
});
test("header includes actual Thai weekday and Buddhist year", () => {
  const date = thaiDate("2026-10-10");
  assert.ok(date.includes("วันเสาร์"));
  assert.ok(date.includes("2569"));
});
