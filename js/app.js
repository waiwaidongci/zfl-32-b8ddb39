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

  scheme: [],
  selected: "",
  drag: null,

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

    this.scheme = JSON.parse(localStorage.getItem("zfl32Scheme") || "null") || [
      { id: crypto.randomUUID(), type: "栌斗", x: 520, y: 520, layer: 1, dir: "正", connect: "柱头" },
      { id: crypto.randomUUID(), type: "华拱", x: 495, y: 450, layer: 2, dir: "正", connect: "下承" }
    ];

    this.bindEvents();
    this.renderAll();
  },

  bindEvents() {
    Renderer.renderLibrary(this.library, this.parts, type => this.addPart(type));
    Renderer.renderTemplates(this.templateLibrary, DOUGONG_TEMPLATES, tplId => this.loadTemplate(tplId));

    window.onpointermove = event => {
      if (!this.drag) return;
      const rect = this.canvas.getBoundingClientRect();
      const item = this.scheme.find(p => p.id === this.drag.id);
      const zoom = Number(this.zoomInput.value) / 100;
      item.x = Math.round((event.clientX - rect.left) / zoom - this.drag.ox);
      item.y = Math.round((event.clientY - rect.top) / zoom - this.drag.oy);
      this.renderAll();
    };

    window.onpointerup = () => this.drag = null;

    this.zoomInput.oninput = e => this.canvas.style.transform = "scale(" + (Number(e.target.value) / 100) + ")";
    this.zoomInput.dispatchEvent(new Event("input"));

    this.explodeBtn.onclick = () => this.canvas.classList.toggle("exploded");
    this.saveBtn.onclick = () => localStorage.setItem("zfl32Scheme", JSON.stringify(this.scheme));
    this.exportBtn.onclick = () => this.exportJSON();
  },

  renderAll(opts = {}) {
    if (!opts.editorOnly && !opts.treeAndChecksOnly) {
      Renderer.render(this.canvas, this.scheme, this.selected, (id, ox, oy) => {
        this.selected = id;
        this.drag = { id, ox, oy };
        this.renderAll();
      });
    }
    Renderer.renderEditor(this.editor, this.scheme, this.selected,
      editorOpts => this.renderAll(editorOpts || {}),
      id => {
        this.scheme = this.scheme.filter(x => x.id !== id);
        this.selected = "";
        this.renderAll();
      }
    );
    if (!opts.editorOnly) {
      Renderer.renderTree(this.tree, this.scheme);
      Renderer.renderChecks(this.checks, this.scheme, this.parts);
    }
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
    this.renderAll();
  },

  loadTemplate(tplId) {
    const tpl = DOUGONG_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    this.scheme = tpl.parts.map(p => ({ id: crypto.randomUUID(), ...p }));
    this.selected = "";
    this.renderAll();
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.scheme, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dougong-scheme.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
