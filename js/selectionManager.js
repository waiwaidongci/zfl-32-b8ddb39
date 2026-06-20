const SelectionManager = {
  _selectedIds: new Set(),
  _listeners: [],

  init() {
    this._selectedIds = new Set();
    this._listeners = [];
  },

  select(id) {
    this.setSelection([id]);
  },

  setSelection(ids) {
    this._selectedIds = new Set(ids || []);
    this._notify();
  },

  toggle(id) {
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id);
    } else {
      this._selectedIds.add(id);
    }
    this._notify();
  },

  addToSelection(id) {
    this._selectedIds.add(id);
    this._notify();
  },

  removeFromSelection(id) {
    this._selectedIds.delete(id);
    this._notify();
  },

  clear() {
    this._selectedIds = new Set();
    this._notify();
  },

  has(id) {
    return this._selectedIds.has(id);
  },

  isEmpty() {
    return this._selectedIds.size === 0;
  },

  count() {
    return this._selectedIds.size;
  },

  getIds() {
    return Array.from(this._selectedIds);
  },

  getFirstId() {
    if (this._selectedIds.size === 0) return "";
    return this._selectedIds.values().next().value;
  },

  getParts(scheme) {
    return scheme.filter(p => this._selectedIds.has(p.id));
  },

  getCenterX(scheme) {
    var parts = this.getParts(scheme);
    if (parts.length === 0) return 600;
    var xs = parts.map(p => {
      var s = AssemblyRules.getSize(p.type);
      return p.x + s.w / 2;
    });
    return xs.reduce(function(a, b) { return a + b; }, 0) / xs.length;
  },

  subscribe(listener) {
    this._listeners.push(listener);
    return function() {
      this._listeners = this._listeners.filter(function(l) { return l !== listener; });
    }.bind(this);
  },

  _notify() {
    var state = this.getState();
    this._listeners.forEach(function(fn) {
      try { fn(state); } catch (e) { console.error("SelectionManager listener error:", e); }
    });
  },

  getState() {
    return {
      selectedIds: new Set(this._selectedIds),
      count: this._selectedIds.size,
      firstId: this.getFirstId()
    };
  }
};

if (typeof module !== "undefined") module.exports = { SelectionManager };
