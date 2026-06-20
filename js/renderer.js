const Renderer = {
  render(canvas, scheme, selected, errorPartIds, onSelect) {
    const errorSet = new Set(errorPartIds || []);
    canvas.innerHTML = scheme.map(p => {
      const classes = ["part", p.type];
      if (p.id === selected) classes.push("selected");
      if (errorSet.has(p.id)) classes.push("has-error");
      return '<div class="' + classes.join(" ") + '" data-id="' + p.id +
        '" style="left:' + p.x + 'px;top:' + p.y + 'px;--explode:' + (-p.layer * 34) + 'px">' +
        p.type + '</div>';
    }).join("");
    canvas.querySelectorAll(".part").forEach(el => {
      el.onpointerdown = event => {
        const id = el.dataset.id;
        onSelect(id, event.offsetX, event.offsetY);
      };
    });
  },

  renderEditor(editor, scheme, selected, onChange, onDelete) {
    const p = scheme.find(x => x.id === selected);
    if (!p) {
      editor.innerHTML = "请选择构件。";
      return;
    }
    editor.innerHTML =
      '<div class="item"><b>' + p.type + '</b>' +
      '<label>层级</label><input id="layerInput" type="number" min="1" max="16" value="' + p.layer + '">' +
      '<label>方向</label><select id="dirInput"><option>正</option><option>左挑</option><option>右挑</option></select>' +
      '<label>连接点</label><input id="connectInput" value="' + p.connect + '">' +
      '<button id="deleteBtn" class="secondary">删除构件</button></div>';
    document.querySelector("#dirInput").value = p.dir;
    document.querySelector("#layerInput").onchange = e => {
      p.layer = Number(e.target.value);
      onChange();
    };
    document.querySelector("#dirInput").onchange = e => {
      p.dir = e.target.value;
      onChange();
    };
    document.querySelector("#connectInput").oninput = e => {
      p.connect = e.target.value;
      onChange({ treeAndChecksOnly: true });
    };
    document.querySelector("#deleteBtn").onclick = () => {
      onDelete(p.id);
    };
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
