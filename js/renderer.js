const Renderer = {
  render(canvas, scheme, selected, errorPartIds, onSelect, opts = {}) {
    const errorSet = new Set(errorPartIds || []);
    const visibleSet = opts.visiblePartIds ? new Set(opts.visiblePartIds) : null;
    const currentPartId = opts.currentPartId || null;
    const isAssemblyMode = opts.isAssemblyMode || false;
    const selectedSet = selected instanceof Set ? selected : new Set(selected ? [selected] : []);
    const previewState = opts.previewState || null;

    if (isAssemblyMode) {
      canvas.classList.add("assembly-mode");
    } else {
      canvas.classList.remove("assembly-mode");
    }

    if (previewState && previewState.isPreviewing) {
      canvas.classList.add("repair-preview-mode");
    } else {
      canvas.classList.remove("repair-preview-mode");
    }

    const positionAdjustSet = new Set();
    const connectUpdateSet = new Set();
    const symmetryAddSet = new Set();
    const previewPositions = {};

    if (previewState && previewState.repairPlan) {
      const plan = previewState.repairPlan;
      plan.groupedByType.position_adjust.forEach(a => {
        positionAdjustSet.add(a.partId);
        previewPositions[a.partId] = a.after;
      });
      plan.groupedByType.connect_update.forEach(a => connectUpdateSet.add(a.partId));
      plan.groupedByType.symmetry_add.forEach(a => symmetryAddSet.add(a.partId));
    }

    let html = scheme.map(p => {
      const classes = ["part", p.type];
      if (selectedSet.has(p.id)) classes.push("selected");
      if (selectedSet.size > 1 && selectedSet.has(p.id)) classes.push("multi-selected");
      if (errorSet.has(p.id)) classes.push("has-error");
      if (p.id === currentPartId) classes.push("assembly-current");
      if (visibleSet && !visibleSet.has(p.id)) classes.push("assembly-hidden");

      let previewClass = "";
      let previewStyle = "";
      let overlayHtml = "";

      if (previewState && previewState.isPreviewing) {
        if (positionAdjustSet.has(p.id)) {
          previewClass = " preview-position-adjust";
          const pos = previewPositions[p.id];
          const offsetX = pos.x - p.x;
          const offsetY = pos.y - p.y;
          previewStyle = ';--preview-offset-x:' + offsetX + 'px;--preview-offset-y:' + offsetY + 'px';
          overlayHtml = '<div class="preview-overlay preview-new-position" style="transform: translate(' + offsetX + 'px, ' + offsetY + 'px)"></div>';
        }
        if (connectUpdateSet.has(p.id) && !positionAdjustSet.has(p.id)) {
          previewClass = " preview-connect-update";
        }
        if (symmetryAddSet.has(p.id)) {
          previewClass = " preview-symmetry-add";
        }
      }

      return '<div class="' + classes.join(" ") + previewClass + '" data-id="' + p.id +
        '" style="left:' + p.x + 'px;top:' + p.y + 'px;--explode:' + (-p.layer * 34) + 'px' + previewStyle + '">' +
        p.type + overlayHtml + '</div>';
    }).join("");

    if (previewState && previewState.isPreviewing && previewState.showGhostOriginals) {
      scheme.forEach(p => {
        if (positionAdjustSet.has(p.id)) {
          const pos = previewPositions[p.id];
          html += '<div class="part ghost-original ' + p.type + '" data-ghost-id="' + p.id +
            '" style="left:' + p.x + 'px;top:' + p.y + 'px;--explode:' + (-p.layer * 34) + 'px;opacity:0.3;pointer-events:none">' +
            p.type + '</div>';
        }
      });
    }

    if (previewState && previewState.isPreviewing && previewState.repairPlan) {
      const symmetryActions = previewState.repairPlan.groupedByType.symmetry_add;
      symmetryActions.forEach(action => {
        if (action.after) {
          const exists = scheme.some(p => p.id === action.partId);
          if (!exists) {
            html += '<div class="part preview-symmetry-add ' + action.partType + '" data-preview-id="' + action.partId +
              '" style="left:' + action.after.x + 'px;top:' + action.after.y +
              'px;--explode:' + (-action.after.layer * 34) + 'px;opacity:0.7;pointer-events:none;border-style:dashed;">' +
              '<span style="font-size:10px;opacity:0.8;">(新增)</span> ' + action.partType + '</div>';
          }
        }
      });
    }

    canvas.innerHTML = html;

    if (!isAssemblyMode) {
      canvas.querySelectorAll(".part:not(.ghost-original)").forEach(el => {
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

  renderEditor(editor, scheme, selected, onChange, onDelete, opts) {
    ComponentEditor.renderEditor(editor, scheme, selected, onChange, onDelete, opts);
  },

  renderTree(tree, scheme) {
    const grouped = scheme.slice().sort((a, b) => a.layer - b.layer);
    tree.innerHTML = grouped.map(p =>
      '<div class="item">第' + p.layer + '层 · ' + p.type + ' · ' + (p.connect || "未设连接") + '</div>'
    ).join("");
  },

  renderChecks(checks, scheme, parts, onSelectParts, precomputedResult) {
    const result = precomputedResult || AssemblyChecker.checkAll(scheme, parts);
    const countsHtml = '<div class="item">' + result.counts + '</div>';

    if (result.issues.length === 0) {
      checks.innerHTML = countsHtml +
        '<div class="item ok">装配关系暂未发现明显问题。</div>';
      return { errorPartIds: [], warningPartIds: [] };
    }

    const errorPartIds = [];
    const warningPartIds = [];

    const issuesHtml = result.issues.map((issue, idx) => {
      if (issue.severity === "error") {
        errorPartIds.push(issue.partId);
        if (issue.relatedPartIds) errorPartIds.push(...issue.relatedPartIds);
      } else {
        warningPartIds.push(issue.partId);
        if (issue.relatedPartIds) warningPartIds.push(...issue.relatedPartIds);
      }
      const allIds = [issue.partId];
      if (issue.relatedPartIds) allIds.push(...issue.relatedPartIds);
      const sevClass = issue.severity === "error" ? "bad" : "warn";
      const sevLabel = issue.severity === "error" ? "错误" : "警告";
      return '<div class="item issue-item ' + sevClass + '" data-issue-idx="' + idx + '" title="点击定位相关构件">' +
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
        const idx = parseInt(el.dataset.issueIdx, 10);
        const issue = result.issues[idx];
        if (!issue) return;
        const allIds = [issue.partId];
        if (issue.relatedPartIds) allIds.push(...issue.relatedPartIds);
        if (onSelectParts) onSelectParts(allIds);
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
