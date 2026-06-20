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

  scheme: [],
  selected: "",
  drag: null,
  errorPartIds: [],
  playerUnsubscribe: null,
  measurementUnsubscribe: null,

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

    this.scheme = JSON.parse(localStorage.getItem("zfl32Scheme") || "null") || [
      { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" },
      { id: crypto.randomUUID(), type: "华拱", x: 495, y: 450, layer: 2, dir: "正", connect: "下承" }
    ];

    this.initMeasurement();
    this.bindEvents();
    this.initPlayer();
    this.renderAll();
  },

  initMeasurement() {
    var saved = MeasurementSerializer.loadFromLocalStorage();
    if (saved) {
      MeasurementState.init(saved.annotations, saved.scale);
    } else {
      MeasurementState.init([], null);
    }

    this.measurementUnsubscribe = MeasurementState.subscribe(() => {
      this.renderAll();
    });
  },

  initPlayer() {
    AssemblyPlayerState.init(this.scheme);

    if (this.playerControls && this.playerStepInfo) {
      AssemblyPlayerUI.init("#playerControls", "#playerStepInfo", {
        onStart: () => this.startAssemblyDemo(),
        onStop: () => this.stopAssemblyDemo()
      });
    }

    this.playerUnsubscribe = AssemblyPlayerState.subscribe(() => {
      this.renderAll();
    });
  },

  startAssemblyDemo() {
    if (!AssemblyPlayerState.hasSteps()) {
      alert("当前方案没有构件，无法进行装配演示。");
      return;
    }
    this.drag = null;
    this.selected = "";
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

  bindEvents() {
    Renderer.renderLibrary(this.library, this.parts, type => this.addPart(type));
    Renderer.renderTemplates(this.templateLibrary, DOUGONG_TEMPLATES, tplId => this.loadTemplate(tplId));

    window.onpointermove = event => {
      var zoom = Number(this.zoomInput.value) / 100;
      var rect = this.canvas.getBoundingClientRect();

      if (MeasurementState.isActive && MeasurementState.pendingPoint && !AssemblyPlayerState.isActive) {
        var hoverX = Math.round((event.clientX - rect.left) / zoom);
        var hoverY = Math.round((event.clientY - rect.top) / zoom);
        MeasurementState.setHoverPoint(hoverX, hoverY);
      }

      if (!this.drag || AssemblyPlayerState.isActive) return;
      const item = this.scheme.find(p => p.id === this.drag.id);
      if (!item) return;
      item.x = Math.round((event.clientX - rect.left) / zoom - this.drag.ox);
      item.y = Math.round((event.clientY - rect.top) / zoom - this.drag.oy);
      this.renderAll();
    };

    window.onpointerup = () => {
      if (this.drag && !AssemblyPlayerState.isActive) {
        this.refreshPlayerSteps();
      }
      this.drag = null;
    };

    this.canvas.onclick = event => {
      if (!MeasurementState.isActive) return;
      if (AssemblyPlayerState.isActive) return;

      var zoom = Number(this.zoomInput.value) / 100;
      var rect = this.canvas.getBoundingClientRect();
      var canvasX = Math.round((event.clientX - rect.left) / zoom);
      var canvasY = Math.round((event.clientY - rect.top) / zoom);

      var partEl = event.target.closest(".part");
      if (partEl) {
        var partId = partEl.dataset.id;
        var part = this.scheme.find(p => p.id === partId);
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
    };

    this.zoomInput.oninput = e => this.canvas.style.transform = "scale(" + (Number(e.target.value) / 100) + ")";
    this.zoomInput.dispatchEvent(new Event("input"));

    this.explodeBtn.onclick = () => this.canvas.classList.toggle("exploded");
    this.saveBtn.onclick = () => {
      localStorage.setItem("zfl32Scheme", JSON.stringify(this.scheme));
      MeasurementSerializer.saveToLocalStorage(
        MeasurementState.getAnnotations(),
        MeasurementState.getScale()
      );
    };
    this.exportBtn.onclick = () => this.exportJSON();
    this.importBtn.onclick = () => this.importFileInput.click();
    this.importFileInput.onchange = () => {
      var file = this.importFileInput.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = (e) => {
          try {
            var raw = JSON.parse(e.target.result);
            this._pendingImportMeasurement = MeasurementSerializer.parseImportData(raw);
          } catch (err) {
            this._pendingImportMeasurement = null;
          }
        };
        reader.readAsText(file, "utf-8");
      }
      ImportUI.open(this.importFileInput, this.parts, parts => this.applyImportedScheme(parts));
    };

    this.canvas.onpointerleave = () => {
      if (MeasurementState.isActive && MeasurementState.hoverPoint) {
        MeasurementState.setHoverPoint(null, null);
      }
    };

    this.measureBtn.onclick = () => {
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
    };

    window.onkeydown = event => {
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
      if ((event.key === "Delete" || event.key === "Backspace") && MeasurementState.selectedAnnotationId) {
        if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
          return;
        }
        MeasurementState.removeAnnotation(MeasurementState.selectedAnnotationId);
        event.preventDefault();
      }
    };
  },

  renderAll(opts = {}) {
    const isAssemblyMode = AssemblyPlayerState.isActive;
    const playerState = AssemblyPlayerState.getState();
    const renderOpts = {
      isAssemblyMode: isAssemblyMode,
      visiblePartIds: playerState.installedPartIds,
      currentPartId: playerState.currentStepInfo ? playerState.currentStepInfo.partId : null
    };
    const measureState = MeasurementState.getState();

    if (!opts.editorOnly && !opts.treeAndChecksOnly) {
      Renderer.render(this.canvas, this.scheme, this.selected, this.errorPartIds, (id, ox, oy) => {
        if (AssemblyPlayerState.isActive) return;
        if (MeasurementState.isActive) return;
        this.selected = id;
        this.drag = { id, ox, oy };
        this.renderAll();
      }, renderOpts);

      AnnotationRenderer.render(this.canvas, measureState);

      this.canvas.querySelectorAll(".annotation-group").forEach(el => {
        el.onclick = event => {
          event.stopPropagation();
          MeasurementState.selectAnnotation(el.dataset.annotationId);
        };
      });
    }

    if (!isAssemblyMode) {
      Renderer.renderEditor(this.editor, this.scheme, this.selected,
        editorOpts => {
          this.refreshPlayerSteps();
          this.renderAll(editorOpts || {});
        },
        id => {
          this.scheme = this.scheme.filter(x => x.id !== id);
          this.selected = "";
          this.refreshPlayerSteps();
          this.renderAll();
        }
      );
    }

    if (!opts.editorOnly) {
      if (!isAssemblyMode) {
        Renderer.renderTree(this.tree, this.scheme);
        const checkResult = Renderer.renderChecks(this.checks, this.scheme, this.parts,
          id => this.selectPartById(id)
        );
        this.errorPartIds = checkResult.errorPartIds;
      }
    }

    AnnotationRenderer.renderMeasurementPanel(
      this.measurementPanel,
      measureState,
      id => MeasurementState.removeAnnotation(id),
      id => MeasurementState.selectAnnotation(id),
      (px, unit) => MeasurementState.setScale(px, unit)
    );
  },

  selectPartById(id) {
    this.selected = id;
    const part = this.scheme.find(p => p.id === id);
    if (part) {
      const rect = this.canvas.getBoundingClientRect();
      const zoom = Number(this.zoomInput.value) / 100;
      const partEl = this.canvas.querySelector('.part[data-id="' + id + '"]');
      if (partEl) {
        partEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }
    this.renderAll();
  },

  addPart(type) {
    this.scheme.push({
      id: crypto.randomUUID(),
      type,
      x: 460 + Math.random() * 120,
      y: 320 + Math.random() * 80,
      layer: 1,
      dir: "正",
      connect: ""
    });
    this.refreshPlayerSteps();
    this.renderAll();
  },

  loadTemplate(tplId) {
    const tpl = DOUGONG_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    this.scheme = tpl.parts.map(p => ({ id: crypto.randomUUID(), ...p }));
    this.selected = "";
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
    const MAX_LAYER = 16;
    const MIN_LAYER = 1;
    const VALID_DIRS = ["正", "左挑", "右挑"];
    this.scheme = parts.map(p => {
      const item = { ...p };
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        item.id = crypto.randomUUID();
      }
      if (item.layer === undefined || item.layer === null || isNaN(Number(item.layer))) {
        item.layer = MIN_LAYER;
      } else {
        const n = Math.round(Number(item.layer));
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
    this.selected = "";

    if (this._pendingImportMeasurement && this._pendingImportMeasurement.measurement) {
      var m = this._pendingImportMeasurement.measurement;
      MeasurementState.init(m.annotations, m.scale);
    } else {
      MeasurementState.init([], null);
    }
    this._pendingImportMeasurement = null;

    this.refreshPlayerSteps();
    this.renderAll();
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
