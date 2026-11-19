/** Công cụ vẽ mới & chỉnh sửa góc Polygon trực tiếp trên bản đồ Leaflet. */

let drawModeActive = false;
let drawEditExisting = false;
let drawPoints = [];
let drawHistory = [];
let drawnBaseMeta = null;

function buildDrawnPolygonState(pts) {
  const ring = pts.map(([lat, lng]) => [
    Number(lng.toFixed(6)),
    Number(lat.toFixed(6)),
  ]);
  const closedRing = [...ring, ring[0]];
  const areaM2 = Math.round(computeRingAreaM2(ring) * 10) / 10;
  const geomObj = { type: "Polygon", coordinates: [closedRing] };
  const center = computeGeometryCenter(geomObj);
  return { geomObj, areaM2, center };
}

function pushDrawHistory() {
  drawHistory.push(drawPoints.map(([lat, lng]) => [lat, lng]));
  if (drawHistory.length > 50) drawHistory.shift();
}

function updateDrawUiStats() {
  const n = drawPoints.length;
  const canFinish = n >= 3;
  bannerUndoDrawBtnEl.disabled = drawHistory.length === 0;
  bannerFinishDrawBtnEl.disabled = !canFinish;

  const prefix = drawEditExisting ? "Sửa góc" : "Vẽ mới";
  let summary = `${prefix}: ${n} đỉnh (chạm bản đồ để thêm)`;
  if (canFinish) {
    const { areaM2 } = buildDrawnPolygonState(drawPoints);
    summary = `${prefix}: ${n} đỉnh • ~${formatNumber(areaM2)} m²`;
  }
  mapDrawStatusEl.textContent = summary;
}

function syncLiveOutputsDuringEdit() {
  if (drawPoints.length < 3) return;
  const { geomObj, areaM2, center } = buildDrawnPolygonState(drawPoints);
  geoOutputEl.value = JSON.stringify(geomObj);
  wktOutputEl.value = geometryToWkt(geomObj);
  copyBtnEl.disabled = false;
  copyWktBtnEl.disabled = false;
  document.getElementById("valDienTich").textContent =
    `${formatNumber(areaM2)} m²`;
  document.getElementById("valDienTichM2").textContent =
    `${formatNumber(areaM2)} m²`;
  if (center) {
    document.getElementById("valCenter").textContent =
      `${center.y.toFixed(6)}, ${center.x.toFixed(6)}`;
  }
}

function deleteDrawVertex(idx) {
  if (drawEditExisting && drawPoints.length <= 3) {
    setStatus("warn", "Thửa đất cần tối thiểu 3 đỉnh.");
    return;
  }
  pushDrawHistory();
  drawPoints.splice(idx, 1);
  renderDrawPreview();
  syncLiveOutputsDuringEdit();
}

function renderDrawPreview() {
  drawLayerGroup.clearLayers();
  let previewShape = null;
  if (drawPoints.length >= 3) {
    previewShape = L.polygon(drawPoints, {
      interactive: false,
      color: "#2563eb",
      weight: 2.5,
      dashArray: "6 4",
      fillColor: "#3b82f6",
      fillOpacity: 0.22,
    }).addTo(drawLayerGroup);
  } else if (drawPoints.length === 2) {
    previewShape = L.polyline(drawPoints, {
      interactive: false,
      color: "#2563eb",
      weight: 2.5,
      dashArray: "6 4",
    }).addTo(drawLayerGroup);
  }

  // Chấm trung điểm giữa các cạnh để chèn đỉnh mới đúng cạnh mà không bị vắt chéo
  if (drawPoints.length >= 3) {
    const total = drawPoints.length;
    for (let i = 0; i < total; i++) {
      const p1 = drawPoints[i];
      const p2 = drawPoints[(i + 1) % total];
      const midPt = [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5];
      const midMarker = L.marker(midPt, {
        draggable: true,
        zIndexOffset: 50,
        icon: L.divIcon({
          className: "draw-vertex-icon",
          html: '<span class="draw-midpoint-dot" title="Kéo hoặc chạm để thêm đỉnh trên cạnh này"></span>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      }).addTo(drawLayerGroup);

      let insertedIdx = -1;
      midMarker.on("dragstart", (ev) => {
        pushDrawHistory();
        const ll = ev.target.getLatLng();
        insertedIdx = i + 1;
        drawPoints.splice(insertedIdx, 0, [ll.lat, ll.lng]);
        if (previewShape) previewShape.setLatLngs(drawPoints);
      });
      midMarker.on("drag", (ev) => {
        if (insertedIdx === -1) return;
        const ll = ev.target.getLatLng();
        drawPoints[insertedIdx] = [ll.lat, ll.lng];
        if (previewShape) previewShape.setLatLngs(drawPoints);
        updateDrawUiStats();
        syncLiveOutputsDuringEdit();
      });
      midMarker.on("dragend", () => {
        insertedIdx = -1;
        renderDrawPreview();
        syncLiveOutputsDuringEdit();
      });
      midMarker.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        pushDrawHistory();
        drawPoints.splice(i + 1, 0, midPt);
        renderDrawPreview();
        syncLiveOutputsDuringEdit();
      });
    }
  }

  drawPoints.forEach((pt, idx) => {
    const isFirstFresh = !drawEditExisting && idx === 0;
    const marker = L.marker(pt, {
      draggable: true,
      zIndexOffset: 200,
      icon: L.divIcon({
        className: "draw-vertex-icon",
        html: `<span class="draw-vertex-dot${isFirstFresh ? " is-first" : ""}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(drawLayerGroup);

    marker.on("dragstart", () => {
      pushDrawHistory();
    });

    marker.on("drag", (ev) => {
      const ll = ev.target.getLatLng();
      drawPoints[idx] = [ll.lat, ll.lng];
      if (previewShape) previewShape.setLatLngs(drawPoints);
      updateDrawUiStats();
      syncLiveOutputsDuringEdit();
    });

    marker.on("dragend", () => {
      renderDrawPreview();
    });

    marker.on("click", (ev) => {
      L.DomEvent.stopPropagation(ev);
      if (!drawEditExisting && idx === 0 && drawPoints.length >= 3) {
        finishDrawing();
        return;
      }
      const popupWrap = document.createElement("div");
      popupWrap.className = "draw-vertex-popup";
      const label = document.createElement("span");
      label.textContent = `Đỉnh #${idx + 1}`;
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "draw-vertex-delete-btn";
      delBtn.textContent = "Xóa đỉnh";
      delBtn.addEventListener("click", (btnEv) => {
        btnEv.stopPropagation();
        deleteDrawVertex(idx);
      });
      popupWrap.append(label, delBtn);
      marker
        .bindPopup(popupWrap, { closeButton: false, offset: [0, -6] })
        .openPopup();
    });

    marker.on("contextmenu", (ev) => {
      L.DomEvent.stop(ev);
      deleteDrawVertex(idx);
    });
  });

  updateDrawUiStats();
}

function setMapDrawing(active, keepDraft = false) {
  if (active && mapPickActive) setMapPicking(false);
  drawModeActive = active;
  document.body.classList.toggle("map-drawing", active);
  document.body.classList.toggle(
    "map-draw-editing",
    active && drawEditExisting,
  );
  if (mapDrawBtnEl) mapDrawBtnEl.classList.toggle("is-active", active);

  if (!active && !keepDraft) {
    const wasEditingParcel = Boolean(drawnBaseMeta && currentParcelData);
    clearDrawing();
    if (wasEditingParcel) {
      syncParcelInfoOutputs(currentParcelData, currentParcelMeta);
    }
    clearStatus();
  } else {
    updateDrawUiStats();
  }
  if (active && isCompactViewport()) {
    closeMobileModals();
  }
}

function addDrawPoint(latlng) {
  pushDrawHistory();
  drawPoints.push([latlng.lat, latlng.lng]);
  renderDrawPreview();
  syncLiveOutputsDuringEdit();
}

function undoDrawPoint() {
  if (!drawHistory.length) return;
  drawPoints = drawHistory.pop();
  renderDrawPreview();
  syncLiveOutputsDuringEdit();
}

function clearDrawing() {
  drawPoints = [];
  drawHistory = [];
  drawEditExisting = false;
  drawnBaseMeta = null;
  drawLayerGroup.clearLayers();
  updateDrawUiStats();
}

function finishDrawing() {
  if (drawPoints.length < 3) {
    setStatus("warn", "Cần chấm tối thiểu 3 đỉnh để tạo Polygon.");
    return;
  }
  const { geomObj, areaM2, center } = buildDrawnPolygonState(drawPoints);
  const vertexCount = drawPoints.length;
  const base = drawnBaseMeta;
  const cleanLoaiDat = (base?.loai_dat || "")
    .replace(/\s*\((?:đã vẽ lại|Tự vẽ)[^)]*\)$/i, "")
    .trim();

  const result = {
    found: true,
    parcel: {
      xa_phuong: base?.xa_phuong || "Vẽ thủ công trên bản đồ",
      ward_id: base?.ward_id || "—",
      so_to: base?.so_to || "Vẽ tay",
      so_thua: base?.so_thua || "Tùy chỉnh",
      loai_dat: cleanLoaiDat
        ? `${cleanLoaiDat} (đã vẽ lại ${vertexCount} đỉnh)`
        : `Tự vẽ (${vertexCount} đỉnh)`,
      dien_tich: areaM2,
      dien_tich_m2: areaM2,
      quy_hoach: base?.quy_hoach || "",
      polygon_geojson: JSON.stringify(geomObj),
      geometry_obj: geomObj,
    },
    meta: {
      isDrawn: true,
      location: center,
    },
  };
  setMapDrawing(false, true);
  clearDrawing();
  setStatus(
    "ok",
    `Đã tạo Polygon (${vertexCount} đỉnh, ~${formatNumber(areaM2)} m²). Bạn có thể Copy GeoJSON hoặc Copy WKT.`,
  );
  renderParcel(result);
}

function clearFinalizedDrawnShape() {
  drawnOverlayGroup.clearLayers();
  clearDrawnShapeBtnEl.hidden = true;
  if (lastOfficialResult) {
    renderParcel(lastOfficialResult, true);
  } else {
    currentParcelData = null;
    currentParcelMeta = null;
    infoEmptyEl.hidden = false;
    infoContentEl.hidden = true;
    valPlotBadgeEl.hidden = true;
    valPlotBadgeEl.classList.remove("is-old", "is-drawn");
    geoOutputEl.value = "";
    wktOutputEl.value = "";
    copyBtnEl.disabled = true;
    copyWktBtnEl.disabled = true;
    shareLinkBtnEl.disabled = true;
    redrawParcelBtnEl.disabled = true;
    compareEraBtnEl.hidden = true;
    mobileShareBtnEl.hidden = true;
    document.body.classList.remove("has-parcel-result");
  }
  clearStatus();
}

function startRedrawFromCurrentParcel() {
  const geom = currentParcelData?.geometry_obj;
  const outerRing =
    geom?.type === "MultiPolygon"
      ? geom.coordinates?.[0]?.[0]
      : geom?.coordinates?.[0];
  if (!Array.isArray(outerRing) || outerRing.length < 3) {
    setStatus("warn", "Thửa hiện tại chưa có hình học hợp lệ để vẽ lại.");
    return;
  }
  const rawPts = outerRing.map(([lng, lat]) => [lat, lng]);
  const first = rawPts[0];
  const last = rawPts[rawPts.length - 1];
  if (rawPts.length > 3 && first[0] === last[0] && first[1] === last[1]) {
    rawPts.pop();
  }
  drawnBaseMeta = {
    xa_phuong: currentParcelData.xa_phuong,
    ward_id: currentParcelData.ward_id,
    so_to: currentParcelData.so_to,
    so_thua: currentParcelData.so_thua,
    loai_dat: currentParcelData.loai_dat,
    quy_hoach: currentParcelData.quy_hoach,
  };
  drawHistory = [];
  drawEditExisting = true;
  drawPoints = rawPts;
  renderDrawPreview();
  setMapDrawing(true);
  setStatus(
    "warn",
    "Đang sửa góc: kéo đỉnh tròn để dời, kéo chấm nhỏ ở giữa cạnh để chèn đỉnh, chạm đỉnh (hoặc chuột phải) để xóa, rồi bấm Xong.",
  );
}

