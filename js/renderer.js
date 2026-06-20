const PART_SIZES = {
  "栌斗": { w: 74, h: 52 },
  "华拱": { w: 124, h: 34 },
  "昂": { w: 112, h: 28 },
  "耍头": { w: 92, h: 32 },
  "散斗": { w: 48, h: 38 }
};

function partsAreSupported(upper, lower) {
  const us = PART_SIZES[upper.type] || { w: 60, h: 40 };
  const ls = PART_SIZES[lower.type] || { w: 60, h: 40 };
  const uLeft = upper.x, uRight = upper.x + us.w;
  const lLeft = lower.x, lRight = lower.x + ls.w;
  const overlapX = Math.min(uRight, lRight) - Math.max(uLeft, lLeft);
  const uBottom = upper.y + us.h;
  const lTop = lower.y;
  const gapY = lTop - uBottom;
  return overlapX > -12 && gapY > -20 && gapY < 80;
}

const Renderer = {
  render(canvas, scheme, selected, onSelect) {
    canvas.innerHTML = scheme.map(p =>
      '<div class="part ' + p.type + ' ' + (p.id === selected ? 'selected' : '') +
      '" data-id="' + p.id +
      '" style="left:' + p.x + 'px;top:' + p.y + 'px;--explode:' + (-p.layer * 34) + 'px">' +
      p.type + '</div>'
    ).join("");
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
      '<label>层级</label><input id="layerInput" type="number" min="1" max="8" value="' + p.layer + '">' +
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

  renderChecks(checks, scheme, parts) {
    const issues = [];
    for (const p of scheme) {
      if (p.layer > 1 && !scheme.some(o =>
        o.layer === p.layer - 1 && partsAreSupported(p, o)
      )) {
        issues.push(p.type + "第" + p.layer + "层可能悬空");
      }
      if (!p.connect) {
        issues.push(p.type + "缺少连接点");
      }
    }
    const counts = parts.map(type =>
      type + "：" + scheme.filter(p => p.type === type).length
    ).join(" / ");
    checks.innerHTML = '<div class="item">' + counts + '</div>' +
      (issues.length
        ? issues.map(i => '<div class="item bad">' + i + '</div>').join("")
        : '<div class="item ok">装配关系暂未发现明显问题。</div>');
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
