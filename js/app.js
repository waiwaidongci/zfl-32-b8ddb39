const App = {
  parts: ["栌斗", "华拱", "昂", "耍头", "散斗"],
  canvas: null,
  library: null,
  templateLibrary: null,
  editor: null,
  tree: null,
  checks: null,
  zoomInput: null,
  explodeBtn: null,
  saveBtn: null,
  exportBtn: null,
  importBtn: null,
  importFileInput: null,
  playerControls: null,
  playerStepInfo: null,
  measureBtn: null,
  measurementPanel: null,
  batchPanel: null,
  schemeVersionPanel: null,
  schemeVersionUnsubscribe: null,
  viewToggleBtn: null,
  canvas3DWrap: null,

  scheme: [],
  drag: null,
  errorPartIds: [],
  playerUnsubscribe: null,
  measurementUnsubscribe: null,
  selectionUnsubscribe: null,

  _getSelectedSet() {
    return new Set(SelectionManager.getIds());
  },

  init() {
    this.canvas = document.querySelector("#canvas");
    this.library = document.querySelector("#library");
    this.templateLibrary = document.querySelector("#templateLibrary");
    this.editor = document.querySelector("#editor");
    this.tree = document.querySelector("#tree");
    this.checks = document.querySelector("#checks");
    this.zoomInput = document.querySelector("#zoom");
    this.explodeBtn = document.querySelector("#explodeBtn");
    this.saveBtn = document.querySelector("#saveBtn");
    this.exportBtn = document.querySelector("#exportBtn");
    this.importBtn = document.querySelector("#importBtn");
    this.importFileInput = document.querySelector("#importFileInput");
    this.playerControls = document.querySelector("#playerControls");
    this.playerStepInfo = document.querySelector("#playerStepInfo");
    this.measureBtn = document.querySelector("#measureBtn");
    this.measurementPanel = document.querySelector("#measurementPanel");
    this.batchPanel = document.querySelector("#batchPanel");
    this.schemeVersionPanel = document.querySelector("#schemeVersionPanel");
    this.viewToggleBtn = document.querySelector("#viewToggleBtn");
    this.canvas3DWrap = document.querySelector("#canvas3DWrap");

    this._initPreview3D();

    this._initSchemeState();

    SelectionManager.init();
    this.initBatch();
    this.initMeasurement();
    this.bindEvents();
    this.initPlayer();
    this.initSchemeVersion();
    this.renderAll();
  },

  _initSchemeState() {
    SchemeState.init();
    var current = SchemeState.getCurrentSchemeData();

    if (current && current.scheme && current.scheme.length > 0) {
      this.scheme = current.scheme.map(function(p) {
        return Object.assign({}, p);
      });
    } else {
      this.scheme = [
        { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" },
        { id: crypto.randomUUID(), type: "华拱", x: 495, y: 450, layer: 2, dir: "正", connect: "下承" }
      ];
    }
  },

  _initPreview3D() {
    var self = this;
    Preview3D.init({
      onSelectPart: function(partId, shiftKey) {
        if (shiftKey) {
          SelectionManager.toggle(partId);
        } else {
          SelectionManager.select(partId);
        }
        self.renderAll();
      }
    });

    SelectionManager.subscribe(function() {
      Preview3D.setHighlightedIds(SelectionManager.getIds());
    });

    window.addEventListener("resize", function() {
      Preview3D.handleResize();
    });
  },

  _getCurrentMeasurementData() {
    return MeasurementSerializer.serialize(
      MeasurementState.getAnnotations(),
      MeasurementState.getScale()
    );
  },

  _applyMeasurementData(measurementData) {
    if (measurementData) {
      var deserialized = MeasurementSerializer.deserialize(measurementData);
      MeasurementState.init(deserialized.annotations, deserialized.scale);
    } else {
      MeasurementState.init([], null);
    }
  },

  hasUnsavedChanges() {
    var measurementData = this._getCurrentMeasurementData();
    return SchemeState.hasUnsavedChanges(this.scheme, measurementData);
  },

  initSchemeVersion() {
    var self = this;
    SchemeVersionUI.init("#schemeVersionPanel", {
      hasUnsavedChanges: function() { return self.hasUnsavedChanges(); },
      onLoadScheme: function(data) { self._onLoadScheme(data); },
      onSaveAs: function(name) { self._onSaveAs(name); },
      onNewScheme: function(name) { self._onNewScheme(name); },
      onClearCurrent: function() { self._onClearCurrent(); }
    });

    this.schemeVersionUnsubscribe = SchemeState.subscribe(function() {
      self._updateSaveButton();
    });
  },

  _updateSaveButton() {
    if (this.saveBtn) {
      var hasUnsaved = this.hasUnsavedChanges();
      this.saveBtn.textContent = hasUnsaved ? "保存方案 ●" : "保存方案";
    }
  },

  _onLoadScheme(data) {
    this.scheme = data.scheme.map(function(p) {
      return Object.assign({}, p);
    });
    this._applyMeasurementData(data.measurement);
    SelectionManager.clear();
    this.refreshPlayerSteps();
    this.renderAll();
  },

  _onSaveAs(name) {
    var measurementData = this._getCurrentMeasurementData();
    var result = SchemeState.createNew(name, this.scheme, measurementData);
    if (result) {
      this._updateSaveButton();
      alert('方案已另存为 "' + name + '"。');
    }
  },

  _onNewScheme(name) {
    this.scheme = [
      { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" }
    ];
    this._applyMeasurementData(null);
    SelectionManager.clear();

    var measurementData = this._getCurrentMeasurementData();
    SchemeState.createNew(name, this.scheme, measurementData);

    this.refreshPlayerSteps();
    this.renderAll();
    this._updateSaveButton();
  },

  _onClearCurrent() {
    this.scheme = [
      { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" }
    ];
    this._applyMeasurementData(null);
    SelectionManager.clear();
    this.refreshPlayerSteps();
    this.renderAll();
    this._updateSaveButton();
  },

  initBatch() {
    BatchPanel.init("#batchPanel", {
      onMirror: function(axisX) { this.mirrorSelected(axisX); }.bind(this),
      onBatchCopy: function(count, spacing) { this.batchCopySelected(count, spacing); }.bind(this)
    });

    this.selectionUnsubscribe = SelectionManager.subscribe(function() {
      this._updateBatchPanel();
    }.bind(this));
  },

  _updateBatchPanel() {
    BatchPanel.render(SelectionManager.count());
  },

  initMeasurement() {
    var current = SchemeState.getCurrentSchemeData();
    if (current && current.measurement) {
      var deserialized = MeasurementSerializer.deserialize(current.measurement);
      MeasurementState.init(deserialized.annotations, deserialized.scale);
    } else {
      MeasurementState.init([], null);
    }

    this.measurementUnsubscribe = MeasurementState.subscribe(function() {
      this.renderAll();
    }.bind(this));
  },

  initPlayer() {
    AssemblyPlayerState.init(this.scheme);

    if (this.playerControls && this.playerStepInfo) {
      AssemblyPlayerUI.init("#playerControls", "#playerStepInfo", {
        onStart: function() { this.startAssemblyDemo(); }.bind(this),
        onStop: function() { this.stopAssemblyDemo(); }.bind(this)
      });
    }

    this.playerUnsubscribe = AssemblyPlayerState.subscribe(function() {
      this.renderAll();
    }.bind(this));
  },

  startAssemblyDemo() {
    if (!AssemblyPlayerState.hasSteps()) {
      alert("当前方案没有构件，无法进行装配演示。");
      return;
    }
    this.drag = null;
    SelectionManager.clear();
    AssemblyPlayerState.activate();
    AssemblyPlayerState.nextStep();
  },

  stopAssemblyDemo() {
    AssemblyPlayerState.deactivate();
  },

  refreshPlayerSteps() {
    if (AssemblyPlayerState.isActive) {
      AssemblyPlayerState.setScheme(this.scheme);
    } else {
      AssemblyPlayerState.init(this.scheme);
    }
  },

  mirrorSelected(axisX) {
    var ids = this._getSelectedSet();
    if (ids.size === 0) return;
    var newParts = GeometryTransform.mirrorCopy(this.scheme, ids, axisX);
    if (newParts.length === 0) return;
    newParts.forEach(function(p) { this.scheme.push(p); }.bind(this));
    SelectionManager.clear();
    newParts.forEach(function(p) { SelectionManager.addToSelection(p.id); });
    this.refreshPlayerSteps();
    this.renderAll();
  },

  batchCopySelected(count, spacing) {
    var ids = this._getSelectedSet();
    if (ids.size === 0) return;
    var newParts = GeometryTransform.batchCopy(this.scheme, ids, count, spacing);
    if (newParts.length === 0) return;
    newParts.forEach(function(p) { this.scheme.push(p); }.bind(this));
    SelectionManager.clear();
    newParts.forEach(function(p) { SelectionManager.addToSelection(p.id); });
    this.refreshPlayerSteps();
    this.renderAll();
  },

  bindEvents() {
    Renderer.renderLibrary(this.library, this.parts, function(type) { this.addPart(type); }.bind(this));
    Renderer.renderTemplates(this.templateLibrary, DOUGONG_TEMPLATES, function(tplId) { this.loadTemplate(tplId); }.bind(this));

    window.onpointermove = function(event) {
      var zoom = Number(this.zoomInput.value) / 100;
      var rect = this.canvas.getBoundingClientRect();

      if (MeasurementState.isActive && MeasurementState.pendingPoint && !AssemblyPlayerState.isActive) {
        var hoverX = Math.round((event.clientX - rect.left) / zoom);
        var hoverY = Math.round((event.clientY - rect.top) / zoom);
        MeasurementState.setHoverPoint(hoverX, hoverY);
      }

      if (!this.drag || AssemblyPlayerState.isActive) return;
      var item = this.scheme.find(function(p) { return p.id === this.drag.id; }.bind(this));
      if (!item) return;
      item.x = Math.round((event.clientX - rect.left) / zoom - this.drag.ox);
      item.y = Math.round((event.clientY - rect.top) / zoom - this.drag.oy);
      this.renderAll();
    }.bind(this);

    window.onpointerup = function() {
      if (this.drag && !AssemblyPlayerState.isActive) {
        this.refreshPlayerSteps();
      }
      this.drag = null;
    }.bind(this);

    this.canvas.onclick = function(event) {
      if (!MeasurementState.isActive) return;
      if (AssemblyPlayerState.isActive) return;

      var zoom = Number(this.zoomInput.value) / 100;
      var rect = this.canvas.getBoundingClientRect();
      var canvasX = Math.round((event.clientX - rect.left) / zoom);
      var canvasY = Math.round((event.clientY - rect.top) / zoom);

      var partEl = event.target.closest(".part");
      if (partEl) {
        var partId = partEl.dataset.id;
        var part = this.scheme.find(function(p) { return p.id === partId; });
        if (part) {
          canvasX = part.x + Math.round(partEl.offsetWidth / 2);
          canvasY = part.y + Math.round(partEl.offsetHeight / 2);
        }
      }

      if (!MeasurementState.pendingPoint) {
        MeasurementState.setPendingPoint(canvasX, canvasY);
      } else {
        MeasurementState.addAnnotation(MeasurementState.pendingPoint, { x: canvasX, y: canvasY });
      }
    }.bind(this);

    this.zoomInput.oninput = function(e) { this.canvas.style.transform = "scale(" + (Number(e.target.value) / 100) + ")"; }.bind(this);
    this.zoomInput.dispatchEvent(new Event("input"));

    this.explodeBtn.onclick = function() {
      var isExploded = this.canvas.classList.toggle("exploded");
      Preview3D.setExploded(isExploded);
    }.bind(this);
    this.saveBtn.onclick = function() {
      var name = SchemeState.currentSchemeName;
      if (!name) {
        name = prompt("请输入方案名称：", "未命名方案");
        if (name === null) return;
        name = name.trim();
        if (!name) {
          alert("方案名称不能为空。");
          return;
        }
      }
      var measurementData = this._getCurrentMeasurementData();
      var result = SchemeState.saveCurrent(name, this.scheme, measurementData);
      if (result) {
        this._updateSaveButton();
      }
    }.bind(this);
    this.exportBtn.onclick = function() { this.exportJSON(); }.bind(this);
    this.importBtn.onclick = function() { this.importFileInput.click(); }.bind(this);
    this.importFileInput.onchange = function() {
      var file = this.importFileInput.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          try {
            var raw = JSON.parse(e.target.result);
            this._pendingImportMeasurement = MeasurementSerializer.parseImportData(raw);
          } catch (err) {
            this._pendingImportMeasurement = null;
          }
        }.bind(this);
        reader.readAsText(file, "utf-8");
      }
      ImportUI.open(this.importFileInput, this.parts, function(parts) { this.applyImportedScheme(parts); }.bind(this));
    }.bind(this);

    this.canvas.onpointerleave = function() {
      if (MeasurementState.isActive && MeasurementState.hoverPoint) {
        MeasurementState.setHoverPoint(null, null);
      }
    }.bind(this);

    this.measureBtn.onclick = function() {
      MeasurementState.toggleMode();
      if (MeasurementState.isActive) {
        this.canvas.classList.add("measuring");
        this.measureBtn.classList.remove("secondary");
        this.measureBtn.textContent = "退出测量";
      } else {
        this.canvas.classList.remove("measuring");
        this.measureBtn.classList.add("secondary");
        this.measureBtn.textContent = "测量模式";
      }
    }.bind(this);

    window.onkeydown = function(event) {
      if (event.key === "Escape" && MeasurementState.isActive) {
        if (MeasurementState.pendingPoint) {
          MeasurementState.clearPending();
        } else {
          MeasurementState.toggleMode();
          this.canvas.classList.remove("measuring");
          this.measureBtn.classList.add("secondary");
          this.measureBtn.textContent = "测量模式";
        }
        event.preventDefault();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !MeasurementState.isActive) {
        if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
          return;
        }
        if (SelectionManager.count() > 0) {
          var ids = SelectionManager.getIds();
          var idSet = new Set(ids);
          this.scheme = this.scheme.filter(function(x) { return !idSet.has(x.id); });
          SelectionManager.clear();
          this.refreshPlayerSteps();
          this.renderAll();
          event.preventDefault();
        }
      }
      if ((event.key === "Delete" || event.key === "Backspace") && MeasurementState.selectedAnnotationId) {
        if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
          return;
        }
        MeasurementState.removeAnnotation(MeasurementState.selectedAnnotationId);
        event.preventDefault();
      }
    }.bind(this);
  },

  renderAll(opts) {
    opts = opts || {};
    var isAssemblyMode = AssemblyPlayerState.isActive;
    var playerState = AssemblyPlayerState.getState();
    var renderOpts = {
      isAssemblyMode: isAssemblyMode,
      visiblePartIds: playerState.installedPartIds,
      currentPartId: playerState.currentStepInfo ? playerState.currentStepInfo.partId : null
    };
    var measureState = MeasurementState.getState();
    var selectedSet = this._getSelectedSet();

    if (!opts.editorOnly && !opts.treeAndChecksOnly) {
      Renderer.render(this.canvas, this.scheme, selectedSet, this.errorPartIds, function(id, ox, oy, shiftKey) {
        if (AssemblyPlayerState.isActive) return;
        if (MeasurementState.isActive) return;
        if (shiftKey) {
          SelectionManager.toggle(id);
        } else {
          SelectionManager.select(id);
        }
        this.drag = { id: id, ox: ox, oy: oy };
        this.renderAll();
      }.bind(this), renderOpts);

      AnnotationRenderer.render(this.canvas, measureState);

      this.canvas.querySelectorAll(".annotation-group").forEach(function(el) {
        el.onclick = function(event) {
          event.stopPropagation();
          MeasurementState.selectAnnotation(el.dataset.annotationId);
        };
      });
    }

    if (!isAssemblyMode) {
      ComponentEditor.renderEditor(this.editor, this.scheme, selectedSet,
        function(editorOpts) {
          this.refreshPlayerSteps();
          this.renderAll(editorOpts || {});
        }.bind(this),
        function(id) {
          this.scheme = this.scheme.filter(function(x) { return x.id !== id; });
          SelectionManager.removeFromSelection(id);
          this.refreshPlayerSteps();
          this.renderAll();
        }.bind(this)
      );
    }

    if (!opts.editorOnly) {
      if (!isAssemblyMode) {
        Renderer.renderTree(this.tree, this.scheme);
        var checkResult = Renderer.renderChecks(this.checks, this.scheme, this.parts,
          function(id) { this.selectPartById(id); }.bind(this)
        );
        this.errorPartIds = checkResult.errorPartIds;
      }
    }

    AnnotationRenderer.renderMeasurementPanel(
      this.measurementPanel,
      measureState,
      function(id) { MeasurementState.removeAnnotation(id); },
      function(id) { MeasurementState.selectAnnotation(id); },
      function(px, unit) { MeasurementState.setScale(px, unit); }
    );

    BatchPanel.render(SelectionManager.count());

    var measurementData = this._getCurrentMeasurementData();
    SchemeState.updateCurrent(this.scheme, measurementData);

    Preview3D.updateScheme(this.scheme);
    Preview3D.setHighlightedIds(selectedSet);

    this._updateSaveButton();
  },

  selectPartById(id) {
    SelectionManager.select(id);
    var part = this.scheme.find(function(p) { return p.id === id; });
    if (part) {
      var partEl = this.canvas.querySelector('.part[data-id="' + id + '"]');
      if (partEl) {
        partEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }
    this.renderAll();
  },

  addPart(type) {
    var newPart = {
      id: crypto.randomUUID(),
      type: type,
      x: 460 + Math.random() * 120,
      y: 320 + Math.random() * 80,
      layer: 1,
      dir: "正",
      connect: ""
    };
    this.scheme.push(newPart);
    SelectionManager.select(newPart.id);
    this.refreshPlayerSteps();
    this.renderAll();
  },

  loadTemplate(tplId) {
    if (this.hasUnsavedChanges()) {
      var ok = confirm("当前方案有未保存的改动，加载模板将丢失这些改动。确定要继续吗？");
      if (!ok) return;
    }
    var tpl = DOUGONG_TEMPLATES.find(function(t) { return t.id === tplId; });
    if (!tpl) return;
    this.scheme = tpl.parts.map(function(p) { return { id: crypto.randomUUID(), type: p.type, x: p.x, y: p.y, layer: p.layer, dir: p.dir, connect: p.connect }; });
    this._applyMeasurementData(null);
    SelectionManager.clear();
    SchemeState.clearCurrent();
    this.refreshPlayerSteps();
    this.renderAll();
  },

  exportJSON() {
    var data = MeasurementSerializer.buildExportData(
      this.scheme,
      MeasurementState.getAnnotations(),
      MeasurementState.getScale()
    );
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dougong-scheme.json";
    a.click();
    URL.revokeObjectURL(a.href);
  },

  applyImportedScheme(parts) {
    if (this.hasUnsavedChanges()) {
      var ok = confirm("当前方案有未保存的改动，导入新方案将丢失这些改动。确定要继续吗？");
      if (!ok) return;
    }

    var MAX_LAYER = 16;
    var MIN_LAYER = 1;
    var VALID_DIRS = ["正", "左挑", "右挑"];
    this.scheme = parts.map(function(p) {
      var item = Object.assign({}, p);
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        item.id = crypto.randomUUID();
      }
      if (item.layer === undefined || item.layer === null || isNaN(Number(item.layer))) {
        item.layer = MIN_LAYER;
      } else {
        var n = Math.round(Number(item.layer));
        item.layer = (n < MIN_LAYER || n > MAX_LAYER) ? Math.min(MAX_LAYER, Math.max(MIN_LAYER, n)) : n;
      }
      if (item.x === undefined || item.x === null || isNaN(Number(item.x))) {
        item.x = Math.round(460 + Math.random() * 120);
      } else {
        item.x = Math.round(Number(item.x));
      }
      if (item.y === undefined || item.y === null || isNaN(Number(item.y))) {
        item.y = Math.round(320 + Math.random() * 80);
      } else {
        item.y = Math.round(Number(item.y));
      }
      if (!item.dir || typeof item.dir !== "string" || !VALID_DIRS.includes(item.dir.trim())) {
        item.dir = "正";
      } else {
        item.dir = item.dir.trim();
      }
      if (item.connect === undefined || item.connect === null) {
        item.connect = "";
      } else {
        item.connect = String(item.connect);
      }
      return item;
    });
    SelectionManager.clear();

    if (this._pendingImportMeasurement && this._pendingImportMeasurement.measurement) {
      var m = this._pendingImportMeasurement.measurement;
      MeasurementState.init(m.annotations, m.scale);
    } else {
      MeasurementState.init([], null);
    }
    this._pendingImportMeasurement = null;

    SchemeState.clearCurrent();

    this.refreshPlayerSteps();
    this.renderAll();
  }
};

document.addEventListener("DOMContentLoaded", function() { App.init(); });
