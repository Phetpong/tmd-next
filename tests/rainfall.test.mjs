import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rainColor,
  rainTextColor,
  RAIN_BANDS,
  numericRain,
  validDate,
  validValue,
  rainLabel,
  STATIONS,
} from "../lib/rainfall.ts";
test("summary text has at least 4.5:1 contrast on every rainfall color", () => {
  function luminance(hex) {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const { color } of RAIN_BANDS) {
    const a = luminance(color),
      b = luminance(rainTextColor(color));
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, color);
  }
  assert.equal(rainTextColor(rainColor("")), "#000000");
});
test("all rainfall band boundaries match the approved legend", () => {
  for (const [value, color] of [
    ["0.0", "#ffffff"],
    ["0.1", "#00cc33"],
    ["10.0", "#00cc33"],
    ["10.1", "#ffff00"],
    ["35.0", "#ffff00"],
    ["35.1", "#ffa500"],
    ["90.0", "#ffa500"],
    ["90.1", "#ff0000"],
    ["250.0", "#ff0000"],
    ["250.1", "#ff0000"],
    ["", "#999999"],
    ["broken", "#999999"],
  ])
    assert.equal(rainColor(value), color, value);
});
test("missing and broken are not zero; obsolete and invalid values are rejected", () => {
  for (const value of [
    "",
    "-",
    "broken",
    "T",
    "U",
    "-1",
    "10.05",
    "Infinity",
    "1e3",
    " ",
    "9".repeat(50),
  ])
    assert.equal(numericRain(value), null);
  for (const value of ["T", "U", "-1", "10.05", null, {}, 0])
    assert.equal(validValue(value), false);
  assert.equal(numericRain("0"), 0);
  assert.equal(rainLabel("0"), "0.0");
  assert.equal(rainLabel(""), "—");
  assert.equal(rainLabel("broken"), "—");
});
test("dates reject nonexistent calendar days", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(validDate("2026-10-08"), true);
});
test("station catalog has eleven main and five secondary points with unique IDs", () => {
  assert.equal(STATIONS.filter((s) => s.isMain).length, 11);
  assert.equal(STATIONS.filter((s) => !s.isMain).length, 5);
  assert.equal(new Set(STATIONS.map((s) => s.id)).size, 16);
  assert.equal(
    STATIONS.find((s) => s.id === "kpt-mod-daeng").name,
    "อ่างคลองมดแดง",
  );
});
