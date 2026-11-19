/** Khởi tạo bản đồ Leaflet, điều phối UI, tra cứu tự động và đối chiếu Trước ↔ Sau sáp nhập. */

const map = L.map("map", {
  maxZoom: 22,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true,
}).setView([11.05, 106.35], 11);

const osmLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxNativeZoom: 19,
    maxZoom: 22,
    attribution: "&copy; OpenStreetMap contributors",
  },
);

function createGoogleLayer(lyrs) {
  return L.tileLayer(
    `https://{s}.google.com/vt/lyrs=${lyrs}&hl=vi&x={x}&y={y}&z={z}`,
    {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxNativeZoom: 20,
      maxZoom: 22,
      attribution: "&copy; Google Maps",
    },
  );
}

const googleStreetsLayer = createGoogleLayer("m");
const googleSatLayer = createGoogleLayer("s");
const googleHybridLayer = createGoogleLayer("y");

googleHybridLayer.addTo(map);
L.control
  .layers(
    {
      "Vệ tinh + Tên đường (Google)": googleHybridLayer,
      "Ảnh vệ tinh (Google)": googleSatLayer,
      "Đường phố (Google)": googleStreetsLayer,
      "Đường phố (OSM)": osmLayer,
    },
    null,
    { position: "topright" },
  )
  .addTo(map);

const parcelLayerGroup = L.layerGroup().addTo(map);
const compareOverlayGroup = L.layerGroup().addTo(map);
const drawnOverlayGroup = L.layerGroup().addTo(map);
const pastedOverlayGroup = L.layerGroup().addTo(map);
const gpsLayerGroup = L.layerGroup().addTo(map);
const drawLayerGroup = L.layerGroup().addTo(map);

let mapLocateBtnEl = null;
const LocateControl = L.Control.extend({
  options: { position: "topleft" },
  onAdd() {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    const btn = L.DomUtil.create("button", "leaflet-locate-btn", container);
    btn.type = "button";
    btn.title = "Lấy vị trí hiện tại";
    btn.setAttribute("aria-label", "Lấy vị trí hiện tại");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3"></path><path d="M12 19v3"></path><path d="M2 12h3"></path><path d="M19 12h3"></path><circle cx="12" cy="12" r="7"></circle></svg>';
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(btn, "click", (ev) => {
      L.DomEvent.stop(ev);
      handleGetCurrentLocation(true);
    });
    mapLocateBtnEl = btn;
    return container;
  },
});
new LocateControl().addTo(map);

const mapDrawBtnEl = document.getElementById("mapDrawToolBtn");
const mapPasteBtnEl = document.getElementById("mapPasteToolBtn");
const clearDrawnShapeBtnEl = document.getElementById("clearDrawnShapeBtn");

const wardSelectEl = document.getElementById("wardSelect");
const wardHintEl = document.getElementById("wardHint");
const sheetInputEl = document.getElementById("sheetInput");
const plotInputEl = document.getElementById("plotInput");
const searchBtnEl = document.getElementById("searchBtn");
const eraNewBtnEl = document.getElementById("eraNewBtn");
const eraOldBtnEl = document.getElementById("eraOldBtn");
const tabPlotBtnEl = document.getElementById("tabPlotBtn");
const tabCoordBtnEl = document.getElementById("tabCoordBtn");
const plotPanelEl = document.getElementById("plotPanel");
const coordPanelEl = document.getElementById("coordPanel");
const mapDrawStatusEl = document.getElementById("mapDrawStatus");
const bannerUndoDrawBtnEl = document.getElementById("bannerUndoDrawBtn");
const bannerFinishDrawBtnEl = document.getElementById("bannerFinishDrawBtn");
const bannerCancelDrawBtnEl = document.getElementById("bannerCancelDrawBtn");
const coordWardSelectEl = document.getElementById("coordWardSelect");
const coordWardHintEl = document.getElementById("coordWardHint");
const lngInputEl = document.getElementById("lngInput");
const latInputEl = document.getElementById("latInput");
const coordSearchBtnEl = document.getElementById("coordSearchBtn");
const currentLocationBtnEl = document.getElementById("currentLocationBtn");
const pickOnMapBtnEl = document.getElementById("pickOnMapBtn");
const cancelPickBtnEl = document.getElementById("cancelPickBtn");
const pasteOverlayCardEl = document.getElementById("pasteOverlayCard");
const closePasteCardBtnEl = document.getElementById("closePasteCardBtn");
const pasteOverlayStatusEl = document.getElementById("pasteOverlayStatus");
const pastePolyInputEl = document.getElementById("pastePolyInput");
const pastePolyRunBtnEl = document.getElementById("pastePolyRunBtn");
const pastePolyClearBtnEl = document.getElementById("pastePolyClearBtn");
const statusBoxEl = document.getElementById("statusBox");
const catalogInfoEl = document.getElementById("catalogInfo");
const geoOutputEl = document.getElementById("geoOutput");
const copyBtnEl = document.getElementById("copyBtn");
const wktOutputEl = document.getElementById("wktOutput");
const copyWktBtnEl = document.getElementById("copyWktBtn");
const boxQuyHoachEl = document.getElementById("boxQuyHoach");
const valQuyHoachEl = document.getElementById("valQuyHoach");
const compareEraBtnEl = document.getElementById("compareEraBtn");
const compareEraBtnLabelEl = document.getElementById("compareEraBtnLabel");
const compareEraBoxEl = document.getElementById("compareEraBox");
const searchCardEl = document.getElementById("searchCard");
const infoCardEl = document.getElementById("infoCard");
const mapWrapEl = document.getElementById("mapWrap");
const mapFullscreenBtnEl = document.getElementById("mapFullscreenBtn");
const sidebarCollapseBtnEl = document.getElementById("sidebarCollapseBtn");
const infoEmptyEl = document.getElementById("infoEmpty");
const infoContentEl = document.getElementById("infoContent");
const valPlotBadgeEl = document.getElementById("valPlotBadge");
const mobileBackdropEl = document.getElementById("mobileBackdrop");
const mobileOpenSearchBtnEl = document.getElementById("mobileOpenSearchBtn");
const closeSearchModalBtnEl = document.getElementById("closeSearchModalBtn");
const closeInfoModalBtnEl = document.getElementById("closeInfoModalBtn");
const mobileTopTitleEl = document.getElementById("mobileTopTitle");
const mobileTopSubEl = document.getElementById("mobileTopSub");
const mobileResultTitleEl = document.getElementById("mobileResultTitle");
const mobileResultMetaEl = document.getElementById("mobileResultMeta");
const mobileOpenInfoBtnEl = document.getElementById("mobileOpenInfoBtn");
const mobileDetailBtnEl = document.getElementById("mobileDetailBtn");
const mobileShareBtnEl = document.getElementById("mobileShareBtn");
const shareLinkBtnEl = document.getElementById("shareLinkBtn");
const redrawParcelBtnEl = document.getElementById("redrawParcelBtn");
const mobileReSearchBtnEl = document.getElementById("mobileReSearchBtn");

let newWardsById = {};
let oldWardsByKey = {};
let spatialWardsById = {};
let oldSpatialWardsByKey = {};
let searchEra = "new";
let mapPickActive = false;
let currentParcelData = null;
let currentParcelMeta = null;
let lastOfficialResult = null;
let currentShareState = null;

function refreshMapSize() {
  requestAnimationFrame(() => map.invalidateSize());
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function syncMobileModalA11y() {
  const compact = isCompactViewport();
  const searchOpen = document.body.classList.contains("mobile-search-open");
  const infoOpen = document.body.classList.contains("mobile-info-open");
  searchCardEl.setAttribute("aria-modal", String(compact && searchOpen));
  infoCardEl.setAttribute("aria-modal", String(compact && infoOpen));
  mobileBackdropEl.setAttribute(
    "aria-hidden",
    String(!(compact && (searchOpen || infoOpen))),
  );
}

function closeMobileModals() {
  document.body.classList.remove("mobile-search-open", "mobile-info-open");
  syncMobileModalA11y();
}

function openSearchModal() {
  if (!isCompactViewport()) return;
  document.body.classList.remove("mobile-info-open");
  document.body.classList.add("mobile-search-open");
  syncMobileModalA11y();
  setTimeout(() => {
    if (!sheetInputEl.value.trim()) sheetInputEl.focus();
  }, 120);
}

function openInfoModal() {
  if (!isCompactViewport()) return;
  document.body.classList.remove("mobile-search-open");
  document.body.classList.add("mobile-info-open");
  syncMobileModalA11y();
}

function setMapFullscreen(enabled) {
  document.body.classList.toggle("map-fullscreen", enabled);
  mapFullscreenBtnEl.setAttribute("aria-pressed", String(enabled));
  mapFullscreenBtnEl.textContent = enabled
    ? "Mở bảng tra cứu"
    : "Toàn màn hình";
  refreshMapSize();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === "") return "—";
  const n = Number(val);
  return Number.isNaN(n)
    ? String(val)
    : n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function setStatus(type, msg) {
  statusBoxEl.className = `status show ${type}`;
  statusBoxEl.textContent = msg;
}

function clearStatus() {
  statusBoxEl.className = "status";
  statusBoxEl.textContent = "";
}

function flyMapToBounds(bounds) {
  if (!bounds || !bounds.isValid()) return;
  map.invalidateSize();
  const fitOpts = isCompactViewport()
    ? {
        paddingTopLeft: [20, 88],
        paddingBottomRight: [20, 110],
        maxZoom: 19,
      }
    : { padding: [60, 60], maxZoom: 19 };

  if (prefersReducedMotion()) {
    map.fitBounds(bounds, fitOpts);
  } else {
    map.flyToBounds(bounds, {
      ...fitOpts,
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }
}

function syncParcelInfoOutputs(p, meta) {
  geoOutputEl.value = p.polygon_geojson || "";
  copyBtnEl.disabled = !p.polygon_geojson;

  const wktText = geometryToWkt(p.geometry_obj);
  wktOutputEl.value = wktText;
  copyWktBtnEl.disabled = !wktText;

  document.getElementById("valDienTich").textContent =
    p.dien_tich != null ? `${formatNumber(p.dien_tich)} m²` : "—";
  document.getElementById("valDienTichM2").textContent =
    p.dien_tich_m2 != null ? `${formatNumber(p.dien_tich_m2)} m²` : "—";

  const loc = meta?.location;
  if (loc && loc.y != null && loc.x != null) {
    document.getElementById("valCenter").textContent =
      `${Number(loc.y).toFixed(6)}, ${Number(loc.x).toFixed(6)}`;
  } else {
    document.getElementById("valCenter").textContent = meta?.point || "—";
  }
}

function clearCompareOverlay() {
  compareOverlayGroup.clearLayers();
  compareEraBoxEl.hidden = true;
  compareEraBoxEl.innerHTML = "";
}

function renderParcel(data, skipFly = false) {
  const p = data.parcel;
  const meta = data.meta || {};
  const isOld = meta.era === "old";
  const isDrawn = Boolean(meta.isDrawn);
  if (!isDrawn) {
    lastOfficialResult = data;
    clearCompareOverlay();
  }

  infoEmptyEl.hidden = true;
  infoContentEl.hidden = false;
  valPlotBadgeEl.hidden = false;
  valPlotBadgeEl.classList.toggle("is-old", isOld);
  valPlotBadgeEl.classList.toggle("is-drawn", isDrawn);
  valPlotBadgeEl.textContent = isOld
    ? `Trước sáp nhập • Tờ ${p.so_to} • Thửa ${p.so_thua}`
    : isDrawn && p.so_to === "Vẽ tay"
      ? "Polygon vẽ tay (Xanh dương)"
      : isDrawn
        ? `Vẽ lại • Tờ ${p.so_to} • Thửa ${p.so_thua}`
        : `Tờ ${p.so_to} • Thửa ${p.so_thua}`;

  document.getElementById("valXaPhuong").textContent = p.xa_phuong || "—";
  document.getElementById("valSoTo").textContent = p.so_to || "—";
  document.getElementById("valSoThua").textContent = p.so_thua || "—";
  document.getElementById("valLoaiDat").textContent = p.loai_dat || "—";
  document.getElementById("valWardId").textContent = p.ward_id || "—";

  if (p.quy_hoach) {
    boxQuyHoachEl.hidden = false;
    valQuyHoachEl.textContent = p.quy_hoach;
  } else {
    boxQuyHoachEl.hidden = true;
    valQuyHoachEl.textContent = "—";
  }

  syncParcelInfoOutputs(p, meta);

  currentShareState = meta.share || null;
  shareLinkBtnEl.disabled = !currentShareState;
  mobileShareBtnEl.hidden = !currentShareState;
  currentParcelData = p;
  currentParcelMeta = meta;
  redrawParcelBtnEl.disabled = !p.geometry_obj;

  const canCrossCompare =
    !isDrawn &&
    Boolean(meta.location?.x != null && meta.location?.y != null);
  compareEraBtnEl.hidden = !canCrossCompare;
  if (canCrossCompare) {
    compareEraBtnLabelEl.textContent = isOld
      ? "Đối chiếu sang Sau sáp nhập (2026)"
      : "Đối chiếu sang Trước sáp nhập (Cũ)";
  }

  if (currentShareState) {
    syncBrowserShareUrl();
  }
  drawLayerGroup.clearLayers();

  document.body.classList.add("has-parcel-result");
  const titleText = `Tờ ${p.so_to} - Thửa ${p.so_thua}`;
  const areaText =
    p.dien_tich != null ? `${formatNumber(p.dien_tich)} m²` : "—";
  mobileTopTitleEl.textContent = titleText;
  mobileTopSubEl.textContent = p.xa_phuong || "Tây Ninh";
  mobileResultTitleEl.textContent = titleText;
  mobileResultMetaEl.textContent = `${p.xa_phuong || "—"} • ${p.loai_dat || "—"} • ${areaText}`;

  infoCardEl.classList.remove("info-updated");
  void infoCardEl.offsetWidth;
  infoCardEl.classList.add("info-updated");

  if (isCompactViewport()) {
    closeMobileModals();
  }

  const targetGroup = isDrawn ? drawnOverlayGroup : parcelLayerGroup;
  targetGroup.clearLayers();
  if (isDrawn) {
    clearDrawnShapeBtnEl.hidden = false;
  }

  if (p.geometry_obj) {
    const polyColor = isDrawn ? "#2563eb" : isOld ? "#d97706" : "#22c55e";
    const geoLayer = L.geoJSON(
      { type: "Feature", geometry: p.geometry_obj, properties: p },
      {
        style: {
          className: "parcel-polygon-anim",
          color: polyColor,
          weight: 3,
          fillColor: polyColor,
          fillOpacity: isDrawn ? 0.3 : 0.28,
        },
      },
    ).addTo(targetGroup);

    const qhRow = p.quy_hoach
      ? `<div><b>Quy hoạch:</b> ${escapeHtml(p.quy_hoach)}</div>`
      : "";
    const titleColor = isDrawn ? "#1d4ed8" : isOld ? "#b45309" : "#15803d";
    const eraTag = isDrawn
      ? " (Tự vẽ)"
      : isOld
        ? " (Trước sáp nhập)"
        : "";
    const deleteBtnHtml = isDrawn
      ? `<div style="margin-top:6px;"><button type="button" class="draw-vertex-delete-btn" onclick="clearFinalizedDrawnShape()">Xóa hình vẽ</button></div>`
      : "";
    const popupHtml = `
      <div style="font-size:13px;line-height:1.5;min-width:160px;">
        <div style="font-weight:700;color:${titleColor};margin-bottom:4px;">
          Tờ ${escapeHtml(p.so_to)} - Thửa ${escapeHtml(p.so_thua)}${eraTag}
        </div>
        <div><b>Xã/Phường:</b> ${escapeHtml(p.xa_phuong)}</div>
        <div><b>Loại đất:</b> ${escapeHtml(p.loai_dat || "—")}</div>
        <div><b>Diện tích:</b> ${escapeHtml(formatNumber(p.dien_tich))} m²</div>
        ${qhRow}
        ${deleteBtnHtml}
      </div>
    `;
    geoLayer.bindPopup(popupHtml, { maxWidth: 260 }).openPopup();

    const bounds = geoLayer.getBounds();
    const markerCenter =
      meta.location && meta.location.y != null && meta.location.x != null
        ? [Number(meta.location.y), Number(meta.location.x)]
        : bounds.isValid()
          ? bounds.getCenter()
          : null;

    if (markerCenter && !isDrawn) {
      L.marker(markerCenter, {
        interactive: false,
        icon: L.divIcon({
          className: "parcel-pulse-icon",
          html: '<span class="parcel-pulse-ring"></span><span class="parcel-pulse-dot"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(targetGroup);
    }

    if (!skipFly) {
      flyMapToBounds(bounds);
    }
  }
}

async function handleCompareOppositeEra() {
  const loc = currentParcelMeta?.location;
  if (!loc || loc.x == null || loc.y == null) return;

  const targetEra = currentParcelMeta.era === "old" ? "new" : "old";
  compareEraBtnEl.disabled = true;
  compareEraBtnLabelEl.textContent = "Đang tìm thửa đối chiếu...";

  try {
    const res = await autoLookupCoordAcrossWards(
      targetEra,
      Number(loc.x),
      Number(loc.y),
    );
    compareOverlayGroup.clearLayers();
    if (!res || !res.found) {
      compareEraBoxEl.hidden = false;
      compareEraBoxEl.innerHTML = `<div class="compare-empty">Không tìm thấy thửa ${targetEra === "old" ? "trước sáp nhập" : "sau sáp nhập (2026)"} tại tọa độ tâm này.</div>`;
      return;
    }

    const cp = res.parcel;
    const isCmpOld = targetEra === "old";
    const cmpColor = isCmpOld ? "#d97706" : "#16a34a";
    const cmpLayer = L.geoJSON(
      { type: "Feature", geometry: cp.geometry_obj, properties: cp },
      {
        style: {
          className: "parcel-polygon-anim",
          color: cmpColor,
          weight: 2.5,
          dashArray: "6 4",
          fillColor: cmpColor,
          fillOpacity: 0.16,
        },
      },
    ).addTo(compareOverlayGroup);

    const cmpLabel = isCmpOld ? "Trước sáp nhập (Cũ)" : "Sau sáp nhập (2026)";
    const qhLine = cp.quy_hoach
      ? `<div><b>Quy hoạch cũ:</b> ${escapeHtml(cp.quy_hoach)}</div>`
      : "";
    cmpLayer.bindPopup(
      `<div style="font-size:13px;line-height:1.5;min-width:165px;">
        <div style="font-weight:700;color:${cmpColor};margin-bottom:4px;">
          Đối chiếu ${cmpLabel}
        </div>
        <div><b>Tờ / Thửa:</b> ${escapeHtml(cp.so_to)} - ${escapeHtml(cp.so_thua)}</div>
        <div><b>Xã:</b> ${escapeHtml(cp.xa_phuong)}</div>
        <div><b>Loại đất:</b> ${escapeHtml(cp.loai_dat || "—")} • ${escapeHtml(formatNumber(cp.dien_tich))} m²</div>
        ${qhLine}
      </div>`,
      { maxWidth: 270 },
    );

    compareEraBoxEl.hidden = false;
    compareEraBoxEl.innerHTML = `
      <div class="compare-box-header">
        <strong>${cmpLabel}</strong>
        <button type="button" class="compare-clear-btn" onclick="clearCompareOverlay()">Tắt</button>
      </div>
      <div><b>Xã:</b> ${escapeHtml(cp.xa_phuong)}</div>
      <div><b>Tờ / Thửa:</b> Tờ ${escapeHtml(cp.so_to)} • Thửa ${escapeHtml(cp.so_thua)}</div>
      <div><b>Loại đất &amp; Diện tích:</b> ${escapeHtml(cp.loai_dat || "—")} • ${escapeHtml(formatNumber(cp.dien_tich))} m²</div>
      ${qhLine}
    `;
  } catch (err) {
    compareEraBoxEl.hidden = false;
    compareEraBoxEl.innerHTML = `<div class="compare-empty">Lỗi đối chiếu: ${escapeHtml(err.message)}</div>`;
  } finally {
    compareEraBtnEl.disabled = false;
    compareEraBtnLabelEl.textContent =
      currentParcelMeta?.era === "old"
        ? "Đối chiếu sang Sau sáp nhập (2026)"
        : "Đối chiếu sang Trước sáp nhập (Cũ)";
  }
}

function updateWardHint() {
  if (searchEra === "old") {
    const w = oldWardsByKey[wardSelectEl.value];
    if (!w || !w.sheets?.length) {
      wardHintEl.textContent = "Chưa có dữ liệu tờ bản đồ trước sáp nhập.";
      return;
    }
    const min = w.sheets[0];
    const max = w.sheets[w.sheets.length - 1];
    wardHintEl.textContent = `Thuộc ${w.newName} • ${w.sheetCount} tờ (từ tờ ${min} đến ${max}) • ${w.parcelCount.toLocaleString("vi-VN")} thửa`;
    return;
  }

  const w = newWardsById[wardSelectEl.value];
  const sheets = w?.sheets || [];
  if (!sheets.length) {
    wardHintEl.textContent = "Chưa có dữ liệu tờ bản đồ tĩnh.";
    return;
  }

  const nums = sheets
    .map((s) => {
      const m = s.match(/\d+/);
      return m ? Number(m[0]) : null;
    })
    .filter((n) => n != null);
  const rangeText = nums.length
    ? ` (từ tờ ${Math.min(...nums)} đến ${Math.max(...nums)})`
    : "";
  wardHintEl.textContent = `Có ${sheets.length} tờ bản đồ${rangeText} • ${w.parcelCount.toLocaleString("vi-VN")} thửa`;
}

function updateCoordWardHint() {
  const val = coordWardSelectEl.value;
  if (val === "__all__") {
    if (searchEra === "old") {
      const count = Object.keys(oldSpatialWardsByKey).length;
      coordWardHintEl.textContent = `Tự động tìm chính xác trong cả ${count} xã cũ trước sáp nhập`;
    } else {
      const count = Object.keys(spatialWardsById).length;
      coordWardHintEl.textContent = `Tự động tìm chính xác trong ${count} xã mới (Mỹ Lộc, Phước Lý)`;
    }
    return;
  }

  if (searchEra === "old") {
    const w = oldSpatialWardsByKey[val];
    coordWardHintEl.textContent = w
      ? `Thuộc ${w.newName} • Sẵn sàng ${w.parcelCount.toLocaleString("vi-VN")} thửa cũ`
      : "Chưa có dữ liệu tọa độ trước sáp nhập.";
    return;
  }

  const w = spatialWardsById[val];
  coordWardHintEl.textContent = w
    ? `Đã sẵn sàng ${w.parcelCount.toLocaleString("vi-VN")} thửa đất`
    : "Chưa có dữ liệu tọa độ tĩnh.";
}

function switchSearchTab(mode) {
  const isCoord = mode === "coord";
  tabPlotBtnEl.classList.toggle("active", !isCoord);
  tabCoordBtnEl.classList.toggle("active", isCoord);
  tabPlotBtnEl.setAttribute("aria-selected", String(!isCoord));
  tabCoordBtnEl.setAttribute("aria-selected", String(isCoord));
  plotPanelEl.hidden = isCoord;
  coordPanelEl.hidden = !isCoord;
  if (!isCoord) setMapPicking(false);
}

function setMapPicking(active) {
  if (active && drawModeActive) setMapDrawing(false);
  mapPickActive = active;
  document.body.classList.toggle("map-picking", active);
  pickOnMapBtnEl.classList.toggle("btn-pick-active", active);
  if (active && isCompactViewport()) {
    closeMobileModals();
  }
}

function parseCoordValue(raw) {
  const cleaned = String(raw || "").trim().replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function trySplitCombinedCoords(rawText) {
  const parts = String(rawText || "")
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (parts.length !== 2) return false;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a >= 8 && a <= 24 && b >= 100 && b <= 112) {
    latInputEl.value = String(a);
    lngInputEl.value = String(b);
    return true;
  }
  if (b >= 8 && b <= 24 && a >= 100 && a <= 112) {
    lngInputEl.value = String(a);
    latInputEl.value = String(b);
    return true;
  }
  return false;
}

async function resolveCoordResult(wardKey, lng, lat) {
  if (wardKey === "__all__") {
    return autoLookupCoordAcrossWards(searchEra, lng, lat);
  }
  return searchEra === "old"
    ? lookupOldParcelByCoord(wardKey, lng, lat)
    : lookupParcelByCoord(wardKey, lng, lat);
}

async function handleCoordSearch() {
  const wardKey = coordWardSelectEl.value || "__all__";
  const lng = parseCoordValue(lngInputEl.value);
  const lat = parseCoordValue(latInputEl.value);

  if (lng === null || lat === null) {
    setStatus(
      "warn",
      "Vui lòng nhập đầy đủ Kinh độ (Lng) và Vĩ độ (Lat) hợp lệ.",
    );
    return;
  }
  if (lng < 100 || lng > 112 || lat < 8 || lat > 24) {
    setStatus(
      "warn",
      "Tọa độ có vẻ bị ngược hoặc ngoài khu vực Tây Ninh (Lng ~106.x, Lat ~10.x).",
    );
    return;
  }

  coordSearchBtnEl.disabled = true;
  const wardLabel =
    wardKey === "__all__"
      ? searchEra === "old"
        ? "cả 6 xã cũ"
        : "Mỹ Lộc & Phước Lý"
      : searchEra === "old"
        ? oldSpatialWardsByKey[wardKey]?.oldName || wardKey
        : spatialWardsById[wardKey]?.address || wardKey;
  setStatus(
    "loading",
    `Đang dò thửa đất (${wardLabel}) tại (${lng.toFixed(6)}, ${lat.toFixed(6)})...`,
  );

  try {
    const result = await resolveCoordResult(wardKey, lng, lat);
    if (result && result.found) {
      const matchedWard = result.meta?.wardKey || wardKey;
      result.meta = {
        ...(result.meta || {}),
        share: {
          era: searchEra,
          mode: "coord",
          ward: matchedWard,
          lng: lng.toFixed(6),
          lat: lat.toFixed(6),
        },
      };
      setStatus(
        "ok",
        `Tìm thấy thửa ${result.parcel.so_thua} (tờ ${result.parcel.so_to} - ${result.parcel.xa_phuong}) tại (${lng.toFixed(6)}, ${lat.toFixed(6)}).`,
      );
      renderParcel(result);
      L.circleMarker([lat, lng], {
        radius: 5,
        color: "#dc2626",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      })
        .bindTooltip(`Điểm tra cứu: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        .addTo(parcelLayerGroup);
    } else {
      setStatus(
        "warn",
        `Không tìm thấy thửa đất nào chứa tọa độ (${lng.toFixed(6)}, ${lat.toFixed(6)}) trong ${wardLabel}.`,
      );
      if (
        isCompactViewport() &&
        !document.body.classList.contains("mobile-search-open")
      ) {
        openSearchModal();
      } else {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.65 });
      }
    }
  } catch (err) {
    setStatus("err", `Lỗi tra cứu tọa độ: ${err.message}`);
  } finally {
    coordSearchBtnEl.disabled = false;
  }
}

async function handleSearch() {
  const wardKey = wardSelectEl.value;
  const sheetRaw = sheetInputEl.value.trim();
  const plotRaw = plotInputEl.value.trim();

  if (!wardKey) {
    setStatus("warn", "Vui lòng chọn Xã / Phường.");
    return;
  }
  if (!sheetRaw) {
    setStatus("warn", "Vui lòng nhập số Tờ bản đồ.");
    sheetInputEl.focus();
    return;
  }
  if (!plotRaw) {
    setStatus("warn", "Vui lòng nhập Số thửa.");
    plotInputEl.focus();
    return;
  }

  if (searchEra === "old") {
    const sheetName = findOldSheet(wardKey, sheetRaw);
    if (!sheetName) {
      const wardName = oldWardsByKey[wardKey]?.oldName || wardKey;
      setStatus("warn", `Không tìm thấy tờ "${sheetRaw}" trong ${wardName}.`);
      return;
    }

    searchBtnEl.disabled = true;
    setStatus(
      "loading",
      `Đang nạp dữ liệu trước sáp nhập: Tờ ${sheetName}, thửa ${plotRaw}...`,
    );
    try {
      const data = await lookupOldParcelByPlot(wardKey, sheetName, plotRaw);
      if (data.found) {
        data.meta = {
          ...(data.meta || {}),
          share: {
            era: "old",
            mode: "plot",
            ward: wardKey,
            to: sheetName,
            thua: plotRaw,
          },
        };
        setStatus(
          "ok",
          `Tìm thấy thửa ${data.parcel.so_thua} (Tờ ${data.parcel.so_to} - ${oldWardsByKey[wardKey]?.oldName}).`,
        );
        renderParcel(data);
      } else {
        setStatus(
          "warn",
          `Không tìm thấy thửa ${plotRaw} trong tờ ${sheetName} (${oldWardsByKey[wardKey]?.oldName}).`,
        );
      }
    } catch (err) {
      setStatus("err", `Lỗi tra cứu trước sáp nhập: ${err.message}`);
    } finally {
      searchBtnEl.disabled = false;
    }
    return;
  }

  const sheetName = findSheetInWard(wardKey, sheetRaw);
  if (!sheetName) {
    const wardName = newWardsById[wardKey]?.address || wardKey;
    setStatus("warn", `Không tìm thấy tờ "${sheetRaw}" trong ${wardName}.`);
    return;
  }

  searchBtnEl.disabled = true;
  setStatus(
    "loading",
    `Đang nạp dữ liệu tĩnh: ${sheetName.toUpperCase()}, thửa ${plotRaw}...`,
  );

  try {
    const data = await lookupNewParcelByPlot(wardKey, sheetName, plotRaw);
    if (data.found) {
      data.meta = {
        ...(data.meta || {}),
        share: {
          era: "new",
          mode: "plot",
          ward: wardKey,
          to: sheetName,
          thua: plotRaw,
        },
      };
      setStatus(
        "ok",
        `Tìm thấy thửa ${data.parcel.so_thua} (${data.parcel.so_to}).`,
      );
      renderParcel(data);
    } else {
      setStatus(
        "warn",
        `Không tìm thấy thông tin thửa ${plotRaw} của tờ ${sheetName.toUpperCase()}.`,
      );
    }
  } catch (err) {
    setStatus("err", `Lỗi tra cứu: ${err.message}`);
  } finally {
    searchBtnEl.disabled = false;
  }
}

function buildShareUrl() {
  if (!currentShareState) return "";
  const params = new URLSearchParams();
  if (currentShareState.era === "old") params.set("era", "old");
  if (currentShareState.mode === "coord") {
    params.set("mode", "coord");
    if (currentShareState.ward) params.set("ward", currentShareState.ward);
    params.set("lng", currentShareState.lng);
    params.set("lat", currentShareState.lat);
  } else {
    if (currentShareState.ward) params.set("ward", currentShareState.ward);
    if (currentShareState.to) params.set("to", currentShareState.to);
    if (currentShareState.thua) params.set("thua", currentShareState.thua);
  }
  const base = `${window.location.origin === "null" ? "" : window.location.origin}${window.location.pathname}`;
  return `${base}?${params.toString()}`;
}

function syncBrowserShareUrl() {
  const shareUrl = buildShareUrl();
  if (!shareUrl || window.location.protocol === "file:") return;
  try {
    window.history.replaceState(null, "", shareUrl);
  } catch {}
}

async function copyStringToClipboard(text, selectEl = null) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    if (selectEl) {
      selectEl.select();
      document.execCommand("copy");
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }
}

const copyTimers = new WeakMap();
function flashButtonLabel(btnEl, okText, defaultText, targetNode = null) {
  const node = targetNode || btnEl;
  node.textContent = okText;
  clearTimeout(copyTimers.get(btnEl));
  copyTimers.set(
    btnEl,
    setTimeout(() => {
      node.textContent = defaultText;
    }, 1600),
  );
}

async function copyTextWithFeedback(textEl, btnEl, defaultLabel, okMsg) {
  if (!textEl.value) return;
  await copyStringToClipboard(textEl.value, textEl);
  setStatus("ok", okMsg);
  flashButtonLabel(btnEl, "✓ Đã copy", defaultLabel);
}

async function shareCurrentParcelLink(btnEl, textNode, defaultLabel) {
  const shareUrl = buildShareUrl();
  if (!shareUrl) return;
  await copyStringToClipboard(shareUrl);
  setStatus("ok", "Đã copy link chia sẻ thửa đất.");
  flashButtonLabel(
    btnEl,
    textNode ? "✓ Đã copy link" : "✓",
    defaultLabel,
    textNode,
  );
}

function populateGroupedOldSelect(selectEl, wards) {
  const groups = new Map();
  wards.forEach((w) => {
    const groupLabel = `Thuộc ${w.newName} (mới - ${w.newWardId})`;
    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel).push(w);
  });
  for (const [label, items] of groups.entries()) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = label;
    items.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w.oldKey;
      opt.textContent = `${w.oldName} (${w.oldWardId})`;
      optgroup.appendChild(opt);
    });
    selectEl.appendChild(optgroup);
  }
}

function populatePlotWardSelect() {
  wardSelectEl.innerHTML = "";
  if (searchEra === "old") {
    const oldWards = Object.values(oldWardsByKey);
    populateGroupedOldSelect(wardSelectEl, oldWards);
    if (oldWards.length && !oldWardsByKey[wardSelectEl.value]) {
      wardSelectEl.value = oldWards[0].oldKey;
    }
    sheetInputEl.placeholder = "Vd: 10";
    plotInputEl.placeholder = "Vd: 141";
    updateWardHint();
    return;
  }

  const wards = Object.values(newWardsById)
    .slice()
    .sort((a, b) => a.address.localeCompare(b.address, "vi"));
  wards.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.wardId;
    opt.textContent = `${w.address} (${w.wardId})`;
    wardSelectEl.appendChild(opt);
  });
  if (wards.some((w) => w.wardId === "28177")) {
    wardSelectEl.value = "28177";
  }
  sheetInputEl.placeholder = "Vd: 71 hoặc dc71";
  plotInputEl.placeholder = "Vd: 51";
  updateWardHint();
}

function populateCoordWardSelect() {
  coordWardSelectEl.innerHTML = "";
  const autoOpt = document.createElement("option");
  autoOpt.value = "__all__";
  autoOpt.textContent =
    searchEra === "old"
      ? "Tự động nhận diện (Cả 6 xã cũ)"
      : "Tự động nhận diện (Mỹ Lộc & Phước Lý)";
  coordWardSelectEl.appendChild(autoOpt);

  if (searchEra === "old") {
    populateGroupedOldSelect(
      coordWardSelectEl,
      Object.values(oldSpatialWardsByKey),
    );
  } else {
    Object.values(spatialWardsById).forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w.wardId;
      opt.textContent = `${w.address} (${w.wardId})`;
      coordWardSelectEl.appendChild(opt);
    });
  }
  coordWardSelectEl.value = "__all__";
  updateCoordWardHint();
}

function switchEra(era) {
  if (era === searchEra) return;
  searchEra = era === "old" ? "old" : "new";
  const isOld = searchEra === "old";
  eraNewBtnEl.classList.toggle("active", !isOld);
  eraOldBtnEl.classList.toggle("active", isOld);
  eraNewBtnEl.setAttribute("aria-selected", String(!isOld));
  eraOldBtnEl.setAttribute("aria-selected", String(isOld));
  populatePlotWardSelect();
  populateCoordWardSelect();
  clearStatus();
}

function init() {
  const data = window.NEW_PARCEL_MANIFEST;
  if (!data || !Array.isArray(data.wards)) {
    catalogInfoEl.textContent = "Lỗi tải dữ liệu tĩnh.";
    mobileTopSubEl.textContent = "Lỗi tải dữ liệu tĩnh";
    setStatus("err", "Không tìm thấy dữ liệu trong ./new_sheets/manifest.js.");
    return;
  }

  newWardsById = Object.fromEntries(data.wards.map((w) => [w.wardId, w]));
  const oldCount = window.OLD_PARCEL_MANIFEST?.totalWards || 0;
  const summaryText = oldCount
    ? `Mỹ Lộc & Phước Lý (${data.totalSheets} tờ mới + ${oldCount} xã cũ)`
    : `${data.totalWards} xã • ${data.totalSheets.toLocaleString("vi-VN")} tờ bản đồ`;
  catalogInfoEl.textContent = summaryText;
  mobileTopSubEl.textContent = `${summaryText} • Chạm để tra cứu`;
  populatePlotWardSelect();
}

function initSpatialManifest() {
  const manifest = window.SPATIAL_MANIFEST;
  const wards = (
    manifest && Array.isArray(manifest.wards) ? manifest.wards : []
  )
    .slice()
    .sort((a, b) => a.address.localeCompare(b.address, "vi"));

  spatialWardsById = Object.fromEntries(wards.map((w) => [w.wardId, w]));
  populateCoordWardSelect();
}

function initOldManifests() {
  const oldSheets = window.OLD_PARCEL_MANIFEST;
  const oldWards =
    oldSheets && Array.isArray(oldSheets.wards) ? oldSheets.wards : [];
  oldWardsByKey = Object.fromEntries(oldWards.map((w) => [w.oldKey, w]));

  const oldSpatial = window.OLD_SPATIAL_MANIFEST;
  const oldSpWards =
    oldSpatial && Array.isArray(oldSpatial.wards) ? oldSpatial.wards : [];
  oldSpatialWardsByKey = Object.fromEntries(
    oldSpWards.map((w) => [w.oldKey, w]),
  );
}

function showGpsLocationMarker(lat, lng, accuracy) {
  gpsLayerGroup.clearLayers();
  if (Number.isFinite(accuracy) && accuracy > 0) {
    L.circle([lat, lng], {
      radius: Math.min(accuracy, 500),
      color: "#2563eb",
      weight: 1,
      fillColor: "#3b82f6",
      fillOpacity: 0.14,
      interactive: false,
    }).addTo(gpsLayerGroup);
  }
  const accText =
    Number.isFinite(accuracy) && accuracy > 0
      ? ` (±${Math.round(accuracy)}m)`
      : "";
  return L.marker([lat, lng], {
    zIndexOffset: 500,
    icon: L.divIcon({
      className: "gps-marker-icon",
      html: '<span class="gps-marker-ring"></span><span class="gps-marker-dot"></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
  })
    .bindTooltip(
      `Vị trí hiện tại: ${lat.toFixed(6)}, ${lng.toFixed(6)}${accText}`,
    )
    .addTo(gpsLayerGroup);
}

function handleGetCurrentLocation(fromMapControl = false) {
  const notifyError = (type, msg) => {
    setStatus(type, msg);
    if (fromMapControl && isCompactViewport()) {
      switchSearchTab("coord");
      openSearchModal();
    }
  };

  if (window.isSecureContext === false) {
    notifyError(
      "warn",
      "Trình duyệt yêu cầu HTTPS hoặc localhost để lấy tọa độ GPS.",
    );
    return;
  }
  if (!navigator.geolocation) {
    notifyError("err", "Trình duyệt không hỗ trợ lấy vị trí GPS.");
    return;
  }

  currentLocationBtnEl.disabled = true;
  if (mapLocateBtnEl) mapLocateBtnEl.classList.add("is-loading");
  setStatus("loading", "Đang lấy tọa độ GPS hiện tại...");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      currentLocationBtnEl.disabled = false;
      if (mapLocateBtnEl) {
        mapLocateBtnEl.classList.remove("is-loading");
        mapLocateBtnEl.classList.add("is-active");
      }
      const lng = pos.coords.longitude;
      const lat = pos.coords.latitude;
      lngInputEl.value = lng.toFixed(6);
      latInputEl.value = lat.toFixed(6);

      const gpsMarker = showGpsLocationMarker(lat, lng, pos.coords.accuracy);

      if (fromMapControl) {
        if (prefersReducedMotion()) {
          map.setView([lat, lng], Math.max(map.getZoom(), 17));
        } else {
          map.flyTo([lat, lng], Math.max(map.getZoom(), 17), {
            duration: 0.85,
            easeLinearity: 0.25,
          });
        }
        gpsMarker.openTooltip();
        const wardKey = coordWardSelectEl.value || "__all__";
        if (lng >= 100 && lng <= 112 && lat >= 8 && lat <= 24) {
          const res = await resolveCoordResult(wardKey, lng, lat);
          if (res && res.found) {
            const matchedWard = res.meta?.wardKey || wardKey;
            res.meta = {
              ...(res.meta || {}),
              share: {
                era: searchEra,
                mode: "coord",
                ward: matchedWard,
                lng: lng.toFixed(6),
                lat: lat.toFixed(6),
              },
            };
            setStatus(
              "ok",
              `Tìm thấy thửa ${res.parcel.so_thua} (tờ ${res.parcel.so_to}) tại vị trí hiện tại.`,
            );
            renderParcel(res);
          }
        }
        return;
      }

      if (lng < 100 || lng > 112 || lat < 8 || lat > 24) {
        setStatus(
          "warn",
          `Đã ghim vị trí hiện tại (${lat.toFixed(6)}, ${lng.toFixed(6)}) — tọa độ nằm ngoài Tây Ninh.`,
        );
        map.flyTo([lat, lng], 16, { duration: 0.8 });
        return;
      }

      handleCoordSearch();
    },
    (err) => {
      currentLocationBtnEl.disabled = false;
      if (mapLocateBtnEl) mapLocateBtnEl.classList.remove("is-loading");
      if (err.code === 1) {
        notifyError("warn", "Bạn đã từ chối quyền truy cập vị trí GPS.");
      } else if (err.code === 2) {
        notifyError("err", "Không xác định được vị trí GPS hiện tại.");
      } else if (err.code === 3) {
        notifyError("warn", "Quá thời gian chờ lấy vị trí GPS.");
      } else {
        notifyError("err", `Lỗi lấy vị trí GPS: ${err.message}`);
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
  );
}

function restoreFromUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const to = (params.get("to") || "").trim();
  const thua = (params.get("thua") || "").trim();
  const lng = (params.get("lng") || "").trim();
  const lat = (params.get("lat") || "").trim();
  if (!to && !thua && !lng && !lat) return;

  const era = params.get("era") === "old" ? "old" : "new";
  switchEra(era);

  let ward = (params.get("ward") || "").trim();
  if (era === "old" && ward && ward !== "__all__" && !ward.startsWith("cu_")) {
    const byId = Object.values(oldWardsByKey).find((w) => w.oldWardId === ward);
    if (byId) ward = byId.oldKey;
  }

  const mode =
    params.get("mode") === "coord" || (lng && lat) ? "coord" : "plot";
  if (mode === "coord") {
    if (
      ward &&
      Array.from(coordWardSelectEl.options).some((o) => o.value === ward)
    ) {
      coordWardSelectEl.value = ward;
      updateCoordWardHint();
    }
    lngInputEl.value = lng;
    latInputEl.value = lat;
    switchSearchTab("coord");
    handleCoordSearch();
    return;
  }

  if (ward && Array.from(wardSelectEl.options).some((o) => o.value === ward)) {
    wardSelectEl.value = ward;
    updateWardHint();
  }
  sheetInputEl.value = to;
  plotInputEl.value = thua;
  switchSearchTab("plot");
  handleSearch();
}

// Gắn sự kiện UI
wardSelectEl.addEventListener("change", () => {
  updateWardHint();
  const center =
    searchEra === "old"
      ? oldWardsByKey[wardSelectEl.value]?.center || null
      : newWardsById[wardSelectEl.value]?.center || null;
  if (center) {
    if (prefersReducedMotion()) {
      map.setView(center, 14);
    } else {
      map.flyTo(center, 14, { duration: 0.85, easeLinearity: 0.25 });
    }
  }
});

coordWardSelectEl.addEventListener("change", () => {
  updateCoordWardHint();
  const val = coordWardSelectEl.value;
  if (val === "__all__") return;
  const w =
    searchEra === "old" ? oldSpatialWardsByKey[val] : spatialWardsById[val];
  if (w && Array.isArray(w.center)) {
    if (prefersReducedMotion()) {
      map.setView(w.center, 14);
    } else {
      map.flyTo(w.center, 14, { duration: 0.85, easeLinearity: 0.25 });
    }
  }
});

searchBtnEl.addEventListener("click", handleSearch);
[sheetInputEl, plotInputEl].forEach((inputEl) => {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });
});

coordSearchBtnEl.addEventListener("click", handleCoordSearch);
[lngInputEl, latInputEl].forEach((inputEl) => {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCoordSearch();
  });
  inputEl.addEventListener("paste", (e) => {
    const text = e.clipboardData?.getData("text");
    if (text && trySplitCombinedCoords(text)) {
      e.preventDefault();
    }
  });
});

copyBtnEl.addEventListener("click", () =>
  copyTextWithFeedback(
    geoOutputEl,
    copyBtnEl,
    "Copy GeoJSON",
    "Đã copy Polygon GeoJSON.",
  ),
);
copyWktBtnEl.addEventListener("click", () =>
  copyTextWithFeedback(
    wktOutputEl,
    copyWktBtnEl,
    "Copy WKT",
    "Đã copy Polygon WKT.",
  ),
);
shareLinkBtnEl.addEventListener("click", () => {
  const labelEl = shareLinkBtnEl.querySelector("span");
  shareCurrentParcelLink(shareLinkBtnEl, labelEl, "Chia sẻ link");
});

const mobileShareDefaultHtml = mobileShareBtnEl.innerHTML;
mobileShareBtnEl.addEventListener("click", () => {
  const shareUrl = buildShareUrl();
  if (!shareUrl) return;
  copyStringToClipboard(shareUrl).then(() => {
    setStatus("ok", "Đã copy link chia sẻ thửa đất.");
    mobileShareBtnEl.textContent = "✓";
    clearTimeout(copyTimers.get(mobileShareBtnEl));
    copyTimers.set(
      mobileShareBtnEl,
      setTimeout(() => {
        mobileShareBtnEl.innerHTML = mobileShareDefaultHtml;
      }, 1600),
    );
  });
});

eraNewBtnEl.addEventListener("click", () => switchEra("new"));
eraOldBtnEl.addEventListener("click", () => switchEra("old"));
tabPlotBtnEl.addEventListener("click", () => switchSearchTab("plot"));
tabCoordBtnEl.addEventListener("click", () => switchSearchTab("coord"));
bannerUndoDrawBtnEl.addEventListener("click", undoDrawPoint);
bannerFinishDrawBtnEl.addEventListener("click", finishDrawing);
bannerCancelDrawBtnEl.addEventListener("click", () => setMapDrawing(false));
redrawParcelBtnEl.addEventListener("click", startRedrawFromCurrentParcel);
compareEraBtnEl.addEventListener("click", handleCompareOppositeEra);

closePasteCardBtnEl.addEventListener("click", () => {
  togglePasteOverlayCard(false);
});
mapDrawBtnEl.addEventListener("click", () => {
  setMapDrawing(!drawModeActive);
});
mapPasteBtnEl.addEventListener("click", () => {
  togglePasteOverlayCard();
});
clearDrawnShapeBtnEl.addEventListener("click", clearFinalizedDrawnShape);
pastePolyRunBtnEl.addEventListener("click", handlePastePolygon);
pastePolyClearBtnEl.addEventListener("click", () => {
  clearPastedOverlay();
  pastePolyInputEl.focus();
});
pastePolyInputEl.addEventListener("paste", () => {
  setTimeout(handlePastePolygon, 20);
});
pastePolyInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handlePastePolygon();
  }
});

currentLocationBtnEl.addEventListener("click", () =>
  handleGetCurrentLocation(false),
);
pickOnMapBtnEl.addEventListener("click", () => {
  setMapPicking(!mapPickActive);
});
cancelPickBtnEl.addEventListener("click", () => {
  setMapPicking(false);
});

map.on("click", (e) => {
  if (drawModeActive) {
    if (!drawEditExisting) addDrawPoint(e.latlng);
    return;
  }
  if (!mapPickActive) return;
  setMapPicking(false);
  lngInputEl.value = e.latlng.lng.toFixed(6);
  latInputEl.value = e.latlng.lat.toFixed(6);
  switchSearchTab("coord");
  handleCoordSearch();
});

mobileOpenSearchBtnEl.addEventListener("click", openSearchModal);
mobileReSearchBtnEl.addEventListener("click", openSearchModal);
mobileOpenInfoBtnEl.addEventListener("click", openInfoModal);
mobileDetailBtnEl.addEventListener("click", openInfoModal);
closeSearchModalBtnEl.addEventListener("click", closeMobileModals);
closeInfoModalBtnEl.addEventListener("click", closeMobileModals);
mobileBackdropEl.addEventListener("click", closeMobileModals);

sidebarCollapseBtnEl.addEventListener("click", () => {
  setMapFullscreen(true);
});

mapFullscreenBtnEl.addEventListener("click", () => {
  setMapFullscreen(!document.body.classList.contains("map-fullscreen"));
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (drawModeActive) {
    setMapDrawing(false);
    return;
  }
  if (!pasteOverlayCardEl.hidden) {
    togglePasteOverlayCard(false);
    return;
  }
  if (mapPickActive) {
    setMapPicking(false);
    return;
  }
  if (
    document.body.classList.contains("mobile-search-open") ||
    document.body.classList.contains("mobile-info-open")
  ) {
    closeMobileModals();
    return;
  }
  if (document.body.classList.contains("map-fullscreen")) {
    setMapFullscreen(false);
  }
});

const handleViewportChange = () => {
  if (!isCompactViewport()) {
    closeMobileModals();
  } else {
    syncMobileModalA11y();
  }
  refreshMapSize();
};

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", handleViewportChange);
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(refreshMapSize).observe(mapWrapEl);
}

initOldManifests();
init();
initSpatialManifest();
restoreFromUrlParams();

