const BatchPanel = {
  container: null,
  _callbacks: null,

  init(containerSelector, callbacks) {
    this.container = document.querySelector(containerSelector);
    this._callbacks = callbacks;
  },

  render(selectedCount) {
    if (!this.container) return;

    var disabled = selectedCount === 0 ? " disabled" : "";
    var count = selectedCount > 0 ? selectedCount : 0;

    this.container.innerHTML =
      '<div class="batch-section">' +
        '<div class="batch-info">已选中 <b>' + count + '</b> 个构件</div>' +
        '<div class="batch-hint">' + (count === 0 ? '按住 Shift 点击画布构件可多选' : '按住 Shift 继续选择更多构件') + '</div>' +
        '<div class="batch-row">' +
          '<button id="mirrorBtn" class="batch-btn"' + disabled + '>镜像复制</button>' +
          '<label class="batch-inline-label">中轴线 X</label>' +
          '<input id="mirrorAxisInput" type="number" class="batch-inline-input" value="600" min="0" max="1200">' +
        '</div>' +
        '<div class="batch-divider"></div>' +
        '<div class="batch-row">' +
          '<label class="batch-label">复制数量</label>' +
          '<input id="batchCountInput" type="number" min="1" max="20" value="2" class="batch-input">' +
        '</div>' +
        '<div class="batch-row">' +
          '<label class="batch-label">横向间距(px)</label>' +
          '<input id="batchSpacingInput" type="number" min="10" max="600" value="150" class="batch-input">' +
        '</div>' +
        '<div class="batch-row">' +
          '<button id="batchCopyBtn" class="batch-btn"' + disabled + '>批量排布</button>' +
        '</div>' +
      '</div>';

    this._bindEvents();
  },

  _bindEvents() {
    var mirrorBtn = document.querySelector("#mirrorBtn");
    var batchCopyBtn = document.querySelector("#batchCopyBtn");

    if (mirrorBtn) {
      mirrorBtn.onclick = function() {
        var axisInput = document.querySelector("#mirrorAxisInput");
        var axisX = axisInput ? Number(axisInput.value) : 600;
        if (this._callbacks && this._callbacks.onMirror) {
          this._callbacks.onMirror(axisX);
        }
      }.bind(this);
    }

    if (batchCopyBtn) {
      batchCopyBtn.onclick = function() {
        var countInput = document.querySelector("#batchCountInput");
        var spacingInput = document.querySelector("#batchSpacingInput");
        var count = countInput ? Math.max(1, Number(countInput.value)) : 2;
        var spacing = spacingInput ? Math.max(10, Number(spacingInput.value)) : 150;
        if (this._callbacks && this._callbacks.onBatchCopy) {
          this._callbacks.onBatchCopy(count, spacing);
        }
      }.bind(this);
    }
  }
};

if (typeof module !== "undefined") module.exports = { BatchPanel };
