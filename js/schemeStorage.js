var SchemeStorage = {
  SCHEMES_INDEX_KEY: "zfl32SchemesIndex",
  SCHEME_DATA_PREFIX: "zfl32Scheme_",
  CURRENT_SCHEME_ID_KEY: "zfl32CurrentSchemeId",
  LEGACY_SCHEME_KEY: "zfl32Scheme",
  LEGACY_MEASUREMENT_KEY: "zfl32Measurement",

  _generateId() {
    return "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  },

  _getSchemeKey(id) {
    return this.SCHEME_DATA_PREFIX + id;
  },

  _safeParse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("Failed to parse stored data:", e);
      return null;
    }
  },

  _safeStringify(data) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      console.error("Failed to stringify data:", e);
      return null;
    }
  },

  _readIndex() {
    var raw = localStorage.getItem(this.SCHEMES_INDEX_KEY);
    var index = this._safeParse(raw);
    return Array.isArray(index) ? index : [];
  },

  _writeIndex(index) {
    var str = this._safeStringify(index);
    if (str) {
      localStorage.setItem(this.SCHEMES_INDEX_KEY, str);
    }
  },

  list() {
    var index = this._readIndex();
    var result = [];
    for (var i = 0; i < index.length; i++) {
      var id = index[i];
      var raw = localStorage.getItem(this._getSchemeKey(id));
      var data = this._safeParse(raw);
      if (data && data.id) {
        result.push({
          id: data.id,
          name: data.name || "未命名方案",
          updatedAt: data.updatedAt || data.createdAt || 0,
          createdAt: data.createdAt || 0,
          partCount: Array.isArray(data.scheme) ? data.scheme.length : 0
        });
      }
    }
    result.sort(function(a, b) {
      return b.updatedAt - a.updatedAt;
    });
    return result;
  },

  _normalizeLegacyScheme(scheme) {
    if (!Array.isArray(scheme)) return [];
    return scheme.map(function(p, i) {
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
      return item;
    });
  },

  get(id) {
    var raw = localStorage.getItem(this._getSchemeKey(id));
    var data = this._safeParse(raw);
    if (!data || !data.id) return null;
    return {
      id: data.id,
      name: data.name || "未命名方案",
      scheme: this._normalizeLegacyScheme(data.scheme),
      measurement: data.measurement || null,
      updatedAt: data.updatedAt || data.createdAt || 0,
      createdAt: data.createdAt || 0
    };
  },

  create(name, scheme, measurement) {
    var id = this._generateId();
    var now = Date.now();
    var data = {
      id: id,
      name: name || "未命名方案",
      scheme: Array.isArray(scheme) ? scheme : [],
      measurement: measurement || null,
      createdAt: now,
      updatedAt: now
    };
    var str = this._safeStringify(data);
    if (!str) return null;

    localStorage.setItem(this._getSchemeKey(id), str);

    var index = this._readIndex();
    index.unshift(id);
    this._writeIndex(index);

    return {
      id: data.id,
      name: data.name,
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
      partCount: data.scheme.length
    };
  },

  update(id, name, scheme, measurement) {
    var raw = localStorage.getItem(this._getSchemeKey(id));
    var data = this._safeParse(raw);
    if (!data || !data.id) return null;

    data.name = name || data.name;
    data.scheme = Array.isArray(scheme) ? scheme : data.scheme;
    if (measurement !== undefined) {
      data.measurement = measurement;
    }
    data.updatedAt = Date.now();

    var str = this._safeStringify(data);
    if (!str) return null;

    localStorage.setItem(this._getSchemeKey(id), str);

    var index = this._readIndex();
    var pos = index.indexOf(id);
    if (pos > 0) {
      index.splice(pos, 1);
      index.unshift(id);
      this._writeIndex(index);
    }

    return {
      id: data.id,
      name: data.name,
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
      partCount: data.scheme.length
    };
  },

  remove(id) {
    localStorage.removeItem(this._getSchemeKey(id));
    var index = this._readIndex();
    var pos = index.indexOf(id);
    if (pos >= 0) {
      index.splice(pos, 1);
      this._writeIndex(index);
    }
    if (this.getCurrentId() === id) {
      localStorage.removeItem(this.CURRENT_SCHEME_ID_KEY);
    }
  },

  copy(id, newName) {
    var source = this.get(id);
    if (!source) return null;
    return this.create(
      newName || (source.name + " 副本"),
      source.scheme,
      source.measurement
    );
  },

  getCurrentId() {
    return localStorage.getItem(this.CURRENT_SCHEME_ID_KEY);
  },

  setCurrentId(id) {
    if (id) {
      localStorage.setItem(this.CURRENT_SCHEME_ID_KEY, id);
    } else {
      localStorage.removeItem(this.CURRENT_SCHEME_ID_KEY);
    }
  },

  migrateFromLegacy() {
    var legacyScheme = localStorage.getItem(this.LEGACY_SCHEME_KEY);
    var legacyMeasurement = localStorage.getItem(this.LEGACY_MEASUREMENT_KEY);

    if (!legacyScheme && !legacyMeasurement) {
      return null;
    }

    var schemeData = this._safeParse(legacyScheme) || [];
    var measurementData = this._safeParse(legacyMeasurement) || null;

    var migrated = this.create("默认方案", schemeData, measurementData);
    if (migrated) {
      this.setCurrentId(migrated.id);
    }
    return migrated;
  },

  formatTime(timestamp) {
    if (!timestamp) return "-";
    var d = new Date(timestamp);
    var pad = function(n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "-" +
      pad(d.getMonth() + 1) + "-" +
      pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" +
      pad(d.getMinutes());
  }
};

if (typeof module !== "undefined") module.exports = { SchemeStorage };
