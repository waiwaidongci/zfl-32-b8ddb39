const MeasurementState = {
  isActive: false,
  annotations: [],
  scale: { pixelsPerUnit: 40, unitName: "份" },
  pendingPoint: null,
  hoverPoint: null,
  selectedAnnotationId: null,
  snapPoint: null,
  _listeners: [],

  init(annotations, scale) {
    this.annotations = Array.isArray(annotations) ? annotations : [];
    if (scale && typeof scale.pixelsPerUnit === "number" && scale.unitName) {
      this.scale = { pixelsPerUnit: scale.pixelsPerUnit, unitName: scale.unitName };
    }
    this.pendingPoint = null;
    this.hoverPoint = null;
    this.selectedAnnotationId = null;
    this.snapPoint = null;
    this.isActive = false;
  },

  toggleMode() {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this.pendingPoint = null;
      this.hoverPoint = null;
      this.selectedAnnotationId = null;
      this.snapPoint = null;
    }
    this._notify();
  },

  setScale(pixelsPerUnit, unitName) {
    if (typeof pixelsPerUnit === "number" && pixelsPerUnit > 0) {
      this.scale.pixelsPerUnit = pixelsPerUnit;
    }
    if (typeof unitName === "string" && unitName.trim() !== "") {
      this.scale.unitName = unitName.trim();
    }
    this._notify();
  },

  addAnnotation(from, to) {
    const ann = {
      id: crypto.randomUUID(),
      from: { x: Math.round(from.x), y: Math.round(from.y) },
      to: { x: Math.round(to.x), y: Math.round(to.y) }
    };
    if (from.snapType) {
      ann.from.snapType = from.snapType;
    }
    if (from.partId) {
      ann.from.partId = from.partId;
    }
    if (from.partType) {
      ann.from.partType = from.partType;
    }
    if (from.snapLabel) {
      ann.from.snapLabel = from.snapLabel;
    }
    if (to.snapType) {
      ann.to.snapType = to.snapType;
    }
    if (to.partId) {
      ann.to.partId = to.partId;
    }
    if (to.partType) {
      ann.to.partType = to.partType;
    }
    if (to.snapLabel) {
      ann.to.snapLabel = to.snapLabel;
    }
    this.annotations.push(ann);
    this.pendingPoint = null;
    this.snapPoint = null;
    this._notify();
    return ann;
  },

  removeAnnotation(id) {
    this.annotations = this.annotations.filter(a => a.id !== id);
    if (this.selectedAnnotationId === id) {
      this.selectedAnnotationId = null;
    }
    this._notify();
  },

  selectAnnotation(id) {
    this.selectedAnnotationId = (this.selectedAnnotationId === id) ? null : id;
    this._notify();
  },

  setPendingPoint(x, y, snapInfo) {
    this.pendingPoint = { x: Math.round(x), y: Math.round(y) };
    if (snapInfo) {
      this.pendingPoint.snapType = snapInfo.type;
      this.pendingPoint.partId = snapInfo.partId;
      this.pendingPoint.partType = snapInfo.partType;
      this.pendingPoint.snapLabel = snapInfo.label;
    }
    this._notify();
  },

  setHoverPoint(x, y, snapInfo) {
    if (x === null || y === null) {
      this.hoverPoint = null;
      this.snapPoint = null;
    } else {
      this.hoverPoint = { x: Math.round(x), y: Math.round(y) };
      if (snapInfo) {
        this.hoverPoint.snapType = snapInfo.type;
        this.hoverPoint.partId = snapInfo.partId;
        this.hoverPoint.partType = snapInfo.partType;
        this.hoverPoint.snapLabel = snapInfo.label;
      }
      this.snapPoint = snapInfo ? {
        x: Math.round(snapInfo.x),
        y: Math.round(snapInfo.y),
        type: snapInfo.type,
        partId: snapInfo.partId,
        partType: snapInfo.partType,
        label: snapInfo.label
      } : null;
    }
    this._notify();
  },

  setSnapPoint(snapInfo) {
    if (snapInfo) {
      this.snapPoint = {
        x: Math.round(snapInfo.x),
        y: Math.round(snapInfo.y),
        type: snapInfo.type,
        partId: snapInfo.partId,
        partType: snapInfo.partType,
        label: snapInfo.label
      };
    } else {
      this.snapPoint = null;
    }
    this._notify();
  },

  clearPending() {
    this.pendingPoint = null;
    this.hoverPoint = null;
    this.snapPoint = null;
    this._notify();
  },

  getPixelDistance(ann) {
    const dx = ann.to.x - ann.from.x;
    const dy = ann.to.y - ann.from.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  getRealDistance(ann) {
    return this.getPixelDistance(ann) / this.scale.pixelsPerUnit;
  },

  formatDistance(ann) {
    const px = this.getPixelDistance(ann).toFixed(1);
    const real = this.getRealDistance(ann).toFixed(2);
    return px + "px ≈ " + real + this.scale.unitName;
  },

  getAnnotations() {
    return this.annotations.slice();
  },

  getScale() {
    return { pixelsPerUnit: this.scale.pixelsPerUnit, unitName: this.scale.unitName };
  },

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  },

  _notify() {
    const state = this.getState();
    this._listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error("MeasurementState listener error:", e); }
    });
  },

  getState() {
    return {
      isActive: this.isActive,
      annotations: this.getAnnotations(),
      scale: this.getScale(),
      pendingPoint: this.pendingPoint,
      hoverPoint: this.hoverPoint,
      selectedAnnotationId: this.selectedAnnotationId,
      snapPoint: this.snapPoint
    };
  }
};

if (typeof module !== "undefined") module.exports = { MeasurementState };
