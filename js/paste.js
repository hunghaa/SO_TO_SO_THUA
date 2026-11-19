/** Lớp dán Polygon độc lập (màu đỏ) dùng để đối chiếu trực quan với thửa đang tra. */

function setPasteOverlayStatus(type, text) {
  pasteOverlayStatusEl.className = "paste-overlay-status";
  if (type) pasteOverlayStatusEl.classList.add(`is-${type}`);
  pasteOverlayStatusEl.textContent = text;
}

function togglePasteOverlayCard(forceOpen = null) {
  const willOpen = forceOpen !== null ? forceOpen : pasteOverlayCardEl.hidden;
  pasteOverlayCardEl.hidden = !willOpen;
  if (mapPasteBtnEl) {
    mapPasteBtnEl.classList.toggle("is-active", willOpen);
    mapPasteBtnEl.setAttribute("aria-expanded", String(willOpen));
  }
  if (willOpen) {
    setTimeout(() => pastePolyInputEl.focus(), 40);
  }
}

function clearPastedOverlay() {
  pastedOverlayGroup.clearLayers();
  pastePolyInputEl.value = "";
  setPasteOverlayStatus(
    "",
    "Dán xong tự động bay tới (giữ nguyên thửa xanh để đối chiếu).",
  );
}

function handlePastePolygon() {
  const raw = pastePolyInputEl.value.trim();
  if (!raw) {
    setPasteOverlayStatus(
      "err",
      "Vui lòng dán chuỗi POLYGON (...) hoặc GeoJSON.",
    );
    pastePolyInputEl.focus();
    return;
  }
  const parsed = parsePastedPolygon(raw);
  if (!parsed) {
    setPasteOverlayStatus(
      "err",
      "Không đọc được định dạng Polygon. Hãy dán POLYGON ((...)) hoặc GeoJSON hợp lệ.",
    );
    return;
  }
  const { geometry, props } = parsed;
  const areaM2 = Math.round(computeGeometryAreaM2(geometry) * 10) / 10;
  const center = computeGeometryCenter(geometry);

  pastedOverlayGroup.clearLayers();
  const redLayer = L.geoJSON(
    { type: "Feature", geometry, properties: props || {} },
    {
      style: {
        className: "parcel-polygon-anim",
        color: "#dc2626",
        weight: 3,
        dashArray: "7 4",
        fillColor: "#ef4444",
        fillOpacity: 0.24,
      },
    },
  ).addTo(pastedOverlayGroup);

  const titleExtra =
    props && (props.so_to || props.soTo)
      ? ` (Tờ ${escapeHtml(props.so_to || props.soTo)} - Thửa ${escapeHtml(props.so_thua || props.soThua || "—")})`
      : "";
  const centerText = center
    ? `${center.y.toFixed(6)}, ${center.x.toFixed(6)}`
    : "—";

  redLayer
    .bindPopup(
      `<div style="font-size:13px;line-height:1.5;min-width:165px;">
        <div style="font-weight:700;color:#b91c1c;margin-bottom:4px;">
          Polygon đối chiếu (Màu đỏ)${titleExtra}
        </div>
        <div><b>Diện tích hình học:</b> ${escapeHtml(formatNumber(areaM2))} m²</div>
        <div><b>Tâm:</b> ${escapeHtml(centerText)}</div>
      </div>`,
      { maxWidth: 260 },
    )
    .openPopup();

  flyMapToBounds(redLayer.getBounds());
  setPasteOverlayStatus(
    "ok",
    `Đã vẽ lớp đỏ (~${formatNumber(areaM2)} m²) • Tâm: ${centerText}`,
  );
}

