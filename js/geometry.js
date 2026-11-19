/** Các hàm xử lý hình học, WKT, GeoJSON và kiểm tra điểm trong đa giác. */

function formatWktRing(ring) {
  if (!Array.isArray(ring) || !ring.length) return "";
  const pts = ring.filter((pt) => Array.isArray(pt) && pt.length >= 2);
  if (!pts.length) return "";
  const first = pts[0];
  const last = pts[pts.length - 1];
  const closed =
    first[0] === last[0] && first[1] === last[1] ? pts : [...pts, first];
  return `(${closed.map((pt) => `${pt[0]} ${pt[1]}`).join(", ")})`;
}

function geometryToWkt(geom) {
  if (!geom || typeof geom !== "object" || !Array.isArray(geom.coordinates)) {
    return "";
  }
  if (geom.type === "Polygon") {
    const rings = geom.coordinates.map(formatWktRing).filter(Boolean);
    return rings.length ? `POLYGON (${rings.join(", ")})` : "";
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates
      .map((poly) => {
        const rings = Array.isArray(poly)
          ? poly.map(formatWktRing).filter(Boolean)
          : [];
        return rings.length ? `(${rings.join(", ")})` : "";
      })
      .filter(Boolean);
    return polys.length ? `MULTIPOLYGON (${polys.join(", ")})` : "";
  }
  return "";
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-15) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lng, lat, rings) {
  if (!rings || !rings.length || !pointInRing(lng, lat, rings[0])) {
    return false;
  }
  for (let k = 1; k < rings.length; k++) {
    if (pointInRing(lng, lat, rings[k])) return false;
  }
  return true;
}

function pointInGeometry(lng, lat, gtypeCode, coords) {
  if (gtypeCode === 0) {
    return pointInPolygonRings(lng, lat, coords);
  }
  if (gtypeCode === 1 && Array.isArray(coords)) {
    return coords.some((polyRings) =>
      pointInPolygonRings(lng, lat, polyRings),
    );
  }
  return false;
}

function decodeGeometry(gtypeCode, coords) {
  return {
    type: gtypeCode === 1 ? "MultiPolygon" : "Polygon",
    coordinates: coords,
  };
}

function computeGeometryCenter(geomObj) {
  const rings =
    geomObj?.type === "MultiPolygon"
      ? geomObj.coordinates?.[0] || []
      : geomObj?.coordinates || [];
  const outer = rings[0];
  if (!Array.isArray(outer) || !outer.length) return null;
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (const pt of outer) {
    if (pt[0] < minx) minx = pt[0];
    if (pt[0] > maxx) maxx = pt[0];
    if (pt[1] < miny) miny = pt[1];
    if (pt[1] > maxy) maxy = pt[1];
  }
  return { x: (minx + maxx) * 0.5, y: (miny + maxy) * 0.5 };
}

function computeRingAreaM2(ringLngLat) {
  if (!Array.isArray(ringLngLat) || ringLngLat.length < 3) return 0;
  const R = 6378137;
  const rad = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < ringLngLat.length; i++) {
    const p1 = ringLngLat[i];
    const p2 = ringLngLat[(i + 1) % ringLngLat.length];
    area +=
      (p2[0] - p1[0]) *
      rad *
      (2 + Math.sin(p1[1] * rad) + Math.sin(p2[1] * rad));
  }
  return Math.abs((area * R * R) / 2);
}

function computePolygonRingsAreaM2(rings) {
  if (!Array.isArray(rings) || !rings.length) return 0;
  let total = computeRingAreaM2(rings[0]);
  for (let k = 1; k < rings.length; k++) {
    total -= computeRingAreaM2(rings[k]);
  }
  return Math.max(0, total);
}

function computeGeometryAreaM2(geomObj) {
  if (!geomObj || !Array.isArray(geomObj.coordinates)) return 0;
  if (geomObj.type === "Polygon") {
    return computePolygonRingsAreaM2(geomObj.coordinates);
  }
  if (geomObj.type === "MultiPolygon") {
    return geomObj.coordinates.reduce(
      (sum, rings) => sum + computePolygonRingsAreaM2(rings),
      0,
    );
  }
  return 0;
}

function splitTopLevelGroups(text) {
  const groups = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0 && start !== -1) {
        groups.push(text.slice(start, i));
        start = -1;
      }
    }
  }
  return groups;
}

function sanitizeRing(rawRing) {
  if (!Array.isArray(rawRing)) return [];
  const pts = [];
  for (const pt of rawRing) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      return [];
    }
    pts.push([lng, lat]);
  }
  if (pts.length < 3) return [];
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    pts.push([first[0], first[1]]);
  }
  return pts;
}

function parseWktRingCoords(ringText) {
  const raw = [];
  for (const seg of ringText.split(",")) {
    const toks = seg.trim().split(/\s+/).filter(Boolean);
    if (toks.length >= 2) {
      raw.push([Number(toks[0]), Number(toks[1])]);
    }
  }
  return sanitizeRing(raw);
}

function parseWktGeometry(text) {
  const cleaned = text.replace(/^SRID=\d+;/i, "").trim();
  const openIdx = cleaned.indexOf("(");
  const closeIdx = cleaned.lastIndexOf(")");
  if (openIdx === -1 || closeIdx <= openIdx) return null;

  const prefix = cleaned.slice(0, openIdx).trim().toUpperCase();
  const inner = cleaned.slice(openIdx + 1, closeIdx);

  if (prefix === "POLYGON") {
    const rings = splitTopLevelGroups(inner)
      .map(parseWktRingCoords)
      .filter((r) => r.length >= 4);
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }

  if (prefix === "MULTIPOLYGON") {
    const polys = splitTopLevelGroups(inner)
      .map((polyGrp) =>
        splitTopLevelGroups(polyGrp)
          .map(parseWktRingCoords)
          .filter((r) => r.length >= 4),
      )
      .filter((rings) => rings.length > 0);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return null;
}

function sanitizeGeoJsonGeometry(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.type === "Polygon" && Array.isArray(obj.coordinates)) {
    const rings = obj.coordinates
      .map(sanitizeRing)
      .filter((r) => r.length >= 4);
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }
  if (obj.type === "MultiPolygon" && Array.isArray(obj.coordinates)) {
    const polys = obj.coordinates
      .map((poly) =>
        Array.isArray(poly)
          ? poly.map(sanitizeRing).filter((r) => r.length >= 4)
          : [],
      )
      .filter((rings) => rings.length > 0);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return null;
}

function parsePastedPolygon(rawText) {
  let text = String(rawText || "").trim();
  if (!text) return null;
  // Hỗ trợ chuỗi copy từ Excel bị bọc ngoặc kép CSV ("{""type"":...}")
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    const unwrapped = text.slice(1, -1).replace(/""/g, '"').trim();
    if (
      unwrapped.startsWith("{") ||
      /^(?:SRID=\d+;)?\s*(?:MULTI)?POLYGON/i.test(unwrapped)
    ) {
      text = unwrapped;
    }
  }

  const wktGeom = parseWktGeometry(text);
  if (wktGeom) return { geometry: wktGeom, props: null };

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "Feature") {
      const g = sanitizeGeoJsonGeometry(parsed.geometry);
      return g ? { geometry: g, props: parsed.properties || null } : null;
    }
    if (
      parsed.type === "FeatureCollection" &&
      Array.isArray(parsed.features)
    ) {
      const polyCoords = [];
      let firstProps = null;
      for (const ft of parsed.features) {
        const g = sanitizeGeoJsonGeometry(ft?.geometry);
        if (!g) continue;
        if (!firstProps && ft?.properties) firstProps = ft.properties;
        if (g.type === "Polygon") polyCoords.push(g.coordinates);
        else polyCoords.push(...g.coordinates);
      }
      if (!polyCoords.length) return null;
      const g =
        polyCoords.length === 1
          ? { type: "Polygon", coordinates: polyCoords[0] }
          : { type: "MultiPolygon", coordinates: polyCoords };
      return { geometry: g, props: firstProps };
    }
    const g = sanitizeGeoJsonGeometry(parsed);
    return g ? { geometry: g, props: null } : null;
  } catch {
    return null;
  }
}

