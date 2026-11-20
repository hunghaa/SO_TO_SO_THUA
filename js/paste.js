/** Lớp Soi / Đối chiếu Polygon độc lập (màu đỏ) dùng để kiểm tra với thửa hành chính bên dưới. */

let lastPastedCenter = null;

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
  lastPastedCenter = null;
  if (pasteFindUnderBtnEl) pasteFindUnderBtnEl.hidden = true;
  setPasteOverlayStatus(
    "",
    "Tự động bay tới & vẽ màu đỏ để đối chiếu cùng thửa trên bản đồ.",
  );
}

function handlePastePolygon() {
  const raw = pastePolyInputEl.value.trim();
  if (!raw) {
    setPasteOverlayStatus(
      "err",
      "Nhập chuỗi POLYGON ((...)) hoặc GeoJSON để hiển thị lên bản đồ.",
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
  lastPastedCenter = center;
  if (pasteFindUnderBtnEl) {
    pasteFindUnderBtnEl.hidden = !(center && center.x != null && center.y != null);
  }

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

/** Dò thửa đất hành chính đang nằm bên dưới tâm của Polygon màu đỏ vừa soi. */
async function findParcelUnderPastedPolygon() {
  if (!lastPastedCenter || lastPastedCenter.x == null || lastPastedCenter.y == null) {
    setPasteOverlayStatus("err", "Hãy hiển thị một Polygon hợp lệ trước khi dò thửa bên dưới.");
    return;
  }
  const { x: lng, y: lat } = lastPastedCenter;
  pasteFindUnderBtnEl.disabled = true;
  setPasteOverlayStatus(
    "",
    `Đang dò thửa đất tại tâm (${lng.toFixed(6)}, ${lat.toFixed(6)})...`,
  );
  try {
    const result = await autoLookupCoordAcrossWards(searchEra, lng, lat);
    if (result && result.found) {
      const matchedWard = result.meta?.wardKey || "__all__";
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
        `Tìm thấy thửa ${result.parcel.so_thua} (tờ ${result.parcel.so_to} - ${result.parcel.xa_phuong}) bên dưới Polygon đỏ.`,
      );
      renderParcel(result, true);
      setPasteOverlayStatus(
        "ok",
        `Đã chồng thửa ${result.parcel.so_thua} (Tờ ${result.parcel.so_to} - ${result.parcel.xa_phuong}) bên dưới để đối chiếu.`,
      );
    } else {
      setPasteOverlayStatus(
        "err",
        `Không tìm thấy thửa đất nào tại tâm (${lng.toFixed(6)}, ${lat.toFixed(6)}).`,
      );
    }
  } catch (err) {
    setPasteOverlayStatus("err", `Lỗi dò thửa đất: ${err.message}`);
  } finally {
    pasteFindUnderBtnEl.disabled = false;
  }
}

