var SchemeState = {
  currentSchemeId: null,
  currentSchemeName: null,
  _baselineScheme: null,
  _baselineMeasurement: null,
  _currentScheme: null,
  _currentMeasurement: null,
  _subscribers: [],

  _serialize(data) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      return "";
    }
  },

  _notify() {
    var state = this.getState();
    for (var i = 0; i < this._subscribers.length; i++) {
      try {
        this._subscribers[i](state);
      } catch (e) {
        console.error("SchemeState subscriber error:", e);
      }
    }
  },

  init() {
    var currentId = SchemeStorage.getCurrentId();
    var schemes = SchemeStorage.list();

    if (!currentId && schemes.length === 0) {
      var migrated = SchemeStorage.migrateFromLegacy();
      if (migrated) {
        currentId = migrated.id;
      }
    }

    if (!currentId && schemes.length > 0) {
      currentId = schemes[0].id;
      SchemeStorage.setCurrentId(currentId);
    }

    if (currentId) {
      var data = SchemeStorage.get(currentId);
      if (data) {
        this.currentSchemeId = data.id;
        this.currentSchemeName = data.name;
        this._baselineScheme = this._serialize(data.scheme);
        this._baselineMeasurement = this._serialize(data.measurement);
      }
    }

    this._notify();
  },

  subscribe(callback) {
    if (typeof callback === "function") {
      this._subscribers.push(callback);
    }
    var self = this;
    return function() {
      var idx = self._subscribers.indexOf(callback);
      if (idx >= 0) {
        self._subscribers.splice(idx, 1);
      }
    };
  },

  updateCurrent(currentScheme, currentMeasurement) {
    this._currentScheme = currentScheme;
    this._currentMeasurement = currentMeasurement;
    this._notify();
  },

  getState() {
    return {
      currentSchemeId: this.currentSchemeId,
      currentSchemeName: this.currentSchemeName,
      hasUnsavedChanges: this.hasUnsavedChanges()
    };
  },

  hasUnsavedChanges(currentScheme, currentMeasurement) {
    if (!this.currentSchemeId) {
      return true;
    }
    if (this._baselineScheme === null) {
      return true;
    }

    var schemeToCheck = currentScheme !== undefined ? currentScheme : this._currentScheme;
    var measToCheck = currentMeasurement !== undefined ? currentMeasurement : this._currentMeasurement;

    if (schemeToCheck !== undefined && schemeToCheck !== null) {
      var currentSchemeStr = this._serialize(schemeToCheck);
      if (currentSchemeStr !== this._baselineScheme) {
        return true;
      }
    }
    if (measToCheck !== undefined) {
      var currentMeasStr = this._serialize(measToCheck);
      if (currentMeasStr !== this._baselineMeasurement) {
        return true;
      }
    }
    return false;
  },

  getCurrentSchemeData() {
    if (!this.currentSchemeId) return null;
    return SchemeStorage.get(this.currentSchemeId);
  },

  setCurrentScheme(id) {
    var data = SchemeStorage.get(id);
    if (!data) return null;

    this.currentSchemeId = data.id;
    this.currentSchemeName = data.name;
    this._baselineScheme = this._serialize(data.scheme);
    this._baselineMeasurement = this._serialize(data.measurement);
    this._currentScheme = data.scheme;
    this._currentMeasurement = data.measurement;
    SchemeStorage.setCurrentId(id);

    this._notify();
    return data;
  },

  saveCurrent(name, scheme, measurement) {
    var measurementData = measurement !== undefined ? measurement : this._deserialize(this._baselineMeasurement);
    var result;

    if (this.currentSchemeId) {
      result = SchemeStorage.update(
        this.currentSchemeId,
        name || this.currentSchemeName,
        scheme,
        measurementData
      );
    } else {
      result = SchemeStorage.create(
        name || "未命名方案",
        scheme,
        measurementData
      );
      if (result) {
        this.currentSchemeId = result.id;
        SchemeStorage.setCurrentId(result.id);
      }
    }

    if (result) {
      this.currentSchemeName = result.name;
      this._baselineScheme = this._serialize(scheme);
      this._baselineMeasurement = this._serialize(measurementData);
      this._currentScheme = scheme;
      this._currentMeasurement = measurementData;
      this._notify();
    }

    return result;
  },

  createNew(name, scheme, measurement) {
    var result = SchemeStorage.create(name || "未命名方案", scheme, measurement);
    if (result) {
      this.currentSchemeId = result.id;
      this.currentSchemeName = result.name;
      this._baselineScheme = this._serialize(scheme);
      this._baselineMeasurement = this._serialize(measurement);
      this._currentScheme = scheme;
      this._currentMeasurement = measurement;
      SchemeStorage.setCurrentId(result.id);
      this._notify();
    }
    return result;
  },

  _deserialize(str) {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  },

  clearCurrent() {
    this.currentSchemeId = null;
    this.currentSchemeName = null;
    this._baselineScheme = null;
    this._baselineMeasurement = null;
    SchemeStorage.setCurrentId(null);
    this._notify();
  }
};

if (typeof module !== "undefined") module.exports = { SchemeState };
