var SchemeVersionUI = {
  container: null,
  listContainer: null,
  headerEl: null,
  options: null,
  _stateUnsubscribe: null,
  _searchQuery: "",
  _sortBy: "updatedAt",
  _sortOrder: "desc",

  init(containerSelector, options) {
    this.container = document.querySelector(containerSelector);
    this.options = options || {};
    this.listContainer = null;
    this.headerEl = null;

    if (!this.container) {
      console.error("SchemeVersionUI: container not found:", containerSelector);
      return;
    }

    this._renderContainer();
    this._stateUnsubscribe = SchemeState.subscribe(function() {
      this.render();
    }.bind(this));

    this.render();
  },

  _renderContainer() {
    this.container.innerHTML =
      '<div class="scheme-version-header">' +
        '<div class="scheme-current-info">' +
          '<span class="scheme-current-label">当前方案：</span>' +
          '<span class="scheme-current-name" id="schemeCurrentName">未命名</span>' +
          '<span class="scheme-unsaved-badge" id="schemeUnsavedBadge" style="display:none">● 未保存</span>' +
        '</div>' +
        '<div class="scheme-header-actions">' +
          '<button class="secondary" id="saveAsBtn">另存为</button>' +
          '<button class="secondary" id="newSchemeBtn">新建</button>' +
        '</div>' +
      '</div>' +
      '<div class="scheme-version-list-header">' +
        '<h3>方案版本管理</h3>' +
      '</div>' +
      '<div class="scheme-version-toolbar">' +
        '<div class="scheme-search-box">' +
          '<input type="text" id="schemeSearchInput" placeholder="按名称搜索方案..." />' +
          '<button class="scheme-search-clear" id="schemeSearchClear" style="display:none">×</button>' +
        '</div>' +
        '<div class="scheme-sort-box">' +
          '<label>排序：</label>' +
          '<select id="schemeSortSelect">' +
            '<option value="updatedAt_desc">更新时间 ↓</option>' +
            '<option value="updatedAt_asc">更新时间 ↑</option>' +
            '<option value="partCount_desc">构件数量 ↓</option>' +
            '<option value="partCount_asc">构件数量 ↑</option>' +
            '<option value="name_asc">名称 A-Z</option>' +
            '<option value="name_desc">名称 Z-A</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="scheme-version-list" id="schemeVersionList"></div>';

    this.listContainer = this.container.querySelector("#schemeVersionList");
    this.headerEl = this.container.querySelector(".scheme-version-header");

    var saveAsBtn = this.container.querySelector("#saveAsBtn");
    var newSchemeBtn = this.container.querySelector("#newSchemeBtn");
    var searchInput = this.container.querySelector("#schemeSearchInput");
    var searchClear = this.container.querySelector("#schemeSearchClear");
    var sortSelect = this.container.querySelector("#schemeSortSelect");

    saveAsBtn.onclick = function() { this._handleSaveAs(); }.bind(this);
    newSchemeBtn.onclick = function() { this._handleNewScheme(); }.bind(this);

    searchInput.addEventListener("input", function(e) {
      this._searchQuery = e.target.value.trim();
      searchClear.style.display = this._searchQuery ? "flex" : "none";
      this.render();
    }.bind(this));

    searchClear.onclick = function() {
      this._searchQuery = "";
      searchInput.value = "";
      searchClear.style.display = "none";
      searchInput.focus();
      this.render();
    }.bind(this);

    sortSelect.value = this._sortBy + "_" + this._sortOrder;
    sortSelect.addEventListener("change", function(e) {
      var parts = e.target.value.split("_");
      this._sortBy = parts[0];
      this._sortOrder = parts[1];
      this.render();
    }.bind(this));
  },

  render() {
    if (!this.listContainer) return;

    var allSchemes = SchemeStorage.list();
    var currentId = SchemeState.currentSchemeId;
    var state = SchemeState.getState();

    var nameEl = this.container.querySelector("#schemeCurrentName");
    var badgeEl = this.container.querySelector("#schemeUnsavedBadge");

    if (nameEl) {
      nameEl.textContent = state.currentSchemeName || "未命名";
    }
    if (badgeEl) {
      badgeEl.style.display = state.hasUnsavedChanges ? "inline-block" : "none";
    }

    if (allSchemes.length === 0) {
      this.listContainer.innerHTML =
        '<div class="scheme-empty">暂无保存的方案，点击"保存方案"创建第一个方案。</div>';
      return;
    }

    var filteredSchemes = this._filterSchemes(allSchemes);
    var sortedSchemes = this._sortSchemes(filteredSchemes);

    if (sortedSchemes.length === 0) {
      this.listContainer.innerHTML =
        '<div class="scheme-empty scheme-search-empty">' +
          '<div class="scheme-empty-icon">🔍</div>' +
          '<div class="scheme-empty-title">没有找到匹配的方案</div>' +
          '<div class="scheme-empty-desc">尝试使用其他关键词搜索</div>' +
        '</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < sortedSchemes.length; i++) {
      var s = sortedSchemes[i];
      var isCurrent = s.id === currentId;
      html +=
        '<div class="scheme-item' + (isCurrent ? ' current' : '') + '" data-id="' + s.id + '">' +
          '<div class="scheme-item-main">' +
            '<div class="scheme-item-name">' +
              (isCurrent ? '<span class="current-indicator">▶</span> ' : '') +
              this._escapeHtml(s.name) +
            '</div>' +
            '<div class="scheme-item-meta">' +
              '<span class="scheme-meta-time">更新：' + SchemeStorage.formatTime(s.updatedAt) + '</span>' +
              '<span class="scheme-meta-count">' + s.partCount + ' 个构件</span>' +
            '</div>' +
          '</div>' +
          '<div class="scheme-item-actions">' +
            (isCurrent ?
              '<button class="secondary tiny" data-action="rename" title="重命名">重命名</button>' :
              '<button class="secondary tiny" data-action="load" title="加载此方案">加载</button>'
            ) +
            '<button class="secondary tiny" data-action="copy" title="复制此方案">复制</button>' +
            '<button class="secondary tiny danger" data-action="delete" title="删除此方案">删除</button>' +
          '</div>' +
        '</div>';
    }

    this.listContainer.innerHTML = html;
    this._bindListEvents();
  },

  _filterSchemes(schemes) {
    if (!this._searchQuery) return schemes;
    var query = this._searchQuery.toLowerCase();
    var result = [];
    for (var i = 0; i < schemes.length; i++) {
      if (schemes[i].name.toLowerCase().indexOf(query) >= 0) {
        result.push(schemes[i]);
      }
    }
    return result;
  },

  _sortSchemes(schemes) {
    var sortBy = this._sortBy;
    var sortOrder = this._sortOrder;
    var arr = schemes.slice();

    arr.sort(function(a, b) {
      var cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name, "zh-Hans-CN");
      } else if (sortBy === "updatedAt") {
        cmp = a.updatedAt - b.updatedAt;
      } else if (sortBy === "partCount") {
        cmp = a.partCount - b.partCount;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return arr;
  },

  _bindListEvents() {
    var items = this.listContainer.querySelectorAll(".scheme-item");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var id = item.dataset.id;
      var buttons = item.querySelectorAll("button[data-action]");
      for (var j = 0; j < buttons.length; j++) {
        var btn = buttons[j];
        btn.onclick = function(schemeId, action, event) {
          event.stopPropagation();
          this._handleAction(schemeId, action);
        }.bind(this, id, btn.dataset.action);
      }
    }
  },

  _handleAction(id, action) {
    switch (action) {
      case "load":
        this._handleLoad(id);
        break;
      case "rename":
        this._handleRename(id);
        break;
      case "copy":
        this._handleCopy(id);
        break;
      case "delete":
        this._handleDelete(id);
        break;
    }
  },

  _checkUnsavedChanges(callback) {
    if (this.options && typeof this.options.hasUnsavedChanges === "function") {
      if (this.options.hasUnsavedChanges()) {
        var ok = confirm("当前方案有未保存的改动，切换方案将丢失这些改动。确定要继续吗？");
        if (!ok) return false;
      }
    }
    return true;
  },

  _handleLoad(id) {
    if (!this._checkUnsavedChanges()) return;

    var data = SchemeState.setCurrentScheme(id);
    if (data && this.options && typeof this.options.onLoadScheme === "function") {
      this.options.onLoadScheme(data);
    }
    this.render();
  },

  _handleRename(id) {
    var current = SchemeStorage.get(id);
    if (!current) return;

    var newName = prompt("请输入新的方案名称：", current.name);
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) {
      alert("方案名称不能为空。");
      return;
    }

    var measurement = current.measurement;
    var result = SchemeStorage.update(id, newName, current.scheme, measurement);
    if (result && id === SchemeState.currentSchemeId) {
      SchemeState.currentSchemeName = newName;
      SchemeState._notify();
    }
    this.render();
  },

  _handleCopy(id) {
    var source = SchemeStorage.get(id);
    if (!source) return;

    var newName = prompt("请输入新方案的名称：", source.name + " 副本");
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) {
      alert("方案名称不能为空。");
      return;
    }

    SchemeStorage.copy(id, newName);
    this.render();
  },

  _handleDelete(id) {
    var scheme = SchemeStorage.get(id);
    if (!scheme) return;

    var ok = confirm('确定要删除方案 "' + scheme.name + '" 吗？此操作不可恢复。');
    if (!ok) return;

    var wasCurrent = id === SchemeState.currentSchemeId;
    SchemeStorage.remove(id);

    if (wasCurrent) {
      SchemeState.clearCurrent();
      if (this.options && typeof this.options.onClearCurrent === "function") {
        this.options.onClearCurrent();
      }
    }

    this.render();
  },

  _handleSaveAs() {
    var currentName = SchemeState.currentSchemeName || "新方案";
    var newName = prompt("请输入新方案的名称：", currentName + " 副本");
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) {
      alert("方案名称不能为空。");
      return;
    }

    if (this.options && typeof this.options.onSaveAs === "function") {
      this.options.onSaveAs(newName);
    }
    this.render();
  },

  _handleNewScheme() {
    if (!this._checkUnsavedChanges()) return;

    var newName = prompt("请输入新方案的名称：", "新方案");
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) {
      alert("方案名称不能为空。");
      return;
    }

    if (this.options && typeof this.options.onNewScheme === "function") {
      this.options.onNewScheme(newName);
    }
    this.render();
  },

  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  destroy() {
    if (this._stateUnsubscribe) {
      this._stateUnsubscribe();
      this._stateUnsubscribe = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
};

if (typeof module !== "undefined") module.exports = { SchemeVersionUI };
