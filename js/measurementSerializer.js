var MeasurementSerializer = {
  STORAGE_KEY: "zfl32Measurement",

  serialize(annotations, scale) {
    return {
      scale: {
        pixelsPerUnit: scale.pixelsPerUnit,
        unitName: scale.unitName
      },
      annotations: annotations.map(function (ann) {
        return {
          id: ann.id,
          from: { x: ann.from.x, y: ann.from.y },
          to: { x: ann.to.x, y: ann.to.y }
        };
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
        return {
          id: (typeof ann.id === "string" && ann.id.trim() !== "") ? ann.id : crypto.randomUUID(),
          from: { x: Math.round(ann.from.x), y: Math.round(ann.from.y) },
          to: { x: Math.round(ann.to.x), y: Math.round(ann.to.y) }
        };
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
