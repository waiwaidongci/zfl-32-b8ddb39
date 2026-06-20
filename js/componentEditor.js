const ComponentEditor = {
  renderEditor(editor, scheme, selected, onChange, onDelete) {
    var selectedIds = selected instanceof Set ? selected : new Set(selected ? [selected] : []);
    var p = scheme.find(function(x) { return selectedIds.has(x.id); });
    if (!p) {
      editor.innerHTML = "请选择构件。";
      return;
    }

    var multiCount = selectedIds.size > 1
      ? ' <span class="batch-info" style="font-size:12px;color:#8d3d2d">（已选' + selectedIds.size + '项）</span>'
      : '';

    var editorHtml = `
      <div class="component-editor-wrapper">
        <div class="editor-section">
          <div class="item editor-item">
            <b>${p.type}</b>${multiCount}
            <label>层级</label>
            <input id="layerInput" type="number" min="1" max="16" value="${p.layer}">
            <label>方向</label>
            <select id="dirInput">
              <option>正</option>
              <option>左挑</option>
              <option>右挑</option>
            </select>
            <label>连接点</label>
            <input id="connectInput" value="${p.connect}">
            <button id="deleteBtn" class="secondary">删除构件</button>
          </div>
        </div>
        <div class="detail-section-wrapper">
          <div class="detail-section-divider"></div>
          <div class="detail-section-title-bar">
            <span class="detail-section-label">构件详情资料</span>
          </div>
          <div class="detail-content-wrapper">
            ${ComponentDetailRenderer.render(p.type)}
          </div>
        </div>
      </div>
    `;

    editor.innerHTML = editorHtml;

    var dirInput = document.querySelector("#dirInput");
    if (dirInput) dirInput.value = p.dir;

    var layerInput = document.querySelector("#layerInput");
    if (layerInput) {
      layerInput.onchange = e => {
        p.layer = Number(e.target.value);
        onChange();
      };
    }

    if (dirInput) {
      dirInput.onchange = e => {
        p.dir = e.target.value;
        onChange();
      };
    }

    var connectInput = document.querySelector("#connectInput");
    if (connectInput) {
      connectInput.oninput = e => {
        p.connect = e.target.value;
        onChange({ treeAndChecksOnly: true });
      };
    }

    var deleteBtn = document.querySelector("#deleteBtn");
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        onDelete(p.id);
      };
    }
  }
};

if (typeof module !== "undefined") module.exports = { ComponentEditor };
