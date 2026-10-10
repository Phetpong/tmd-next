// Trace the supplied reporting-area drawing into editable SVG paths.
// Run: node scripts/trace-report-map.cjs (requires improve/newmap.png).
const sharp = require("sharp");
const fs = require("node:fs");
(async () => {
  const { data, info } = await sharp("improve/newmap.png")
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width,
    h = info.height,
    labels = new Int32Array(w * h),
    queue = new Int32Array(w * h);
  let next = 0;
  const regions = [];
  for (let p = 0; p < data.length; p++) {
    if (labels[p] || data[p] < 170) continue;
    const id = ++next;
    let head = 0,
      tail = 1;
    queue[0] = p;
    labels[p] = id;
    let sx = 0,
      sy = 0;
    while (head < tail) {
      const a = queue[head++],
        x = a % w,
        y = Math.floor(a / w);
      sx += x;
      sy += y;
      for (const b of [
        x > 0 ? a - 1 : -1,
        x < w - 1 ? a + 1 : -1,
        y > 0 ? a - w : -1,
        y < h - 1 ? a + w : -1,
      ])
        if (b >= 0 && !labels[b] && data[b] >= 170) {
          labels[b] = id;
          queue[tail++] = b;
        }
    }
    if (tail > 1000)
      regions.push({
        id,
        area: tail,
        x: Math.round(sx / tail),
        y: Math.round(sy / tail),
      });
  }
  console.log({ width: w, height: h, regions });
  const mapping = [
    [2, "kpt-pabong", 770, 355],
    [3, "kpt-kosamphi", 505, 475],
    [4, "kpt-lan-krabue", 1160, 478],
    [7, "kpt", 715, 700],
    [19, "kpt-tha-phutsa", 310, 628],
    [20, "kpt-thung-pho", 969, 638],
    [21, "kpt-sai-ngam", 1170, 690],
    [34, "kpt-mod-daeng", 280, 765],
    [64, "kpt-khlong-khayaeng", 396, 863],
    [65, "kpt-thung-sai", 1170, 852],
    [66, "kpt-bueng-samakkhi", 1290, 980],
    [67, "kpt-khlong-khlung", 936, 948],
    [92, "kpt-forest", 355, 990],
    [122, "kpt-plaeng-si", 450, 1090],
    [123, "kpt-khanu", 920, 1230],
    [124, "kpt-pang-sila-thong", 427, 1222],
  ];
  function simplify(points, tolerance = 1.5) {
    if (points.length < 3) return points;
    const a = points[0],
      b = points.at(-1),
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    let max = 0,
      index = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i],
        t = Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
              (dx * dx + dy * dy || 1),
          ),
        );
      const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      if (distance > max) {
        max = distance;
        index = i;
      }
    }
    return max > tolerance
      ? [
          ...simplify(points.slice(0, index + 1)).slice(0, -1),
          ...simplify(points.slice(index)),
        ]
      : [a, b];
  }
  const result = mapping.map(([region, id, x, y]) => {
    const edges = new Map();
    const key = (x, y) => y * (w + 1) + x;
    const add = (ax, ay, bx, by) => edges.set(key(ax, ay), key(bx, by));
    for (let p = 0; p < labels.length; p++)
      if (labels[p] === region) {
        const x = p % w,
          y = Math.floor(p / w);
        if (y === 0 || labels[p - w] !== region) add(x, y, x + 1, y);
        if (x === w - 1 || labels[p + 1] !== region)
          add(x + 1, y, x + 1, y + 1);
        if (y === h - 1 || labels[p + w] !== region)
          add(x + 1, y + 1, x, y + 1);
        if (x === 0 || labels[p - 1] !== region) add(x, y + 1, x, y);
      }
    const loops = [];
    while (edges.size) {
      const start = edges.keys().next().value;
      let current = start;
      const loop = [];
      do {
        loop.push([current % (w + 1), Math.floor(current / (w + 1))]);
        const n = edges.get(current);
        edges.delete(current);
        current = n;
      } while (current !== start && current !== undefined);
      loops.push(loop);
    }
    const outer = loops.sort((a, b) => b.length - a.length)[0];
    const points = simplify([...outer, outer[0]]);
    return {
      id,
      x,
      y,
      area: regions.find((r) => r.id === region).area,
      d: "M" + points.map((p) => p.join(",")).join("L") + "Z",
    };
  });
  fs.writeFileSync("lib/report-map.json", JSON.stringify(result));
})();
