var StateSnapshotManager = {
  _deps: null,

  init(deps) {
    this._deps = deps || {};
  },

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  _cloneScheme(scheme) {
    if (!Array.isArray(scheme)) return [];
    return scheme.map(function(p) { return Object.assign({}, p); });
  },

  createSnapshot() {
    var deps = this._deps;
    if (!deps) {
      console.error("StateSnapshotManager not initialized");
      return null;
    }

    var scheme = deps.getScheme ? deps.getScheme() : [];
    var measurementData = deps.getMeasurementData ? deps.getMeasurementData() : null;
    var scale = deps.getMeasurementScale ? deps.getMeasurementScale() : null;

    return {
      scheme: this._cloneScheme(scheme),
      selectedIds: SelectionManager.getIds().slice(),
      measurement: measurementData ? this._deepClone(measurementData) : null,
      measurementState: {
        isActive: MeasurementState.isActive,
        selectedAnnotationId: MeasurementState.selectedAnnotationId,
        pendingPoint: MeasurementState.pendingPoint ? Object.assign({}, MeasurementState.pendingPoint) : null,
        hoverPoint: MeasurementState.hoverPoint ? Object.assign({}, MeasurementState.hoverPoint) : null,
        snapPoint: MeasurementState.snapPoint ? Object.assign({}, MeasurementState.snapPoint) : null
      },
      explodeActive: deps.isExploded ? deps.isExploded() : false,
      zoomValue: deps.getZoomValue ? deps.getZoomValue() : null
    };
  },

  restoreSnapshot(snapshot) {
    if (!snapshot) return;
    var deps = this._deps;
    if (!deps) {
      console.error("StateSnapshotManager not initialized");
      return;
    }

    if (snapshot.scheme && deps.setScheme) {
      deps.setScheme(this._cloneScheme(snapshot.scheme));
    }
    if (snapshot.selectedIds) {
      SelectionManager.setSelection(snapshot.selectedIds);
    }
    if (snapshot.measurement && deps.applyMeasurementData) {
      deps.applyMeasurementData(this._deepClone(snapshot.measurement));
    }
    if (snapshot.measurementState && typeof snapshot.measurementState === "object") {
      var ms = snapshot.measurementState;
      MeasurementState.isActive = !!ms.isActive;
      MeasurementState.selectedAnnotationId = (typeof ms.selectedAnnotationId === "string") ? ms.selectedAnnotationId : null;
      MeasurementState.pendingPoint = ms.pendingPoint ? Object.assign({}, ms.pendingPoint) : null;
      MeasurementState.hoverPoint = ms.hoverPoint ? Object.assign({}, ms.hoverPoint) : null;
      MeasurementState.snapPoint = ms.snapPoint ? Object.assign({}, ms.snapPoint) : null;
      if (typeof MeasurementState._notify === "function") {
        MeasurementState._notify();
      }
    }
    if (snapshot.explodeActive !== undefined && deps.setExploded) {
      deps.setExploded(!!snapshot.explodeActive);
      Preview3D.setExploded(!!snapshot.explodeActive);
    }
    if (snapshot.zoomValue !== null && deps.setZoomValue) {
      deps.setZoomValue(snapshot.zoomValue);
    }
    if (deps.refreshPlayerSteps) {
      deps.refreshPlayerSteps();
    }
  }
};

if (typeof module !== "undefined") module.exports = { StateSnapshotManager };
