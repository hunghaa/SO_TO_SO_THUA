/** Tra cứu dữ liệu tĩnh 2026 & trước sáp nhập theo Tờ/Thửa, Lng/Lat và tự động nhận diện xã. */

const dynamicScriptPromises = new Map();

function loadCacheScript(src, cacheGlobalName, cacheKey) {
  const cache = (window[cacheGlobalName] = window[cacheGlobalName] || {});
  if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
    return Promise.resolve(cache[cacheKey]);
  }
  const promiseKey = `${cacheGlobalName}:${cacheKey}`;
  if (dynamicScriptPromises.has(promiseKey)) {
    return dynamicScriptPromises.get(promiseKey);
  }

  const promise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.remove();
      resolve(cache[cacheKey] || null);
    };
    script.onerror = () => {
      script.remove();
      cache[cacheKey] = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  dynamicScriptPromises.set(promiseKey, promise);
  return promise;
}

function loadSpatialTile(wardId, gx, gy) {
  return loadCacheScript(
    `./spatial_tiles/${wardId}/${gx}_${gy}.js`,
    "__SPATIAL_CACHE",
    `${wardId}/${gx}_${gy}`,
  );
}

function loadNewSheet(wardId, sheetName) {
  return loadCacheScript(
    `./new_sheets/${wardId}/${encodeURIComponent(sheetName)}.js`,
    "__NEW_SHEET_CACHE",
    `${wardId}/${sheetName}`,
  );
}

function loadOldSheet(oldKey, soTo) {
  return loadCacheScript(
    `./old_sheets/${oldKey}/${encodeURIComponent(soTo)}.js`,
    "__OLD_SHEET_CACHE",
    `${oldKey}/${soTo}`,
  );
}

function loadOldSpatialTile(oldKey, gx, gy) {
  return loadCacheScript(
    `./old_spatial_tiles/${oldKey}/${gx}_${gy}.js`,
    "__OLD_SPATIAL_CACHE",
    `${oldKey}/${gx}_${gy}`,
  );
}

function findSheetInWard(wardId, rawInput) {
  const sheets = newWardsById[wardId]?.sheets || [];
  const text = String(rawInput || "").trim().toLowerCase();
  if (!text || !sheets.length) return null;

  const stripped = text.replace(/^dc/i, "").replace(/^0+/, "") || text;
  return (
    sheets.find((s) => s.toLowerCase() === text) ||
    sheets.find(
      (s) =>
        (s.replace(/^dc/i, "").replace(/^0+/, "") || s).toLowerCase() ===
        stripped,
    ) ||
    null
  );
}

function findOldSheet(oldKey, rawInput) {
  const sheets = oldWardsByKey[oldKey]?.sheets || [];
  const text = String(rawInput || "").trim().toLowerCase();
  if (!text || !sheets.length) return null;
  const stripped = text.replace(/^dc/i, "").replace(/^0+/, "") || text;
  return (
    sheets.find((s) => s.toLowerCase() === text) ||
    sheets.find(
      (s) => (s.replace(/^0+/, "") || s).toLowerCase() === stripped,
    ) ||
    null
  );
}

function findPlotRecord(sheetMap, plotRaw) {
  if (!sheetMap || typeof sheetMap !== "object") return null;
  const targetPlot = String(plotRaw || "").trim();
  const normalizedPlot = targetPlot.replace(/^0+/, "") || targetPlot;
  if (Array.isArray(sheetMap[targetPlot])) {
    return { plotKey: targetPlot, record: sheetMap[targetPlot] };
  }
  if (Array.isArray(sheetMap[normalizedPlot])) {
    return { plotKey: normalizedPlot, record: sheetMap[normalizedPlot] };
  }
  return null;
}

async function lookupNewParcelByPlot(wardId, sheetName, plotRaw) {
  const wardMeta = newWardsById[wardId];
  if (!wardMeta) return { found: false };
  const sheetMap = await loadNewSheet(wardId, sheetName);
  const found = findPlotRecord(sheetMap, plotRaw);
  if (!found) return { found: false };

  const [loaiDat, dienTich, dienTichM2, gtypeCode, coords] = found.record;
  const geomObj = decodeGeometry(gtypeCode, coords);
  const center = computeGeometryCenter(geomObj);
  return {
    found: true,
    parcel: {
      xa_phuong: wardMeta.address,
      ward_id: wardId,
      so_to: sheetName.toUpperCase(),
      so_thua: found.plotKey,
      loai_dat: loaiDat || "",
      dien_tich: dienTich,
      dien_tich_m2: dienTichM2,
      polygon_geojson: JSON.stringify(geomObj),
      geometry_obj: geomObj,
    },
    meta: {
      era: "new",
      wardKey: wardId,
      location: center,
    },
  };
}

function buildOldParcelResponse(
  wardMeta,
  soTo,
  soThua,
  loaiDat,
  dienTich,
  qhTomTat,
  geomObj,
  center,
) {
  return {
    found: true,
    parcel: {
      xa_phuong: `${wardMeta.oldName} → ${wardMeta.newName}`,
      ward_id: `${wardMeta.oldWardId} (cũ)`,
      so_to: String(soTo),
      so_thua: String(soThua),
      loai_dat: loaiDat || "",
      dien_tich: dienTich,
      dien_tich_m2: null,
      quy_hoach: qhTomTat || "",
      polygon_geojson: JSON.stringify(geomObj),
      geometry_obj: geomObj,
    },
    meta: {
      era: "old",
      wardKey: wardMeta.oldKey,
      location: center,
    },
  };
}

async function lookupOldParcelByPlot(oldKey, sheetName, plotRaw) {
  const wardMeta = oldWardsByKey[oldKey];
  if (!wardMeta) return { found: false };
  const sheetMap = await loadOldSheet(oldKey, sheetName);
  const found = findPlotRecord(sheetMap, plotRaw);
  if (!found) return { found: false };

  const [loaiDat, dienTich, qhTomTat, gtypeCode, coords] = found.record;
  const geomObj = decodeGeometry(gtypeCode, coords);
  const center = computeGeometryCenter(geomObj);
  return buildOldParcelResponse(
    wardMeta,
    sheetName,
    found.plotKey,
    loaiDat,
    dienTich,
    qhTomTat,
    geomObj,
    center,
  );
}

function sortSpatialCandidates(items, lng, lat, bboxIdx) {
  const candidates = [];
  for (const item of items) {
    const bbox = item[bboxIdx];
    if (
      lng >= bbox[0] &&
      lng <= bbox[2] &&
      lat >= bbox[1] &&
      lat <= bbox[3]
    ) {
      const areaApprox = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
      candidates.push({ item, areaApprox });
    }
  }
  candidates.sort((a, b) => a.areaApprox - b.areaApprox);
  return candidates;
}

async function lookupOldParcelByCoord(oldKey, lng, lat) {
  const manifest = window.OLD_SPATIAL_MANIFEST;
  const step = manifest?.step || 0.0025;
  const gx = Math.floor(lng / step);
  const gy = Math.floor(lat / step);
  const items = await loadOldSpatialTile(oldKey, gx, gy);
  if (!Array.isArray(items) || !items.length) return null;

  const wardMeta = oldSpatialWardsByKey[oldKey];
  const candidates = sortSpatialCandidates(items, lng, lat, 5);
  for (const { item } of candidates) {
    const [
      soTo,
      soThua,
      loaiDat,
      dienTich,
      qhTomTat,
      bbox,
      gtypeCode,
      coords,
    ] = item;
    if (pointInGeometry(lng, lat, gtypeCode, coords)) {
      const geomObj = decodeGeometry(gtypeCode, coords);
      const center = {
        x: (bbox[0] + bbox[2]) * 0.5,
        y: (bbox[1] + bbox[3]) * 0.5,
      };
      return buildOldParcelResponse(
        wardMeta,
        soTo,
        soThua,
        loaiDat,
        dienTich,
        qhTomTat,
        geomObj,
        center,
      );
    }
  }
  return null;
}

async function lookupParcelByCoord(wardId, lng, lat) {
  const manifest = window.SPATIAL_MANIFEST;
  const step = manifest?.step || 0.0025;
  const gx = Math.floor(lng / step);
  const gy = Math.floor(lat / step);
  const items = await loadSpatialTile(wardId, gx, gy);
  if (!Array.isArray(items) || !items.length) return null;

  const wardMeta = spatialWardsById[wardId];
  const candidates = sortSpatialCandidates(items, lng, lat, 4);
  for (const { item } of candidates) {
    const rings = item[5];
    if (pointInPolygonRings(lng, lat, rings)) {
      const [soTo, soThua, loaiDat, dienTich, bbox] = item;
      const geomObj = { type: "Polygon", coordinates: rings };
      const centerLat = (bbox[1] + bbox[3]) * 0.5;
      const centerLng = (bbox[0] + bbox[2]) * 0.5;
      return {
        found: true,
        parcel: {
          xa_phuong: wardMeta?.address || "",
          ward_id: wardId,
          so_to: soTo,
          so_thua: soThua,
          loai_dat: loaiDat,
          dien_tich: dienTich,
          dien_tich_m2: null,
          polygon_geojson: JSON.stringify(geomObj),
          geometry_obj: geomObj,
        },
        meta: {
          era: "new",
          wardKey: wardId,
          location: { x: centerLng, y: centerLat },
        },
      };
    }
  }
  return null;
}

/** Tự động sắp xếp danh sách xã theo khoảng cách tới (lng, lat) và dò lần lượt tới khi trúng thửa. */
async function autoLookupCoordAcrossWards(era, lng, lat) {
  const isOld = era === "old";
  const wards = Object.values(isOld ? oldSpatialWardsByKey : spatialWardsById);
  const ordered = wards.slice().sort((a, b) => {
    const da = Array.isArray(a.center)
      ? (lat - a.center[0]) ** 2 + (lng - a.center[1]) ** 2
      : Infinity;
    const db = Array.isArray(b.center)
      ? (lat - b.center[0]) ** 2 + (lng - b.center[1]) ** 2
      : Infinity;
    return da - db;
  });

  for (const w of ordered) {
    const key = isOld ? w.oldKey : w.wardId;
    const res = isOld
      ? await lookupOldParcelByCoord(key, lng, lat)
      : await lookupParcelByCoord(key, lng, lat);
    if (res && res.found) return res;
  }
  return null;
}

