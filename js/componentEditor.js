const ComponentEditor = {
  renderEditor(editor, scheme, selected, onChange, onDelete, opts) {
    opts = opts || {};
    var selectedIds = selected instanceof Set ? selected : new Set(selected ? [selected] : []);
    var p = scheme.find(function(x) { return selectedIds.has(x.id); });
    if (!p) {
      editor.innerHTML = "请选择构件。";
      return;
    }

    var multiCount = selectedIds.size > 1
      ? ' <span class="batch-info" style="font-size:12px;color:#8d3d2d">（已选' + selectedIds.size + '项）</span>'
      : '';

    var suggestions = [];
    try {
      suggestions = AutoLayoutConstraintModel.generateConnectSuggestions(p, scheme) || [];
    } catch (e) {
      suggestions = [];
    }

    var suggestionHtml = '';
    if (suggestions.length > 0) {
      suggestionHtml = `
        <div class="connect-suggestions-wrapper">
          <div class="connect-suggestions-label">快速建议</div>
          <div class="connect-suggestions-list">
            ${suggestions.map(function(s, i) {
              return '<button class="connect-suggestion-btn" data-suggestion="' + s + '" data-idx="' + i + '">' + s + '</button>';
            }).join('')}
          </div>
        </div>
      `;
    }

    var issueTips = [];
    if (opts.checkIssues && opts.checkIssues.length > 0) {
      issueTips = AssemblyChecker.getTipsForPart(opts.checkIssues, p.id);
    }

    var detailOptions = {
      issueTips: issueTips
    };

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
            ${suggestionHtml}
            <button id="deleteBtn" class="secondary">删除构件</button>
          </div>
        </div>
        <div class="detail-section-wrapper">
          <div class="detail-section-divider"></div>
          <div class="detail-section-title-bar">
            <span class="detail-section-label">构件详情资料</span>
          </div>
          <div class="detail-content-wrapper">
            ${ComponentDetailRenderer.render(p.type, detailOptions)}
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

    var suggestionBtns = editor.querySelectorAll(".connect-suggestion-btn");
    if (suggestionBtns && suggestionBtns.length > 0) {
      suggestionBtns.forEach(function(btn) {
        btn.onclick = function() {
          var value = btn.dataset.suggestion;
          if (value === undefined || value === null) return;

          if (connectInput) {
            connectInput.value = value;
          }
          p.connect = value;

          var activeBtn = editor.querySelector(".connect-suggestion-btn.active");
          if (activeBtn) activeBtn.classList.remove("active");
          btn.classList.add("active");

          onChange({ treeAndChecksOnly: true });
        };
      });

      if (p.connect) {
        var matchedBtn = Array.from(suggestionBtns).find(function(b) {
          return b.dataset.suggestion === p.connect;
        });
        if (matchedBtn) matchedBtn.classList.add("active");
      }
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
