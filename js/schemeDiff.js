var SchemeDiff = {
  POSITION_THRESHOLD: 2,
  CONNECT_THRESHOLD: 2,

  _normalizeScheme(scheme) {
    if (!Array.isArray(scheme)) return [];
    var result = [];
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      var item = Object.assign({}, p);
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        item.id = "legacy_" + i + "_" + (item.type || "part") + "_" + (item.x || 0) + "_" + (item.y || 0);
      }
      if (item.layer === undefined || item.layer === null || isNaN(Number(item.layer))) {
        item.layer = 1;
      } else {
        item.layer = Math.round(Number(item.layer));
      }
      if (item.x === undefined || item.x === null || isNaN(Number(item.x))) {
        item.x = 0;
      } else {
        item.x = Math.round(Number(item.x));
      }
      if (item.y === undefined || item.y === null || isNaN(Number(item.y))) {
        item.y = 0;
      } else {
        item.y = Math.round(Number(item.y));
      }
      if (!item.dir || typeof item.dir !== "string") {
        item.dir = "正";
      }
      if (item.connect === undefined || item.connect === null) {
        item.connect = "";
      } else {
        item.connect = String(item.connect);
      }
      if (!item.type) {
        item.type = "未知构件";
      }
      result.push(item);
    }
    return result;
  },

  _cleanPoint(point) {
    if (!point || typeof point !== "object") return { x: 0, y: 0 };
    return {
      x: Math.round(Number(point.x) || 0),
      y: Math.round(Number(point.y) || 0)
    };
  },

  _cleanPointDeep(point) {
    var clean = this._cleanPoint(point);
    if (point && typeof point === "object") {
      if (typeof point.snapType === "string") clean.snapType = point.snapType;
      if (typeof point.partId === "string") clean.partId = point.partId;
      if (typeof point.partType === "string") clean.partType = point.partType;
      if (typeof point.snapLabel === "string") clean.snapLabel = point.snapLabel;
    }
    return clean;
  },

  _pointsContentEqual(p1, p2) {
    if (!p1 && !p2) return true;
    if (!p1 || !p2) return false;
    var a = this._cleanPoint(p1);
    var b = this._cleanPoint(p2);
    return a.x === b.x && a.y === b.y;
  },

  _annotationIdKey(ann, index) {
    var from = ann.from || ann.point1 || ann.start || {};
    var to = ann.to || ann.point2 || ann.end || {};
    var fx = Math.round(Number(from.x) || 0);
    var fy = Math.round(Number(from.y) || 0);
    var tx = Math.round(Number(to.x) || 0);
    var ty = Math.round(Number(to.y) || 0);
    return "legacy_meas_" + index + "_" + fx + "_" + fy + "_" + tx + "_" + ty;
  },

  _normalizeMeasurement(meas) {
    if (!meas) return { annotations: [], scale: null };
    var result = {
      annotations: Array.isArray(meas.annotations) ? meas.annotations : [],
      scale: meas.scale || null
    };
    var normalizedAnns = [];
    for (var i = 0; i < result.annotations.length; i++) {
      var raw = result.annotations[i];
      var a = {};

      a.id = (raw && typeof raw.id === "string" && raw.id.trim() !== "")
        ? raw.id
        : this._annotationIdKey(raw, i);

      var rawFrom = (raw && raw.from) ? raw.from : ((raw && raw.point1) ? raw.point1 : ((raw && raw.start) ? raw.start : null));
      var rawTo = (raw && raw.to) ? raw.to : ((raw && raw.point2) ? raw.point2 : ((raw && raw.end) ? raw.end : null));
      a.from = this._cleanPointDeep(rawFrom);
      a.to = this._cleanPointDeep(rawTo);

      if (raw && typeof raw.label === "string") a.label = raw.label;
      if (raw && typeof raw.distanceText === "string") a.distanceText = raw.distanceText;

      normalizedAnns.push(a);
    }
    result.annotations = normalizedAnns;

    if (result.scale && typeof result.scale === "object") {
      result.scale = {
        pixelsPerUnit: Math.round(Number(result.scale.pixelsPerUnit) * 1000) / 1000,
        unitName: typeof result.scale.unitName === "string" ? result.scale.unitName : "份"
      };
    }
    return result;
  },

  _annotationsEqual(a, b) {
    if (!a || !b) return false;
    if (a.id !== b.id) return false;
    if (!this._pointsContentEqual(a.from, b.from)) return false;
    if (!this._pointsContentEqual(a.to, b.to)) return false;
    return true;
  },

  compare(currentScheme, savedScheme, currentMeasurement, savedMeasurement) {
    var normCurrent = this._normalizeScheme(currentScheme);
    var normSaved = this._normalizeScheme(savedScheme);

    var currentMap = {};
    var savedMap = {};

    for (var i = 0; i < normCurrent.length; i++) {
      currentMap[normCurrent[i].id] = normCurrent[i];
    }
    for (var j = 0; j < normSaved.length; j++) {
      savedMap[normSaved[j].id] = normSaved[j];
    }

    var added = [];
    var deleted = [];
    var moved = [];
    var layerChanged = [];
    var dirChanged = [];
    var connectChanged = [];

    var currentIds = Object.keys(currentMap);
    for (var ci = 0; ci < currentIds.length; ci++) {
      var id = currentIds[ci];
      var cur = currentMap[id];
      var sav = savedMap[id];

      if (!sav) {
        added.push({
          partId: cur.id,
          type: cur.type,
          part: Object.assign({}, cur),
          diffType: "added"
        });
        continue;
      }

      var dx = Math.abs(cur.x - sav.x);
      var dy = Math.abs(cur.y - sav.y);
      if (dx > this.POSITION_THRESHOLD || dy > this.POSITION_THRESHOLD) {
        moved.push({
          partId: cur.id,
          type: cur.type,
          part: Object.assign({}, cur),
          from: { x: sav.x, y: sav.y },
          to: { x: cur.x, y: cur.y },
          diffType: "moved"
        });
      }

      if (cur.layer !== sav.layer) {
        layerChanged.push({
          partId: cur.id,
          type: cur.type,
          part: Object.assign({}, cur),
          from: sav.layer,
          to: cur.layer,
          diffType: "layer"
        });
      }

      if (cur.dir !== sav.dir) {
        dirChanged.push({
          partId: cur.id,
          type: cur.type,
          part: Object.assign({}, cur),
          from: sav.dir,
          to: cur.dir,
          diffType: "dir"
        });
      }

      if (String(cur.connect) !== String(sav.connect)) {
        connectChanged.push({
          partId: cur.id,
          type: cur.type,
          part: Object.assign({}, cur),
          from: sav.connect || "(空)",
          to: cur.connect || "(空)",
          diffType: "connect"
        });
      }
    }

    var savedIds = Object.keys(savedMap);
    for (var si = 0; si < savedIds.length; si++) {
      var sid = savedIds[si];
      if (!currentMap[sid]) {
        deleted.push({
          partId: sid,
          type: savedMap[sid].type,
          part: Object.assign({}, savedMap[sid]),
          diffType: "deleted"
        });
      }
    }

    var diffMap = {};
    var addToMap = function(partId, type) {
      if (!diffMap[partId]) diffMap[partId] = [];
      if (diffMap[partId].indexOf(type) < 0) {
        diffMap[partId].push(type);
      }
    };
    added.forEach(function(d) { addToMap(d.partId, "added"); });
    deleted.forEach(function(d) { addToMap(d.partId, "deleted"); });
    moved.forEach(function(d) { addToMap(d.partId, "moved"); });
    layerChanged.forEach(function(d) { addToMap(d.partId, "layer"); });
    dirChanged.forEach(function(d) { addToMap(d.partId, "dir"); });
    connectChanged.forEach(function(d) { addToMap(d.partId, "connect"); });

    var measurementDiff = this.compareMeasurements(currentMeasurement, savedMeasurement);

    var hasPartDiff = added.length > 0 || deleted.length > 0 || moved.length > 0 ||
      layerChanged.length > 0 || dirChanged.length > 0 || connectChanged.length > 0;

    return {
      added: added,
      deleted: deleted,
      moved: moved,
      layerChanged: layerChanged,
      dirChanged: dirChanged,
      connectChanged: connectChanged,
      diffMap: diffMap,
      measurementDiff: measurementDiff,
      hasDifferences: hasPartDiff || measurementDiff.hasDifferences,
      summary: {
        addedCount: added.length,
        deletedCount: deleted.length,
        movedCount: moved.length,
        layerChangedCount: layerChanged.length,
        dirChangedCount: dirChanged.length,
        connectChangedCount: connectChanged.length,
        measurementAddedCount: measurementDiff.added.length,
        measurementDeletedCount: measurementDiff.deleted.length,
        measurementChangedCount: measurementDiff.changed.length,
        totalCount: added.length + deleted.length + moved.length + layerChanged.length +
          dirChanged.length + connectChanged.length +
          measurementDiff.added.length + measurementDiff.deleted.length + measurementDiff.changed.length
      }
    };
  },

  compareMeasurements(currentMeasurement, savedMeasurement) {
    var cur = this._normalizeMeasurement(currentMeasurement);
    var sav = this._normalizeMeasurement(savedMeasurement);
    var self = this;

    var added = [];
    var deleted = [];
    var changed = [];

    var curMap = {};
    var savMap = {};

    for (var i = 0; i < cur.annotations.length; i++) {
      var c = cur.annotations[i];
      if (c.id) curMap[c.id] = c;
    }
    for (var j = 0; j < sav.annotations.length; j++) {
      var s = sav.annotations[j];
      if (s.id) savMap[s.id] = s;
    }

    Object.keys(curMap).forEach(function(id) {
      var c = curMap[id];
      var s = savMap[id];
      if (!s) {
        added.push({
          annotationId: id,
          annotation: c,
          diffType: "measAdded"
        });
      } else {
        if (!self._annotationsEqual(c, s)) {
          changed.push({
            annotationId: id,
            annotation: c,
            from: s,
            to: c,
            diffType: "measChanged"
          });
        }
      }
    });

    Object.keys(savMap).forEach(function(id) {
      if (!curMap[id]) {
        deleted.push({
          annotationId: id,
          annotation: savMap[id],
          diffType: "measDeleted"
        });
      }
    });

    var scaleChanged = false;
    var scaleFrom = null;
    var scaleTo = null;
    if (cur.scale && sav.scale) {
      if (Math.abs(Number(cur.scale.pixelsPerUnit || 0) - Number(sav.scale.pixelsPerUnit || 0)) > 0.001 ||
          String(cur.scale.unitName || "") !== String(sav.scale.unitName || "")) {
        scaleChanged = true;
        scaleFrom = sav.scale;
        scaleTo = cur.scale;
      }
    } else if (!!cur.scale !== !!sav.scale) {
      scaleChanged = true;
      scaleFrom = sav.scale;
      scaleTo = cur.scale;
    }

    return {
      added: added,
      deleted: deleted,
      changed: changed,
      scaleChanged: scaleChanged,
      scaleFrom: scaleFrom,
      scaleTo: scaleTo,
      hasDifferences: added.length > 0 || deleted.length > 0 || changed.length > 0 || scaleChanged
    };
  },

  getPrimaryDiffType(diffMap, partId) {
    var types = diffMap[partId];
    if (!types || types.length === 0) return null;
    var priority = ["added", "deleted", "moved", "layer", "dir", "connect"];
    for (var i = 0; i < priority.length; i++) {
      if (types.indexOf(priority[i]) >= 0) return priority[i];
    }
    return types[0];
  },

  getAllDiffPartIds(diffResult) {
    return Object.keys(diffResult.diffMap);
  },

  formatDiffDescription(item) {
    switch (item.diffType) {
      case "added":
        return item.type + "（新增）";
      case "deleted":
        return item.type + "（已删除）";
      case "moved":
        return item.type + "（移动：" + item.from.x + "," + item.from.y + " → " + item.to.x + "," + item.to.y + "）";
      case "layer":
        return item.type + "（层级：" + item.from + " → " + item.to + "）";
      case "dir":
        return item.type + "（方向：" + item.from + " → " + item.to + "）";
      case "connect":
        return item.type + "（连接点：" + item.from + " → " + item.to + "）";
      case "measAdded":
        return "标注（新增）";
      case "measDeleted":
        return "标注（已删除）";
      case "measChanged":
        return "标注（已修改）";
      default:
        return item.type || "未知";
    }
  },

  formatMeasurementLabel(annotation) {
    if (!annotation) return "标注";
    var p1 = annotation.from || annotation.point1 || annotation.start || {};
    var p2 = annotation.to || annotation.point2 || annotation.end || {};
    var label = annotation.label || "";
    var dist = annotation.distanceText || "";
    var px = Math.round(Math.sqrt(
      Math.pow((Number(p2.x) || 0) - (Number(p1.x) || 0), 2) +
      Math.pow((Number(p2.y) || 0) - (Number(p1.y) || 0), 2)
    ));
    if (dist) return "距离标注 " + dist;
    if (label) return "标注 " + label;
    if (px > 0) return "距离标注 " + px + "px";
    return "标注 (" + (Number(p1.x) || 0) + "," + (Number(p1.y) || 0) + ") - (" + (Number(p2.x) || 0) + "," + (Number(p2.y) || 0) + ")";
  }
};

if (typeof module !== "undefined") module.exports = { SchemeDiff };
