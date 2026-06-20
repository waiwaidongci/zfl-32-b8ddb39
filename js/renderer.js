const Renderer = {
  render(canvas, scheme, selected, errorPartIds, onSelect, opts = {}) {
    const errorSet = new Set(errorPartIds || []);
    const visibleSet = opts.visiblePartIds ? new Set(opts.visiblePartIds) : null;
    const currentPartId = opts.currentPartId || null;
    const isAssemblyMode = opts.isAssemblyMode || false;
    const selectedSet = selected instanceof Set ? selected : new Set(selected ? [selected] : []);

    if (isAssemblyMode) {
      canvas.classList.add("assembly-mode");
    } else {
      canvas.classList.remove("assembly-mode");
    }

    canvas.innerHTML = scheme.map(p => {
      const classes = ["part", p.type];
      if (selectedSet.has(p.id)) classes.push("selected");
      if (selectedSet.size > 1 && selectedSet.has(p.id)) classes.push("multi-selected");
      if (errorSet.has(p.id)) classes.push("has-error");
      if (p.id === currentPartId) classes.push("assembly-current");
      if (visibleSet && !visibleSet.has(p.id)) classes.push("assembly-hidden");
      return '<div class="' + classes.join(" ") + '" data-id="' + p.id +
        '" style="left:' + p.x + 'px;top:' + p.y + 'px;--explode:' + (-p.layer * 34) + 'px">' +
        p.type + '</div>';
    }).join("");

    if (!isAssemblyMode) {
      canvas.querySelectorAll(".part").forEach(el => {
        el.onpointerdown = event => {
          const id = el.dataset.id;
          onSelect(id, event.offsetX, event.offsetY, event.shiftKey);
        };
      });
    } else {
      canvas.querySelectorAll(".part").forEach(el => {
        el.onpointerdown = null;
        el.style.cursor = "default";
      });
    }
  },

  renderEditor(editor, scheme, selected, onChange, onDelete) {
    ComponentEditor.renderEditor(editor, scheme, selected, onChange, onDelete);
  },

  renderTree(tree, scheme) {
    const grouped = scheme.slice().sort((a, b) => a.layer - b.layer);
    tree.innerHTML = grouped.map(p =>
      '<div class="item">第' + p.layer + '层 · ' + p.type + ' · ' + (p.connect || "未设连接") + '</div>'
    ).join("");
  },

  renderChecks(checks, scheme, parts, onSelectPart) {
    const result = AssemblyChecker.checkAll(scheme, parts);
    const countsHtml = '<div class="item">' + result.counts + '</div>';

    if (result.issues.length === 0) {
      checks.innerHTML = countsHtml +
        '<div class="item ok">装配关系暂未发现明显问题。</div>';
      return { errorPartIds: [], warningPartIds: [] };
    }

    const errorPartIds = [];
    const warningPartIds = [];

    const issuesHtml = result.issues.map(issue => {
      if (issue.severity === "error") {
        errorPartIds.push(issue.partId);
        if (issue.relatedPartIds) errorPartIds.push(...issue.relatedPartIds);
      } else {
        warningPartIds.push(issue.partId);
        if (issue.relatedPartIds) warningPartIds.push(...issue.relatedPartIds);
      }
      const sevClass = issue.severity === "error" ? "bad" : "warn";
      const sevLabel = issue.severity === "error" ? "错误" : "警告";
      return '<div class="item issue-item ' + sevClass + '" data-part-id="' + issue.partId + '" title="点击定位此构件">' +
        '<span class="sev-badge">' + sevLabel + '</span>' +
        issue.message +
        '</div>';
    }).join("");

    checks.innerHTML = countsHtml +
      '<div class="checks-summary">发现 <b class="bad">' + result.errorCount + '</b> 个错误，<b class="warn">' + result.warningCount + '</b> 个警告</div>' +
      issuesHtml;

    checks.querySelectorAll(".issue-item").forEach(el => {
      el.style.cursor = "pointer";
      el.onclick = () => {
        const id = el.dataset.partId;
        if (id && onSelectPart) onSelectPart(id);
      };
    });

    return {
      errorPartIds: Array.from(new Set(errorPartIds)),
      warningPartIds: Array.from(new Set(warningPartIds))
    };
  },

  renderLibrary(library, parts, onAdd) {
    library.innerHTML = parts.map(p =>
      '<button class="partBtn" data-add="' + p + '">' + p + '</button>'
    ).join("");
    library.querySelectorAll("[data-add]").forEach(btn => {
      btn.onclick = () => onAdd(btn.dataset.add);
    });
  },

  renderTemplates(templateLibrary, templates, onLoad) {
    templateLibrary.innerHTML = templates.map(tpl =>
      '<div class="templateCard" data-tpl="' + tpl.id + '">' +
        '<div class="tplName">' + tpl.name + '</div>' +
        '<div class="tplMeta">' + tpl.scale + ' · 共' + tpl.partsCount + '件构件</div>' +
        '<div class="tplDesc">' + tpl.description + '</div>' +
      '</div>'
    ).join("");
    templateLibrary.querySelectorAll("[data-tpl]").forEach(card => {
      card.onclick = () => onLoad(card.dataset.tpl);
    });
  }
};

if (typeof module !== "undefined") module.exports = { Renderer };
