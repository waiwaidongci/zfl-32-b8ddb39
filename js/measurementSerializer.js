var MeasurementSerializer = {
  STORAGE_KEY: "zfl32Measurement",

  serialize(annotations, scale) {
    return {
      scale: {
        pixelsPerUnit: scale.pixelsPerUnit,
        unitName: scale.unitName
      },
      annotations: annotations.map(function (ann) {
        var result = {
          id: ann.id,
          from: { x: ann.from.x, y: ann.from.y },
          to: { x: ann.to.x, y: ann.to.y }
        };
        if (ann.from.snapType) result.from.snapType = ann.from.snapType;
        if (ann.from.partId) result.from.partId = ann.from.partId;
        if (ann.from.partType) result.from.partType = ann.from.partType;
        if (ann.from.snapLabel) result.from.snapLabel = ann.from.snapLabel;
        if (ann.to.snapType) result.to.snapType = ann.to.snapType;
        if (ann.to.partId) result.to.partId = ann.to.partId;
        if (ann.to.partType) result.to.partType = ann.to.partType;
        if (ann.to.snapLabel) result.to.snapLabel = ann.to.snapLabel;
        return result;
      })
    };
  },

  deserialize(data) {
    if (!data || typeof data !== "object") {
      return { annotations: [], scale: { pixelsPerUnit: 40, unitName: "份" } };
    }

    var scale = { pixelsPerUnit: 40, unitName: "份" };
    if (data.scale && typeof data.scale.pixelsPerUnit === "number" && data.scale.pixelsPerUnit > 0) {
      scale.pixelsPerUnit = data.scale.pixelsPerUnit;
    }
    if (data.scale && typeof data.scale.unitName === "string" && data.scale.unitName.trim() !== "") {
      scale.unitName = data.scale.unitName.trim();
    }

    var annotations = [];
    if (Array.isArray(data.annotations)) {
      annotations = data.annotations.filter(function (ann) {
        return ann &&
          ann.from && typeof ann.from.x === "number" && typeof ann.from.y === "number" &&
          ann.to && typeof ann.to.x === "number" && typeof ann.to.y === "number";
      }).map(function (ann) {
        var result = {
          id: (typeof ann.id === "string" && ann.id.trim() !== "") ? ann.id : crypto.randomUUID(),
          from: { x: Math.round(ann.from.x), y: Math.round(ann.from.y) },
          to: { x: Math.round(ann.to.x), y: Math.round(ann.to.y) }
        };
        if (typeof ann.from.snapType === "string") result.from.snapType = ann.from.snapType;
        if (typeof ann.from.partId === "string") result.from.partId = ann.from.partId;
        if (typeof ann.from.partType === "string") result.from.partType = ann.from.partType;
        if (typeof ann.from.snapLabel === "string") result.from.snapLabel = ann.from.snapLabel;
        if (typeof ann.to.snapType === "string") result.to.snapType = ann.to.snapType;
        if (typeof ann.to.partId === "string") result.to.partId = ann.to.partId;
        if (typeof ann.to.partType === "string") result.to.partType = ann.to.partType;
        if (typeof ann.to.snapLabel === "string") result.to.snapLabel = ann.to.snapLabel;
        return result;
      });
    }

    return { annotations: annotations, scale: scale };
  },

  saveToLocalStorage(annotations, scale) {
    var data = this.serialize(annotations, scale);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save measurement data:", e);
    }
  },

  loadFromLocalStorage() {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return this.deserialize(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load measurement data:", e);
      return null;
    }
  },

  buildExportData(scheme, annotations, scale) {
    return {
      scheme: scheme,
      measurement: this.serialize(annotations, scale)
    };
  },

  parseImportData(jsonData) {
    if (!jsonData || typeof jsonData !== "object") {
      return null;
    }

    var scheme = Array.isArray(jsonData.scheme) ? jsonData.scheme : null;
    var measurement = null;

    if (jsonData.measurement) {
      measurement = this.deserialize(jsonData.measurement);
    }

    return { scheme: scheme, measurement: measurement };
  }
};

if (typeof module !== "undefined") module.exports = { MeasurementSerializer };
