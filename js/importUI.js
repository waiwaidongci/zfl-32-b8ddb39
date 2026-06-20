const ImportUI = {
  modal: null,
  overlay: null,
  currentData: null,
  currentValidation: null,
  onConfirmCallback: null,

  open(fileInput, supportedParts, onConfirm) {
    this.onConfirmCallback = onConfirm;
    const file = fileInput.files[0];
    if (!file) return;

    this._ensureModal();
    this._showLoading(file.name);

    ImportParser.parseFile(file)
      .then(parsed => {
        this.currentData = parsed;
        this.currentValidation = ImportValidator.validate(parsed.parts, supportedParts);
        this._renderPreview(parsed, this.currentValidation);
      })
      .catch(err => {
        this._showError(err.message);
      })
      .finally(() => {
        fileInput.value = "";
      });
  },

  _ensureModal() {
    if (this.modal && document.body.contains(this.modal)) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "import-overlay";
    this.overlay.innerHTML = "";

    this.modal = document.createElement("div");
    this.modal.className = "import-modal";
    this.modal.innerHTML = "";

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener("click", e => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener("keydown", this._escHandler = e => {
      if (e.key === "Escape") this.close();
    });
  },

  _showLoading(fileName) {
    this.overlay.style.display = "flex";
    this.modal.innerHTML =
      '<div class="import-header">' +
        '<h2>导入方案</h2>' +
        '<button class="import-close" data-action="close">&times;</button>' +
      '</div>' +
      '<div class="import-body">' +
        '<div class="import-loading">正在解析文件 <b>' + this._escapeHtml(fileName) + '</b> ...</div>' +
      '</div>';
    this.modal.querySelector('[data-action="close"]').onclick = () => this.close();
  },

  _showError(message) {
    this.modal.innerHTML =
      '<div class="import-header">' +
        '<h2>导入方案</h2>' +
        '<button class="import-close" data-action="close">&times;</button>' +
      '</div>' +
      '<div class="import-body">' +
        '<div class="import-result import-error">' +
          '<div class="import-result-icon">✕</div>' +
          '<div class="import-result-title">文件解析失败</div>' +
          '<div class="import-result-desc">' + this._escapeHtml(message) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="import-footer">' +
        '<button class="import-btn-secondary" data-action="close">关闭</button>' +
      '</div>';
    this.modal.querySelectorAll('[data-action="close"]').forEach(b => b.onclick = () => this.close());
  },

  _renderPreview(parsed, validation) {
    const fileInfoHtml = this._renderFileInfo(parsed);
    const summaryHtml = this._renderSummary(validation, parsed);
    const typeDistHtml = this._renderTypeDistribution(validation);
    const issuesHtml = this._renderIssues(validation);
    const previewTableHtml = this._renderPreviewTable(parsed, validation);

    const canImport = validation.canImport;
    const severityClass = "severity-" + validation.severity;

    this.modal.innerHTML =
      '<div class="import-header">' +
        '<h2>导入方案预览</h2>' +
        '<button class="import-close" data-action="close">&times;</button>' +
      '</div>' +
      '<div class="import-body">' +
        '<div class="import-section">' + fileInfoHtml + '</div>' +
        '<div class="import-section ' + severityClass + '">' + summaryHtml + '</div>' +
        '<div class="import-section">' + typeDistHtml + '</div>' +
        (issuesHtml ? '<div class="import-section">' + issuesHtml + '</div>' : "") +
        '<div class="import-section">' + previewTableHtml + '</div>' +
      '</div>' +
      '<div class="import-footer">' +
        '<button class="import-btn-secondary" data-action="close">取消</button>' +
        '<button class="import-btn-primary ' + (canImport ? "" : "import-btn-disabled") + '" ' +
          (canImport ? 'data-action="confirm"' : "disabled title=\"存在未知构件类型，无法导入\"") + '>' +
          (canImport ? "确认导入并替换画布" : "存在错误，无法导入") +
        '</button>' +
      '</div>';

    this.modal.querySelector('[data-action="close"]').onclick = () => this.close();
    const confirmBtn = this.modal.querySelector('[data-action="confirm"]');
    if (confirmBtn) {
      confirmBtn.onclick = () => this._confirmImport();
    }
  },

  _renderFileInfo(parsed) {
    const sizeKb = (parsed.fileSize / 1024).toFixed(2);
    return (
      '<div class="import-fileinfo">' +
        '<div class="import-fileinfo-icon">📄</div>' +
        '<div class="import-fileinfo-text">' +
          '<div class="import-filename">' + this._escapeHtml(parsed.fileName) + '</div>' +
          '<div class="import-filesize">' + sizeKb + ' KB · 共 ' + parsed.originalCount + ' 条原始数据记录</div>' +
        '</div>' +
      '</div>'
    );
  },

  _renderSummary(validation, parsed) {
    let statusIcon, statusTitle, statusDesc;
    if (validation.severity === "ok") {
      statusIcon = "✓";
      statusTitle = "数据校验通过";
      statusDesc = "所有构件类型合法，可安全导入。";
    } else if (validation.severity === "warning") {
      statusIcon = "⚠";
      statusTitle = "存在可忽略的问题";
      statusDesc = "构件类型均合法，但部分构件存在字段缺失或层级异常，仍可导入。";
    } else {
      statusIcon = "✕";
      statusTitle = "存在致命错误";
      statusDesc = "检测到未知构件类型，必须修正后方可导入。";
    }

    const items = [
      { label: "构件总数", value: validation.totalCount, icon: "📦" },
      { label: "构件种类", value: validation.typeDistribution.filter(t => t.count > 0 && !t.isUnknown).length + "/" + validation.validTypes.length, icon: "🏷️" },
      { label: "ID 自动补齐", value: parsed.idAddedCount, icon: "🔑" },
      { label: "缺失字段", value: validation.missingFieldCount, warn: validation.missingFieldCount > 0, icon: "📋" },
      { label: "层级异常", value: validation.invalidLayerCount, warn: validation.invalidLayerCount > 0, icon: "📐" },
      { label: "未知类型", value: validation.unknownCount, bad: validation.unknownCount > 0, icon: "❓" }
    ];

    return (
      '<div class="import-summary">' +
        '<div class="import-result import-result-' + validation.severity + '">' +
          '<div class="import-result-icon">' + statusIcon + '</div>' +
          '<div>' +
            '<div class="import-result-title">' + statusTitle + '</div>' +
            '<div class="import-result-desc">' + statusDesc + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="import-stats">' +
          items.map(it =>
            '<div class="import-stat-item' + (it.warn ? ' import-stat-warn' : '') + (it.bad ? ' import-stat-bad' : '') + '">' +
              '<div class="import-stat-icon">' + it.icon + '</div>' +
              '<div class="import-stat-label">' + it.label + '</div>' +
              '<div class="import-stat-value">' + it.value + '</div>' +
            '</div>'
          ).join("") +
        '</div>' +
      '</div>'
    );
  },

  _renderTypeDistribution(validation) {
    const items = validation.typeDistribution;
    const maxCount = Math.max(1, ...items.map(t => t.count));
    return (
      '<div class="import-section-title">构件类型分布</div>' +
      '<div class="import-type-dist">' +
        items.map(t => {
          const widthPct = (t.count / maxCount) * 100;
          const classes = "import-type-bar" + (t.isUnknown ? " import-type-unknown" : "");
          const labelClass = t.isUnknown ? "import-type-label-unknown" : "";
          return (
            '<div class="import-type-row">' +
              '<div class="import-type-label ' + labelClass + '">' +
                (t.isUnknown ? "🚫 " : "") + this._escapeHtml(t.type) +
              '</div>' +
              '<div class="import-type-bar-wrap">' +
                '<div class="' + classes + '" style="width:' + widthPct + '%"></div>' +
              '</div>' +
              '<div class="import-type-count">' + t.count + '</div>' +
            '</div>'
          );
        }).join("") +
      '</div>'
    );
  },

  _renderIssues(validation) {
    const sections = [];

    if (validation.unknownTypes.length > 0) {
      sections.push(
        '<div class="import-issue-block import-issue-block-error">' +
          '<div class="import-issue-title">❌ 未知构件类型（' + validation.unknownCount + ' 处）</div>' +
          '<div class="import-issue-desc">以下类型不在系统支持列表中，需修正后才能导入：</div>' +
          '<div class="import-issue-list">' +
            validation.unknownTypes.map(t =>
              '<span class="import-tag import-tag-bad">' + this._escapeHtml(t) + '</span>'
            ).join("") +
          '</div>' +
          '<div class="import-issue-hint">系统支持类型：' +
            validation.validTypes.map(t => '<span class="import-tag import-tag-ok">' + t + '</span>').join(" ") +
          '</div>' +
        '</div>'
      );
    }

    if (validation.missingFieldIssues.length > 0) {
      const list = validation.missingFieldIssues.slice(0, 10);
      const more = validation.missingFieldIssues.length - list.length;
      sections.push(
        '<div class="import-issue-block import-issue-block-warn">' +
          '<div class="import-issue-title">⚠️ 缺失必填字段（' + validation.missingFieldCount + ' 处）</div>' +
          '<div class="import-issue-desc">以下构件缺少关键字段，导入后将使用默认值：</div>' +
          '<div class="import-issue-table">' +
            '<div class="import-issue-table-head">' +
              '<span>序号</span><span>类型</span><span>缺失字段</span>' +
            '</div>' +
            list.map(i =>
              '<div class="import-issue-table-row">' +
                '<span>#' + (i.index + 1) + '</span>' +
                '<span>' + this._escapeHtml(i.type) + '</span>' +
                '<span>' + i.fields.map(f => '<span class="import-chip import-chip-warn">' + f + '</span>').join(" ") + '</span>' +
              '</div>'
            ).join("") +
          '</div>' +
          (more > 0 ? '<div class="import-issue-more">... 另有 ' + more + ' 条类似问题</div>' : "") +
        '</div>'
      );
    }

    if (validation.invalidLayerIssues.length > 0) {
      const list = validation.invalidLayerIssues.slice(0, 10);
      const more = validation.invalidLayerIssues.length - list.length;
      sections.push(
        '<div class="import-issue-block import-issue-block-warn">' +
          '<div class="import-issue-title">⚠️ 非法层级值（' + validation.invalidLayerCount + ' 处）</div>' +
          '<div class="import-issue-desc">层级必须为 1-' + ImportValidator.MAX_LAYER + ' 的整数，以下值异常：</div>' +
          '<div class="import-issue-table">' +
            '<div class="import-issue-table-head">' +
              '<span>序号</span><span>类型</span><span>当前值</span>' +
            '</div>' +
            list.map(i =>
              '<div class="import-issue-table-row">' +
                '<span>#' + (i.index + 1) + '</span>' +
                '<span>' + this._escapeHtml(i.type) + '</span>' +
                '<span><span class="import-chip import-chip-warn">' + this._escapeHtml(String(i.layerValue)) + '</span></span>' +
              '</div>'
            ).join("") +
          '</div>' +
          (more > 0 ? '<div class="import-issue-more">... 另有 ' + more + ' 条类似问题</div>' : "") +
        '</div>'
      );
    }

    if (validation.invalidDirIssues.length > 0) {
      const list = validation.invalidDirIssues.slice(0, 5);
      const more = validation.invalidDirIssues.length - list.length;
      sections.push(
        '<div class="import-issue-block import-issue-block-warn">' +
          '<div class="import-issue-title">⚠️ 非法方向值（' + validation.invalidDirIssues.length + ' 处）</div>' +
          '<div class="import-issue-desc">方向应为"正"、"左挑"或"右挑"：</div>' +
          '<div class="import-issue-table">' +
            '<div class="import-issue-table-head">' +
              '<span>序号</span><span>类型</span><span>当前值</span>' +
            '</div>' +
            list.map(i =>
              '<div class="import-issue-table-row">' +
                '<span>#' + (i.index + 1) + '</span>' +
                '<span>' + this._escapeHtml(i.type) + '</span>' +
                '<span><span class="import-chip import-chip-warn">' + this._escapeHtml(String(i.dirValue)) + '</span></span>' +
              '</div>'
            ).join("") +
          '</div>' +
          (more > 0 ? '<div class="import-issue-more">... 另有 ' + more + ' 条类似问题</div>' : "") +
        '</div>'
      );
    }

    if (sections.length === 0) return "";
    return '<div class="import-section-title">问题清单</div><div class="import-issues">' + sections.join("") + '</div>';
  },

  _renderPreviewTable(parsed, validation) {
    const parts = parsed.parts;
    const displayParts = parts.slice(0, 50);
    const more = parts.length - displayParts.length;

    const rows = displayParts.map((p, i) => {
      const flags = validation.partFlags[i];
      const rowClass = flags.hasUnknownType ? "import-row-bad" :
                      (flags.hasMissingFields || flags.hasInvalidLayer || flags.hasInvalidDir) ? "import-row-warn" : "";
      const typeClass = flags.hasUnknownType ? "import-type-unknown-text" : "";
      return (
        '<tr class="' + rowClass + '">' +
          '<td>' + (p._originalIndex !== undefined ? p._originalIndex + 1 : i + 1) + '</td>' +
          '<td class="' + typeClass + '">' +
            (flags.hasUnknownType ? "🚫 " : "") + this._escapeHtml(p.type || "(空)") +
          '</td>' +
          '<td>' + (p.layer !== undefined && p.layer !== null ? p.layer : '<span class="import-cell-empty">—</span>') + '</td>' +
          '<td>' + (p.x !== undefined ? p.x : '<span class="import-cell-empty">—</span>') +
              ', ' + (p.y !== undefined ? p.y : '<span class="import-cell-empty">—</span>') + '</td>' +
          '<td>' + (p.dir ? this._escapeHtml(p.dir) : '<span class="import-cell-empty">—</span>') + '</td>' +
          '<td>' + (p.connect ? this._escapeHtml(p.connect) : '<span class="import-cell-empty">—</span>') + '</td>' +
          '<td>' +
            (flags.hasUnknownType ? '<span class="import-chip import-chip-bad">未知类型</span> ' : "") +
            (flags.hasMissingFields ? '<span class="import-chip import-chip-warn">缺字段</span> ' : "") +
            (flags.hasInvalidLayer ? '<span class="import-chip import-chip-warn">层级</span> ' : "") +
            (flags.hasInvalidDir ? '<span class="import-chip import-chip-warn">方向</span> ' : "") +
            (!flags.hasUnknownType && !flags.hasMissingFields && !flags.hasInvalidLayer && !flags.hasInvalidDir
              ? '<span class="import-chip import-chip-ok">✓</span>' : "") +
          '</td>' +
        '</tr>'
      );
    }).join("");

    return (
      '<div class="import-section-title">构件明细预览' +
        (parts.length > 50 ? '（显示前 50 条，共 ' + parts.length + ' 条）' : '') +
      '</div>' +
      '<div class="import-table-wrap">' +
        '<table class="import-table">' +
          '<thead>' +
            '<tr>' +
              '<th>#</th>' +
              '<th>类型</th>' +
              '<th>层</th>' +
              '<th>坐标 (x,y)</th>' +
              '<th>方向</th>' +
              '<th>连接点</th>' +
              '<th>状态</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
      (more > 0 ? '<div class="import-issue-more">... 另有 ' + more + ' 条未显示</div>' : "")
    );
  },

  _confirmImport() {
    if (!this.currentValidation || !this.currentValidation.canImport) return;
    const cleanParts = this.currentData.parts.map(p => {
      const { _originalIndex, ...rest } = p;
      return rest;
    });
    if (this.onConfirmCallback) {
      this.onConfirmCallback(cleanParts);
    }
    this.close();
  },

  close() {
    if (this.overlay) {
      this.overlay.style.display = "none";
    }
    this.currentData = null;
    this.currentValidation = null;
  },

  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
};

if (typeof module !== "undefined") module.exports = { ImportUI };
