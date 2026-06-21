var SchemeDiffUI = {
  container: null,
  panelContainer: null,
  options: null,
  _diffResult: null,
  _comparedSchemeName: "",
  _comparedSchemeId: null,
  _isActive: false,
  _savedStateSnapshot: null,

  init(panelSelector, options) {
    this.panelContainer = document.querySelector(panelSelector);
    this.options = options || {};
    this._isActive = false;
    this._savedStateSnapshot = null;
  },

  isActive() {
    return this._isActive;
  },

  getDiffResult() {
    return this._diffResult;
  },

  getComparedSchemeId() {
    return this._comparedSchemeId;
  },

  saveStateSnapshot(snapshot) {
    this._savedStateSnapshot = snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
  },

  getStateSnapshot() {
    return this._savedStateSnapshot ? JSON.parse(JSON.stringify(this._savedStateSnapshot)) : null;
  },

  enterDiffMode(currentScheme, savedSchemeId, currentMeasurement) {
    var savedData = SchemeStorage.get(savedSchemeId);
    if (!savedData) {
      alert("无法加载所选方案数据进行对比。");
      return;
    }

    this._comparedSchemeId = savedSchemeId;
    this._comparedSchemeName = savedData.name;

    var normalizedSavedScheme = savedData.scheme.map(function(p) {
      var item = Object.assign({}, p);
      if (!item.id) item.id = "legacy_" + Math.random().toString(36).slice(2, 12);
      if (item.layer === undefined || item.layer === null) item.layer = 1;
      if (item.x === undefined || item.x === null) item.x = 0;
      if (item.y === undefined || item.y === null) item.y = 0;
      if (!item.dir) item.dir = "正";
      if (item.connect === undefined || item.connect === null) item.connect = "";
      return item;
    });

    var savedMeasurement = savedData.measurement || null;

    this._diffResult = SchemeDiff.compare(
      currentScheme,
      normalizedSavedScheme,
      currentMeasurement,
      savedMeasurement
    );
    this._isActive = true;

    this._renderPanel();
    this._renderDiffSummary();

    if (this.options && typeof this.options.onDiffModeChanged === "function") {
      this.options.onDiffModeChanged(true, this._diffResult);
    }
  },

  exitDiffMode() {
    var snapshot = this._savedStateSnapshot;
    this._diffResult = null;
    this._comparedSchemeName = "";
    this._comparedSchemeId = null;
    this._isActive = false;
    this._savedStateSnapshot = null;

    this._clearPanel();

    if (this.options && typeof this.options.onDiffModeChanged === "function") {
      this.options.onDiffModeChanged(false, null, snapshot);
    }
  },

  _renderPanel() {
    if (!this.panelContainer) return;

    var html =
      '<div class="diff-mode-banner">' +
        '<div class="diff-banner-info">' +
          '<span class="diff-banner-icon">⟷</span>' +
          '<span class="diff-banner-text">差异对比模式</span>' +
          '<span class="diff-banner-vs">当前方案 vs ' + this._escapeHtml(this._comparedSchemeName) + '</span>' +
        '</div>' +
        '<button class="diff-exit-btn" id="diffExitBtn" title="按 ESC 快速退出">退出对比</button>' +
      '</div>' +
      '<div class="diff-readonly-hint">只读模式 · 所有编辑操作已禁用</div>' +
      '<div class="diff-summary-stats" id="diffSummaryStats"></div>' +
      '<div class="diff-legend" id="diffLegend"></div>' +
      '<div class="diff-summary-list" id="diffSummaryList"></div>';

    this.panelContainer.innerHTML = html;

    var exitBtn = this.panelContainer.querySelector("#diffExitBtn");
    if (exitBtn) {
      exitBtn.onclick = function() {
        this.exitDiffMode();
      }.bind(this);
    }
  },

  _renderDiffLegend() {
    var legendEl = this.panelContainer.querySelector("#diffLegend");
    if (!legendEl) return;

    legendEl.innerHTML =
      '<div class="diff-legend-title">图例：</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch added"></span>新增构件</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch deleted"></span>已删除构件</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch moved"></span>位置移动</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch layer"></span>层级变化</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch dir"></span>方向变化</div>' +
      '<div class="diff-legend-item"><span class="diff-legend-swatch connect"></span>连接点变化</div>';
  },

  _renderDiffSummary() {
    if (!this._diffResult || !this.panelContainer) return;

    this._renderDiffLegend();

    var s = this._diffResult.summary;

    var statsHtml =
      '<div class="diff-stat-item added" data-filter="added">' +
        '<div class="diff-stat-count">' + s.addedCount + '</div>' +
        '<div class="diff-stat-label">新增</div>' +
      '</div>' +
      '<div class="diff-stat-item deleted" data-filter="deleted">' +
        '<div class="diff-stat-count">' + s.deletedCount + '</div>' +
        '<div class="diff-stat-label">删除</div>' +
      '</div>' +
      '<div class="diff-stat-item moved" data-filter="moved">' +
        '<div class="diff-stat-count">' + s.movedCount + '</div>' +
        '<div class="diff-stat-label">移动</div>' +
      '</div>' +
      '<div class="diff-stat-item layer" data-filter="layer">' +
        '<div class="diff-stat-count">' + s.layerChangedCount + '</div>' +
        '<div class="diff-stat-label">层级</div>' +
      '</div>' +
      '<div class="diff-stat-item dir" data-filter="dir">' +
        '<div class="diff-stat-count">' + s.dirChangedCount + '</div>' +
        '<div class="diff-stat-label">方向</div>' +
      '</div>' +
      '<div class="diff-stat-item connect" data-filter="connect">' +
        '<div class="diff-stat-count">' + s.connectChangedCount + '</div>' +
        '<div class="diff-stat-label">连接</div>' +
      '</div>';

    if (s.measurementAddedCount > 0 || s.measurementDeletedCount > 0 || s.measurementChangedCount > 0) {
      statsHtml +=
        '<div class="diff-stat-item measurement" data-filter="meas">' +
          '<div class="diff-stat-count">' + (s.measurementAddedCount + s.measurementDeletedCount + s.measurementChangedCount) + '</div>' +
          '<div class="diff-stat-label">标注</div>' +
        '</div>';
    }

    var statsEl = this.panelContainer.querySelector("#diffSummaryStats");
    if (statsEl) statsEl.innerHTML = statsHtml;

    var listHtml = "";

    if (this._diffResult.added.length > 0) {
      listHtml += this._renderGroup("added", "新增构件", this._diffResult.added);
    }
    if (this._diffResult.deleted.length > 0) {
      listHtml += this._renderGroup("deleted", "已删除构件", this._diffResult.deleted);
    }
    if (this._diffResult.moved.length > 0) {
      listHtml += this._renderGroup("moved", "位置移动", this._diffResult.moved);
    }
    if (this._diffResult.layerChanged.length > 0) {
      listHtml += this._renderGroup("layer", "层级变化", this._diffResult.layerChanged);
    }
    if (this._diffResult.dirChanged.length > 0) {
      listHtml += this._renderGroup("dir", "方向变化", this._diffResult.dirChanged);
    }
    if (this._diffResult.connectChanged.length > 0) {
      listHtml += this._renderGroup("connect", "连接点变化", this._diffResult.connectChanged);
    }

    var mDiff = this._diffResult.measurementDiff;
    if (mDiff) {
      if (mDiff.added.length > 0) {
        listHtml += this._renderMeasurementGroup("measAdded", "标注 - 新增", mDiff.added);
      }
      if (mDiff.deleted.length > 0) {
        listHtml += this._renderMeasurementGroup("measDeleted", "标注 - 已删除", mDiff.deleted);
      }
      if (mDiff.changed.length > 0) {
        listHtml += this._renderMeasurementGroup("measChanged", "标注 - 已修改", mDiff.changed);
      }
      if (mDiff.scaleChanged) {
        listHtml += this._renderScaleDiff(mDiff.scaleFrom, mDiff.scaleTo);
      }
    }

    if (!this._diffResult.hasDifferences) {
      listHtml = '<div class="diff-no-diff">两个方案完全一致，没有差异。</div>';
    }

    var listEl = this.panelContainer.querySelector("#diffSummaryList");
    if (listEl) listEl.innerHTML = listHtml;

    this._bindListEvents();
  },

  _renderGroup(type, label, items) {
    var html =
      '<div class="diff-group" data-group-type="' + type + '">' +
        '<div class="diff-group-header ' + type + '">' +
          '<span class="diff-group-badge ' + type + '">' + items.length + '</span>' +
          '<span class="diff-group-label">' + label + '</span>' +
        '</div>' +
        '<div class="diff-group-items">';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += this._renderItem(item, i);
    }

    html += '</div></div>';
    return html;
  },

  _renderMeasurementGroup(type, label, items) {
    var html =
      '<div class="diff-group" data-group-type="' + type + '">' +
        '<div class="diff-group-header measurement">' +
          '<span class="diff-group-badge measurement">' + items.length + '</span>' +
          '<span class="diff-group-label">' + label + '</span>' +
        '</div>' +
        '<div class="diff-group-items">';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += this._renderMeasurementItem(item, i);
    }

    html += '</div></div>';
    return html;
  },

  _renderScaleDiff(from, to) {
    var fromStr = from ? (from.value + (from.unit || "")) : "(未设置)";
    var toStr = to ? (to.value + (to.unit || "")) : "(未设置)";
    return (
      '<div class="diff-group" data-group-type="measScale">' +
        '<div class="diff-group-header measurement">' +
          '<span class="diff-group-badge measurement">1</span>' +
          '<span class="diff-group-label">标注比例尺变化</span>' +
        '</div>' +
        '<div class="diff-group-items">' +
          '<div class="diff-item measurement" data-diff-type="measScale">' +
            '<div class="diff-item-type">比例尺</div>' +
            '<div class="diff-item-detail">' + this._escapeHtml(fromStr) + ' → ' + this._escapeHtml(toStr) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _renderItem(item, index) {
    var detail = "";
    switch (item.diffType) {
      case "added":
        detail = "当前方案中新增 · 位置(" + item.part.x + "," + item.part.y + ") 第" + item.part.layer + "层";
        break;
      case "deleted":
        detail = "已从方案中删除 · 原位置(" + item.part.x + "," + item.part.y + ") 第" + item.part.layer + "层";
        break;
      case "moved":
        detail = "(" + item.from.x + "," + item.from.y + ") → (" + item.to.x + "," + item.to.y + ")";
        break;
      case "layer":
        detail = "第" + item.from + "层 → 第" + item.to + "层";
        break;
      case "dir":
        detail = this._escapeHtml(item.from) + " → " + this._escapeHtml(item.to);
        break;
      case "connect":
        detail = this._escapeHtml(item.from) + " → " + this._escapeHtml(item.to);
        break;
    }

    return '<div class="diff-item ' + item.diffType + '" data-part-id="' + item.partId + '" data-diff-type="' + item.diffType + '">' +
      '<div class="diff-item-type">' + this._escapeHtml(item.type) + '</div>' +
      '<div class="diff-item-detail">' + detail + '</div>' +
    '</div>';
  },

  _renderMeasurementItem(item, index) {
    var label = SchemeDiff.formatMeasurementLabel(item.annotation);
    var detail = "";
    switch (item.diffType) {
      case "measAdded":
        detail = "当前方案中新增的测量标注";
        break;
      case "measDeleted":
        detail = "已删除的测量标注";
        break;
      case "measChanged":
        detail = "测量标注内容已修改";
        break;
    }

    return '<div class="diff-item measurement ' + item.diffType + '" data-annotation-id="' + item.annotationId + '" data-diff-type="' + item.diffType + '">' +
      '<div class="diff-item-type">' + this._escapeHtml(label) + '</div>' +
      '<div class="diff-item-detail">' + detail + '</div>' +
    '</div>';
  },

  _bindListEvents() {
    if (!this.panelContainer) return;

    var items = this.panelContainer.querySelectorAll(".diff-item");
    for (var i = 0; i < items.length; i++) {
      items[i].onclick = function(el) {
        var partId = el.dataset.partId;
        var annotationId = el.dataset.annotationId;
        var diffType = el.dataset.diffType;
        if (partId) {
          this._handleItemClick(partId, diffType);
        } else if (annotationId) {
          this._handleMeasurementItemClick(annotationId, diffType);
        }
      }.bind(this, items[i]);
    }
  },

  _handleItemClick(partId, diffType) {
    if (this.options && typeof this.options.onDiffItemSelect === "function") {
      this.options.onDiffItemSelect(partId, diffType);
    }
  },

  _handleMeasurementItemClick(annotationId, diffType) {
    if (this.options && typeof this.options.onDiffMeasurementSelect === "function") {
      this.options.onDiffMeasurementSelect(annotationId, diffType);
    }
  },

  _clearPanel() {
    if (this.panelContainer) {
      this.panelContainer.innerHTML = "";
    }
  },

  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
};

if (typeof module !== "undefined") module.exports = { SchemeDiffUI };
