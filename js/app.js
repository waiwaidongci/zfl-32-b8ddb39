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

  scheme: [],
  selected: "",
  drag: null,
  errorPartIds: [],
  playerUnsubscribe: null,

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

    this.scheme = JSON.parse(localStorage.getItem("zfl32Scheme") || "null") || [
      { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" },
      { id: crypto.randomUUID(), type: "华拱", x: 495, y: 450, layer: 2, dir: "正", connect: "下承" }
    ];

    this.bindEvents();
    this.initPlayer();
    this.renderAll();
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
      if (!this.drag || AssemblyPlayerState.isActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const item = this.scheme.find(p => p.id === this.drag.id);
      if (!item) return;
      const zoom = Number(this.zoomInput.value) / 100;
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

    this.zoomInput.oninput = e => this.canvas.style.transform = "scale(" + (Number(e.target.value) / 100) + ")";
    this.zoomInput.dispatchEvent(new Event("input"));

    this.explodeBtn.onclick = () => this.canvas.classList.toggle("exploded");
    this.saveBtn.onclick = () => localStorage.setItem("zfl32Scheme", JSON.stringify(this.scheme));
    this.exportBtn.onclick = () => this.exportJSON();
    this.importBtn.onclick = () => this.importFileInput.click();
    this.importFileInput.onchange = () => ImportUI.open(this.importFileInput, this.parts, parts => this.applyImportedScheme(parts));
  },

  renderAll(opts = {}) {
    const isAssemblyMode = AssemblyPlayerState.isActive;
    const playerState = AssemblyPlayerState.getState();
    const renderOpts = {
      isAssemblyMode: isAssemblyMode,
      visiblePartIds: playerState.installedPartIds,
      currentPartId: playerState.currentStepInfo ? playerState.currentStepInfo.partId : null
    };

    if (!opts.editorOnly && !opts.treeAndChecksOnly) {
      Renderer.render(this.canvas, this.scheme, this.selected, this.errorPartIds, (id, ox, oy) => {
        if (AssemblyPlayerState.isActive) return;
        this.selected = id;
        this.drag = { id, ox, oy };
        this.renderAll();
      }, renderOpts);
    }

    if (!isAssemblyMode) {
      Renderer.renderEditor(this.editor, this.scheme, this.selected,
        editorOpts => {
          if (!editorOpts || !editorOpts.treeAndChecksOnly) {
            this.refreshPlayerSteps();
          }
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
      if (!opts.editorOnly && !opts.treeAndChecksOnly) {
        Renderer.render(this.canvas, this.scheme, this.selected, this.errorPartIds, (id, ox, oy) => {
          if (AssemblyPlayerState.isActive) return;
          this.selected = id;
          this.drag = { id, ox, oy };
          this.renderAll();
        }, renderOpts);
      }
    }
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
    const blob = new Blob([JSON.stringify(this.scheme, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
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
    this.refreshPlayerSteps();
    this.renderAll();
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
