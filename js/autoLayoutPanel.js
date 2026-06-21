const AutoLayoutPanel = (function() {
  var _container = null;
  var _callbacks = null;
  var _lastGeneratedScheme = null;
  var _hasManualEdits = false;
  var _historyStack = [];
  var _historyIndex = -1;
  var _MAX_HISTORY = 30;
  var _protectedMode = true;
  var _lastSchemeSnapshot = null;
  var _PRESET_STORAGE_KEY = "autoLayout_presets";
  var _currentRepairPlan = null;
  var _savedSelectionBeforePreview = null;
  var _savedSchemeBeforePreview = null;

  function _getPresets() {
    try {
      var raw = localStorage.getItem(_PRESET_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function _savePresets(presets) {
    try {
      localStorage.setItem(_PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {}
  }

  function _addPreset(name, config) {
    var presets = _getPresets();
    var existing = presets.filter(function(p) { return p.name === name; });
    if (existing.length > 0) return false;
    presets.push({
      name: name,
      config: {
        targetLayers: config.targetLayers,
        partsPerLayer: config.partsPerLayer,
        symmetric: config.symmetric,
        baseConnect: config.baseConnect
      },
      savedAt: Date.now()
    });
    _savePresets(presets);
    return true;
  }

  function _overwritePreset(name, config) {
    var presets = _getPresets();
    var found = false;
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].name === name) {
        presets[i].config = {
          targetLayers: config.targetLayers,
          partsPerLayer: config.partsPerLayer,
          symmetric: config.symmetric,
          baseConnect: config.baseConnect
        };
        presets[i].savedAt = Date.now();
        found = true;
        break;
      }
    }
    if (!found) return false;
    _savePresets(presets);
    return true;
  }

  function _deletePreset(name) {
    var presets = _getPresets();
    presets = presets.filter(function(p) { return p.name !== name; });
    _savePresets(presets);
  }

  function _loadPreset(name) {
    var presets = _getPresets();
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].name === name) return presets[i].config;
    }
    return null;
  }

  function applyPresetToForm(config) {
    if (!config) return;
    var layersInput = _container.querySelector("#autoLayoutLayers");
    var densityInput = _container.querySelector("#autoLayoutDensity");
    var symmetricInput = _container.querySelector("#autoLayoutSymmetric");
    var connectInput = _container.querySelector("#autoLayoutBaseConnect");
    if (layersInput) layersInput.value = config.targetLayers || 4;
    if (densityInput) densityInput.value = config.partsPerLayer || 3;
    if (symmetricInput) symmetricInput.checked = !!config.symmetric;
    if (connectInput) connectInput.value = config.baseConnect || "柱头";
  }

  function refreshPresetList() {
    var select = _container.querySelector("#autoLayoutPresetSelect");
    if (!select) return;
    var currentVal = select.value;
    var presets = _getPresets();
    select.innerHTML = '<option value="">-- 选择预设 --</option>';
    presets.forEach(function(p) {
      var opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  function onPresetLoad() {
    var select = _container.querySelector("#autoLayoutPresetSelect");
    if (!select || !select.value) {
      showPresetNotice("请先选择一个预设", "warn");
      return;
    }
    var config = _loadPreset(select.value);
    if (!config) {
      showPresetNotice("预设加载失败", "bad");
      return;
    }
    applyPresetToForm(config);
    showPresetNotice("已加载预设「" + select.value + "」，可点击「自动生成方案」使用此配置", "ok");
  }

  function onPresetSave() {
    var nameInput = _container.querySelector("#autoLayoutPresetName");
    if (!nameInput) return;
    var name = (nameInput.value || "").trim();
    if (!name) {
      showPresetNotice("请输入预设名称", "warn");
      return;
    }
    var config = getConfig();
    var added = _addPreset(name, config);
    if (!added) {
      showPresetNotice("同名预设已存在，请使用「覆盖」或更改名称", "warn");
      return;
    }
    refreshPresetList();
    var select = _container.querySelector("#autoLayoutPresetSelect");
    if (select) select.value = name;
    showPresetNotice("预设「" + name + "」已保存", "ok");
  }

  function onPresetOverwrite() {
    var select = _container.querySelector("#autoLayoutPresetSelect");
    if (!select || !select.value) {
      showPresetNotice("请先选择要覆盖的预设", "warn");
      return;
    }
    var config = getConfig();
    var ok = _overwritePreset(select.value, config);
    if (ok) {
      refreshPresetList();
      showPresetNotice("预设「" + select.value + "」已覆盖", "ok");
    } else {
      showPresetNotice("覆盖失败，预设不存在", "bad");
    }
  }

  function onPresetDelete() {
    var select = _container.querySelector("#autoLayoutPresetSelect");
    if (!select || !select.value) {
      showPresetNotice("请先选择要删除的预设", "warn");
      return;
    }
    var name = select.value;
    _deletePreset(name);
    refreshPresetList();
    showPresetNotice("预设「" + name + "」已删除", "ok");
  }

  function showPresetNotice(msg, type) {
    var noticeEl = _container.querySelector(".autoLayout-preset-notice");
    if (!noticeEl) return;
    var cls = type === "ok" ? "autoLayout-preset-notice-ok"
            : type === "warn" ? "autoLayout-preset-notice-warn"
            : "autoLayout-preset-notice-bad";
    noticeEl.className = "autoLayout-preset-notice " + cls;
    noticeEl.textContent = msg;
    noticeEl.style.display = "block";
    clearTimeout(noticeEl._timer);
    noticeEl._timer = setTimeout(function() {
      noticeEl.style.display = "none";
    }, 3000);
  }

  function init(selector, callbacks) {
    _container = document.querySelector(selector);
    if (!_container) return;
    _callbacks = callbacks || {};
    render();
  }

  function getConfig() {
    var layersInput = _container.querySelector("#autoLayoutLayers");
    var densityInput = _container.querySelector("#autoLayoutDensity");
    var symmetricInput = _container.querySelector("#autoLayoutSymmetric");
    var connectInput = _container.querySelector("#autoLayoutBaseConnect");

    return {
      targetLayers: layersInput ? Number(layersInput.value) || 4 : 4,
      partsPerLayer: densityInput ? Number(densityInput.value) || 3 : 3,
      symmetric: symmetricInput ? symmetricInput.checked : false,
      baseConnect: connectInput ? (connectInput.value || "柱头") : "柱头"
    };
  }

  function computeSchemeDiff(schemeA, schemeB) {
    var mapA = {};
    var mapB = {};

    if (schemeA) schemeA.forEach(function(p) { mapA[p.id] = p; });
    if (schemeB) schemeB.forEach(function(p) { mapB[p.id] = p; });

    var added = [];
    var removed = [];
    var modified = [];
    var unchanged = [];

    if (schemeB) {
      schemeB.forEach(function(pb) {
        if (!mapA[pb.id]) {
          added.push(pb);
        } else {
          var pa = mapA[pb.id];
          var changed =
            pa.type !== pb.type ||
            Math.abs(pa.x - pb.x) > 1 ||
            Math.abs(pa.y - pb.y) > 1 ||
            pa.layer !== pb.layer ||
            pa.dir !== pb.dir ||
            pa.connect !== pb.connect;
          if (changed) {
            modified.push({
              before: Object.assign({}, pa),
              after: Object.assign({}, pb),
              changes: {
                type: pa.type !== pb.type,
                x: Math.abs(pa.x - pb.x) > 1,
                y: Math.abs(pa.y - pb.y) > 1,
                layer: pa.layer !== pb.layer,
                dir: pa.dir !== pb.dir,
                connect: pa.connect !== pb.connect
              }
            });
          } else {
            unchanged.push(pb);
          }
        }
      });
    }

    if (schemeA) {
      schemeA.forEach(function(pa) {
        if (!mapB[pa.id]) {
          removed.push(pa);
        }
      });
    }

    var byTypeAdded = {};
    var byTypeRemoved = {};
    added.forEach(function(p) { byTypeAdded[p.type] = (byTypeAdded[p.type] || 0) + 1; });
    removed.forEach(function(p) { byTypeRemoved[p.type] = (byTypeRemoved[p.type] || 0) + 1; });

    return {
      added: added,
      removed: removed,
      modified: modified,
      unchanged: unchanged,
      byTypeAdded: byTypeAdded,
      byTypeRemoved: byTypeRemoved,
      hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0
    };
  }

  function formatDiffSummary(diff) {
    var parts = [];
    if (diff.added.length > 0) {
      var typeList = Object.keys(diff.byTypeAdded).map(function(t) {
        return t + "×" + diff.byTypeAdded[t];
      }).join("、");
      parts.push('<span class="diff-add">新增 ' + diff.added.length + ' 个（' + typeList + '）</span>');
    }
    if (diff.removed.length > 0) {
      var typeList2 = Object.keys(diff.byTypeRemoved).map(function(t) {
        return t + "×" + diff.byTypeRemoved[t];
      }).join("、");
      parts.push('<span class="diff-del">删除 ' + diff.removed.length + ' 个（' + typeList2 + '）</span>');
    }
    if (diff.modified.length > 0) {
      var posChange = diff.modified.filter(function(m) { return m.changes.x || m.changes.y; }).length;
      var otherChange = diff.modified.filter(function(m) {
        return m.changes.type || m.changes.layer || m.changes.dir || m.changes.connect;
      }).length;
      var modParts = [];
      if (posChange > 0) modParts.push("位置调整" + posChange);
      if (otherChange > 0) modParts.push("属性变更" + otherChange);
      parts.push('<span class="diff-mod">修改 ' + diff.modified.length + ' 个（' + modParts.join("、") + '）</span>');
    }
    return parts.length > 0 ? parts.join("，") : '<span class="diff-none">无实质性改动</span>';
  }

  function pushHistory(scheme) {
    if (_historyIndex < _historyStack.length - 1) {
      _historyStack = _historyStack.slice(0, _historyIndex + 1);
    }
    var snapshot = JSON.stringify(scheme);
    if (_historyStack.length > 0 && _historyStack[_historyStack.length - 1] === snapshot) {
      return;
    }
    _historyStack.push(snapshot);
    if (_historyStack.length > _MAX_HISTORY) {
      _historyStack.shift();
    } else {
      _historyIndex++;
    }
    _lastSchemeSnapshot = JSON.parse(snapshot);
    updateHistoryButtons();
  }

  function canUndo() {
    return _historyIndex > 0;
  }

  function canRedo() {
    return _historyIndex < _historyStack.length - 1;
  }

  function undo() {
    if (!canUndo()) return null;
    _historyIndex--;
    _lastSchemeSnapshot = JSON.parse(_historyStack[_historyIndex]);
    updateHistoryButtons();
    return JSON.parse(_historyStack[_historyIndex]);
  }

  function redo() {
    if (!canRedo()) return null;
    _historyIndex++;
    _lastSchemeSnapshot = JSON.parse(_historyStack[_historyIndex]);
    updateHistoryButtons();
    return JSON.parse(_historyStack[_historyIndex]);
  }

  function updateHistoryButtons() {
    if (!_container) return;
    var undoBtn = _container.querySelector("#autoLayoutUndoBtn");
    var redoBtn = _container.querySelector("#autoLayoutRedoBtn");
    if (undoBtn) undoBtn.disabled = !canUndo();
    if (redoBtn) redoBtn.disabled = !canRedo();
  }

  function onUndo() {
    var before = _lastSchemeSnapshot ? JSON.parse(JSON.stringify(_lastSchemeSnapshot)) : null;
    var scheme = undo();
    if (scheme && _callbacks.onRestoreHistory) {
      var diff = computeSchemeDiff(before, scheme);
      _callbacks.onRestoreHistory(scheme, diff);
      showUndoRedoNotice("撤销完成", diff);
    }
  }

  function onRedo() {
    var before = _lastSchemeSnapshot ? JSON.parse(JSON.stringify(_lastSchemeSnapshot)) : null;
    var scheme = redo();
    if (scheme && _callbacks.onRestoreHistory) {
      var diff = computeSchemeDiff(before, scheme);
      _callbacks.onRestoreHistory(scheme, diff);
      showUndoRedoNotice("重做完成", diff);
    }
  }

  function showUndoRedoNotice(action, diff) {
    var reportEl = _container.querySelector(".autoLayout-report");
    if (!reportEl) return;
    var html = '<div class="autoLayout-status autoLayout-status-ok">✓ ' + action + '</div>';
    html += '<div class="autoLayout-detail">' + formatDiffSummary(diff) + '</div>';
    reportEl.innerHTML = html;
  }

  function onRepair() {
    if (_callbacks.onPreviewRepair) {
      var config = getConfig();
      _callbacks.onPreviewRepair(config);
    } else if (_callbacks.onRepair) {
      var config = getConfig();
      var result = _callbacks.onRepair(config);
      if (result) {
        showRepairResult(result);
      }
    }
  }

  function showRepairResult(result) {
    var reportEl = _container.querySelector(".autoLayout-report");
    if (!reportEl) return;

    if (result.changes === 0) {
      reportEl.innerHTML = '<div class="autoLayout-status autoLayout-status-ok">方案已处于最佳状态，无需调整。</div>';
      return;
    }

    var html = '<div class="autoLayout-status autoLayout-status-ok">✓ 已完成智能修复</div>';
    html += '<div class="autoLayout-detail">';
    var items = [];
    if (result.yAdjusted > 0) items.push('垂直校准：' + result.yAdjusted + ' 个');
    if (result.connectUpdated > 0) items.push('连接点更新：' + result.connectUpdated + ' 个');
    if (result.symmetryAdded > 0) items.push('对称补齐：' + result.symmetryAdded + ' 个');
    html += items.join('，');
    html += '</div>';
    reportEl.innerHTML = html;
  }

  function _formatActionDiff(action) {
    if (action.type === 'position_adjust' && action.before && action.after) {
      var dy = action.after.y - action.before.y;
      var dir = dy > 0 ? '↓' : '↑';
      return '<span class="repair-diff-before">Y:' + action.before.y + '</span>' +
             '<span class="repair-diff-arrow">→</span>' +
             '<span class="repair-diff-after">Y:' + action.after.y + ' (' + dir + Math.abs(dy) + 'px)</span>';
    }
    if (action.type === 'connect_update' && action.before && action.after) {
      return '<span class="repair-diff-before">' + (action.before.connect || '(空)') + '</span>' +
             '<span class="repair-diff-arrow">→</span>' +
             '<span class="repair-diff-after">' + (action.after.connect || '(空)') + '</span>';
    }
    if (action.type === 'symmetry_add' && action.after) {
      return '<span class="repair-diff-after">新增 ' + action.partType + ' @ X:' + action.after.x + ', Y:' + action.after.y + '</span>';
    }
    return '';
  }

  function _renderActionGroup(type, actions, typeLabel, icon) {
    if (actions.length === 0) return '';

    var typeClass = type === 'position_adjust' ? 'position' : (type === 'connect_update' ? 'connect' : 'symmetry');

    var itemsHtml = actions.map(function(action, idx) {
      var title = '';
      if (action.type === 'position_adjust') {
        title = '移动 ' + action.partType + '（第' + action.layer + '层）';
      } else if (action.type === 'connect_update') {
        title = '更新 ' + action.partType + '（第' + action.layer + '层）连接点';
      } else if (action.type === 'symmetry_add') {
        title = '新增对称构件 ' + action.partType + '（第' + action.layer + '层）';
      }

      return '<div class="repair-action-item ' + typeClass + '" data-part-id="' + (action.partId || '') + '" data-action-idx="' + idx + '">' +
               '<div class="repair-action-title">' + title + '</div>' +
               '<div class="repair-action-constraint">' + action.constraint + '</div>' +
               '<div class="repair-action-reason">' + action.reason + '</div>' +
               '<div class="repair-action-diff">' + _formatActionDiff(action) + '</div>' +
             '</div>';
    }).join('');

    return '<div class="repair-action-group">' +
             '<div class="repair-group-header ' + typeClass + '">' +
               '<span class="repair-group-badge">' + actions.length + '</span>' +
               '<span>' + icon + ' ' + typeLabel + '</span>' +
             '</div>' +
             itemsHtml +
           '</div>';
  }

  function showRepairPlan(repairPlan, callbacks) {
    _currentRepairPlan = repairPlan;
    callbacks = callbacks || {};

    var overlay = document.createElement("div");
    overlay.className = "autoLayout-confirm-overlay";
    overlay.id = "repairPlanOverlay";

    var stats = repairPlan.stats;
    var hasChanges = repairPlan.hasChanges;

    var html = '';

    if (!hasChanges) {
      html = '<div class="repair-plan-panel">' +
               '<div class="repair-plan-header">' +
                 '<h3 class="repair-plan-title">✨ 方案状态良好</h3>' +
                 '<p class="repair-plan-subtitle">当前方案未检测到需要修复的问题</p>' +
               '</div>' +
               '<div class="repair-plan-empty">' +
                 '<div class="repair-plan-empty-icon">✓</div>' +
                 '<div class="repair-plan-empty-title">无需调整</div>' +
                 '<div class="repair-plan-empty-desc">所有构件位置、连接点和对称性均符合约束要求</div>' +
               '</div>' +
               '<div class="repair-plan-footer">' +
                 '<button class="secondary repair-cancel-btn" id="repairPlanCloseBtn">关闭</button>' +
               '</div>' +
             '</div>';
    } else {
      html = '<div class="repair-plan-panel">' +
               '<div class="repair-plan-header">' +
                 '<h3 class="repair-plan-title">🔧 智能修复计划预览</h3>' +
                 '<p class="repair-plan-subtitle">本次修复将执行以下操作，请确认后应用</p>' +
               '</div>' +
               '<div class="repair-plan-stats">' +
                 '<div class="repair-stat-item position">' +
                   '<div class="repair-stat-count">' + stats.positionAdjustCount + '</div>' +
                   '<div class="repair-stat-label">位置调整</div>' +
                 '</div>' +
                 '<div class="repair-stat-item connect">' +
                   '<div class="repair-stat-count">' + stats.connectUpdateCount + '</div>' +
                   '<div class="repair-stat-label">连接点更新</div>' +
                 '</div>' +
                 '<div class="repair-stat-item symmetry">' +
                   '<div class="repair-stat-count">' + stats.symmetryAddCount + '</div>' +
                   '<div class="repair-stat-label">对称补齐</div>' +
                 '</div>' +
               '</div>' +
               '<div class="repair-legend">' +
                 '<div class="repair-legend-item">' +
                   '<span class="repair-legend-dot position"></span>' +
                   '<span>位置调整（蓝色）</span>' +
                 '</div>' +
                 '<div class="repair-legend-item">' +
                   '<span class="repair-legend-dot connect"></span>' +
                   '<span>连接点更新（紫色）</span>' +
                 '</div>' +
                 '<div class="repair-legend-item">' +
                   '<span class="repair-legend-dot symmetry"></span>' +
                   '<span>对称补齐（绿色）</span>' +
                 '</div>' +
               '</div>' +
               '<div class="repair-plan-actions">' +
                 _renderActionGroup('position_adjust', repairPlan.groupedByType.position_adjust, '位置校准', '📐') +
                 _renderActionGroup('connect_update', repairPlan.groupedByType.connect_update, '连接点更新', '🔗') +
                 _renderActionGroup('symmetry_add', repairPlan.groupedByType.symmetry_add, '对称构件补齐', '⚖️') +
               '</div>' +
               '<div class="repair-plan-footer">' +
                 '<button class="secondary repair-cancel-btn" id="repairPlanCancelBtn">取消</button>' +
                 '<button class="secondary" id="repairPlanTogglePreviewBtn">切换预览</button>' +
                 '<button class="repair-confirm-btn" id="repairPlanConfirmBtn">✓ 确认应用</button>' +
               '</div>' +
             '</div>';
    }

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    if (!hasChanges) {
      overlay.querySelector("#repairPlanCloseBtn").onclick = function() {
        document.body.removeChild(overlay);
        _currentRepairPlan = null;
        if (callbacks.onClose) callbacks.onClose();
      };
    } else {
      overlay.querySelectorAll(".repair-action-item").forEach(function(el) {
        el.onclick = function() {
          var partId = el.dataset.partId;
          if (partId && callbacks.onSelectPart) {
            callbacks.onSelectPart(partId);
          }
        };
      });

      overlay.querySelector("#repairPlanCancelBtn").onclick = function() {
        document.body.removeChild(overlay);
        _currentRepairPlan = null;
        if (callbacks.onCancel) callbacks.onCancel();
      };

      var previewVisible = true;
      overlay.querySelector("#repairPlanTogglePreviewBtn").onclick = function() {
        previewVisible = !previewVisible;
        if (callbacks.onTogglePreview) {
          callbacks.onTogglePreview(previewVisible);
        }
      };

      overlay.querySelector("#repairPlanConfirmBtn").onclick = function() {
        document.body.removeChild(overlay);
        var plan = _currentRepairPlan;
        _currentRepairPlan = null;
        if (callbacks.onConfirm) {
          callbacks.onConfirm(plan);
        }
      };
    }

    overlay.onclick = function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        _currentRepairPlan = null;
        if (callbacks.onCancel) callbacks.onCancel();
      }
    };

    var escHandler = function(e) {
      if (e.key === "Escape") {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        _currentRepairPlan = null;
        document.removeEventListener("keydown", escHandler);
        if (callbacks.onCancel) callbacks.onCancel();
      }
    };
    document.addEventListener("keydown", escHandler);

    return overlay;
  }

  function setRepairPreviewState(isPreviewing, repairPlan, showGhostOriginals) {
    if (_callbacks.onPreviewStateChange) {
      _callbacks.onPreviewStateChange({
        isPreviewing: isPreviewing,
        repairPlan: repairPlan || _currentRepairPlan,
        showGhostOriginals: showGhostOriginals !== false
      });
    }
  }

  function clearRepairPreview() {
    setRepairPreviewState(false, null, false);
  }

  function saveStateBeforePreview(scheme, selection) {
    _savedSchemeBeforePreview = scheme ? scheme.map(function(p) { return Object.assign({}, p); }) : null;
    _savedSelectionBeforePreview = selection ? selection.slice() : null;
  }

  function restoreStateBeforePreview() {
    var result = {
      scheme: _savedSchemeBeforePreview,
      selection: _savedSelectionBeforePreview
    };
    _savedSchemeBeforePreview = null;
    _savedSelectionBeforePreview = null;
    return result;
  }

  function getCurrentRepairPlan() {
    return _currentRepairPlan;
  }

  function onGenerate() {
    if (!_protectedMode) {
      doGenerate();
      return;
    }

    if (_hasManualEdits && _lastGeneratedScheme) {
      var currentScheme = _lastSchemeSnapshot;
      var generatedScheme = JSON.parse(_lastGeneratedScheme);
      var diff = computeSchemeDiff(generatedScheme, currentScheme);

      showRegenerateConfirmOverlay(diff, function(override) {
        if (override) {
          doGenerate();
        } else {
          if (_callbacks.onGenerateCanceled) _callbacks.onGenerateCanceled();
        }
      });
      return;
    }
    doGenerate();
  }

  function doGenerate() {
    var config = getConfig();
    if (_callbacks.onGenerate) {
      var scheme = _callbacks.onGenerate(config);
      if (scheme) {
        _lastGeneratedScheme = JSON.stringify(scheme);
        _hasManualEdits = false;
        _historyStack = [];
        _historyIndex = -1;
        pushHistory(scheme);
        showResult(scheme, config);
      }
    }
  }

  function onRecheck() {
    if (_callbacks.onRecheck) {
      var result = _callbacks.onRecheck();
      if (result) {
        showConflictReport(result);
      }
    }
  }

  function showResult(scheme, config) {
    var reportEl = _container.querySelector(".autoLayout-report");
    if (!reportEl) return;

    var partTypes = ["栌斗", "华拱", "昂", "耍头", "散斗"];
    var typeCounts = {};
    partTypes.forEach(function(t) { typeCounts[t] = 0; });
    scheme.forEach(function(p) { if (typeCounts[p.type] !== undefined) typeCounts[p.type]++; });

    var counts = partTypes.map(function(t) {
      return t + "：" + typeCounts[t];
    }).join(" / ");

    var quickResult = AutoLayoutConflictDetector.quickCheck(scheme);
    var statusClass = quickResult.isClean ? "autoLayout-status-ok" : "autoLayout-status-warn";
    var statusText = quickResult.isClean
      ? "生成完成，装配检查通过 ✓"
      : "生成完成，发现 " + quickResult.total + " 个潜在问题";

    var layersPresent = {};
    scheme.forEach(function(p) { layersPresent[p.layer] = true; });
    var actualLayers = Object.keys(layersPresent).length;

    var byLayer = {};
    scheme.forEach(function(p) {
      if (!byLayer[p.layer]) byLayer[p.layer] = 0;
      byLayer[p.layer]++;
    });
    var layerSummary = Object.keys(byLayer).map(Number).sort(function(a,b){return a-b;}).map(function(l) {
      return "L" + l + "=" + byLayer[l];
    }).join(", ");
    var targetSummary = "目标 L1-" + config.targetLayers + "×" + config.partsPerLayer;

    reportEl.innerHTML =
      '<div class="autoLayout-status ' + statusClass + '">' + statusText + '</div>' +
      '<div class="autoLayout-counts">' + counts + '</div>' +
      '<div class="autoLayout-detail">' +
        '共 <b>' + scheme.length + '</b> 个构件 · ' +
        '分布 <b>' + actualLayers + '</b> 层 · ' +
        (config.symmetric ? "<b>左右对称</b> · " : "") +
        '各层：' + layerSummary +
      '</div>' +
      '<div class="autoLayout-detail autoLayout-target">' + targetSummary + '（首层仅1个栌斗）</div>';

    if (!quickResult.isClean) {
      var probs = quickResult.problems;
      var probHtml = "";
      if (probs.suspension > 0) probHtml += '<div class="autoLayout-prob-item bad">⚠ 悬空构件：' + probs.suspension + '</div>';
      if (probs.overlap > 0) probHtml += '<div class="autoLayout-prob-item warn">⚠ 同层重叠：' + probs.overlap + '</div>';
      if (probs.missingConnect > 0) probHtml += '<div class="autoLayout-prob-item warn">⚠ 连接缺失：' + probs.missingConnect + '</div>';
      if (probs.invalidSupport > 0) probHtml += '<div class="autoLayout-prob-item bad">⚠ 承托不合法：' + probs.invalidSupport + '</div>';
      if (probs.insufficientSupport > 0) probHtml += '<div class="autoLayout-prob-item warn">⚠ 承托不足：' + probs.insufficientSupport + '</div>';
      reportEl.innerHTML += '<div class="autoLayout-problems">' + probHtml + '</div>';
    }

    if (_hasManualEdits) {
      reportEl.innerHTML += '<div class="autoLayout-edit-indicator">✏️ 已进行手动编辑（拖拽/新增/删除等），可随时撤销</div>';
    }
  }

  function showConflictReport(result) {
    var reportEl = _container.querySelector(".autoLayout-report");
    if (!reportEl) return;

    if (result.issues.length === 0) {
      reportEl.innerHTML =
        '<div class="autoLayout-status autoLayout-status-ok">✓ 装配检查通过</div>' +
        '<div class="autoLayout-detail">未发现悬空、重叠、连接缺失等装配问题。</div>';
      return;
    }

    var infoCount = result.totalCount - result.errorCount - result.warningCount;

    var html = '<div class="autoLayout-status autoLayout-status-warn">装配检查结果：' +
      '<b class="bad">' + result.errorCount + '</b> 错误 / ' +
      '<b class="warn">' + result.warningCount + '</b> 警告 / ' +
      '<b class="info">' + infoCount + '</b> 提示</div>';

    var maxShow = 15;
    var issues = result.issues.slice(0, maxShow);
    html += '<div class="autoLayout-issues">';
    for (var i = 0; i < issues.length; i++) {
      var iss = issues[i];
      var sevClass = iss.severity === "error" ? "bad" : (iss.severity === "warning" ? "warn" : "info");
      var sevLabel = iss.severity === "error" ? "错误" : (iss.severity === "warning" ? "警告" : "提示");
      var layerText = iss.layer ? "（第" + iss.layer + "层）" : "";
      html += '<div class="autoLayout-issue-item ' + sevClass + '" data-part-id="' + (iss.partId || "") + '">' +
        '<span class="sev-badge">' + sevLabel + '</span>' +
        iss.message +
        '</div>';
    }
    if (result.issues.length > maxShow) {
      html += '<div class="autoLayout-more">还有 ' + (result.issues.length - maxShow) + ' 个问题，可在右侧「装配检查」面板查看全部…</div>';
    }
    html += '</div>';

    html += '<div class="autoLayout-actions autoLayout-inline-actions">' +
      '<button class="secondary" id="autoLayoutQuickRepair">尝试智能修复</button>' +
      '</div>';

    reportEl.innerHTML = html;

    reportEl.querySelectorAll(".autoLayout-issue-item").forEach(function(el) {
      var partId = el.dataset.partId;
      if (partId) {
        el.style.cursor = "pointer";
        el.onclick = function() {
          if (_callbacks.onSelectPart) _callbacks.onSelectPart(partId);
        };
      }
    });

    var repairBtn = reportEl.querySelector("#autoLayoutQuickRepair");
    if (repairBtn) repairBtn.onclick = onRepair;
  }

  function showRegenerateConfirmOverlay(diff, callback) {
    var overlay = document.createElement("div");
    overlay.className = "autoLayout-confirm-overlay";

    var hasDiff = diff.hasChanges;
    var diffHtml = hasDiff ? formatDiffSummary(diff) : '<span class="diff-none">方案未发生明显改动</span>';

    overlay.innerHTML =
      '<div class="autoLayout-confirm-dialog autoLayout-confirm-large">' +
        '<div class="autoLayout-confirm-title">⚠️ 重新生成确认</div>' +
        '<div class="autoLayout-confirm-msg">' +
          '检测到您对自动生成的方案进行了手动编辑：' +
        '</div>' +
        '<div class="autoLayout-diff-box">' + diffHtml + '</div>' +
        '<div class="autoLayout-confirm-warn">' +
          '<b>注意：</b>重新生成将根据当前参数（层数×数量×对称）<b>完全重建</b>新方案，' +
          '以上所有手动调整将丢失。<br>' +
          '若只是想修复局部问题，建议使用「智能修复」或「撤销/重做」。' +
        '</div>' +
        '<div class="autoLayout-confirm-hint">' +
          '💡 小提示：即使误操作，也可以用「撤销」按钮恢复之前的状态。' +
        '</div>' +
        '<div class="autoLayout-confirm-btns">' +
          '<button class="autoLayout-confirm-ok autoLayout-danger-btn">确认重新生成</button>' +
          '<button class="autoLayout-confirm-repair">改用智能修复</button>' +
          '<button class="autoLayout-confirm-cancel secondary">取消</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector(".autoLayout-confirm-ok").onclick = function() {
      document.body.removeChild(overlay);
      callback(true);
    };
    overlay.querySelector(".autoLayout-confirm-cancel").onclick = function() {
      document.body.removeChild(overlay);
      callback(false);
    };
    overlay.querySelector(".autoLayout-confirm-repair").onclick = function() {
      document.body.removeChild(overlay);
      callback(false);
      onRepair();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        callback(false);
      }
    };

    var escHandler = function(e) {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", escHandler);
        callback(false);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function markManualEdit(currentScheme) {
    if (!_hasManualEdits) {
      _hasManualEdits = true;
      var indicator = _container ? _container.querySelector(".autoLayout-edit-indicator") : null;
      if (indicator) {
        indicator.style.display = "block";
      }
    }
    if (currentScheme) {
      pushHistory(currentScheme);
    }
  }

  function clearManualEditFlag() {
    _hasManualEdits = false;
    var indicator = _container ? _container.querySelector(".autoLayout-edit-indicator") : null;
    if (indicator) {
      indicator.style.display = "none";
    }
  }

  function hasManualEdits() {
    return _hasManualEdits;
  }

  function setLastGenerated(scheme) {
    _lastGeneratedScheme = scheme ? JSON.stringify(scheme) : null;
    _hasManualEdits = false;
    if (scheme) {
      pushHistory(scheme);
    }
    clearManualEditFlag();
  }

  function recordCurrentScheme(scheme) {
    if (scheme) {
      pushHistory(scheme);
    }
  }

  function setProtectedMode(enabled) {
    _protectedMode = !!enabled;
  }

  function isProtectedMode() {
    return _protectedMode;
  }

  function render() {
    if (!_container) return;

    _container.innerHTML =
      '<div class="autoLayout-form">' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutLayers">目标层数（2-12）</label>' +
          '<input id="autoLayoutLayers" type="number" min="2" max="12" value="5" title="共2至12层">' +
        '</div>' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutDensity">每层构件数量上限（1-10）</label>' +
          '<input id="autoLayoutDensity" type="number" min="1" max="10" value="4" title="每层最多放几个构件（首层除外）">' +
        '</div>' +
        '<div class="autoLayout-field autoLayout-check-field">' +
          '<label><input id="autoLayoutSymmetric" type="checkbox" checked> 左右对称布局</label>' +
        '</div>' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutBaseConnect">基础连接点</label>' +
          '<input id="autoLayoutBaseConnect" type="text" value="柱头" placeholder="如：柱头、柱身、平板枋">' +
        '</div>' +
        '<div class="autoLayout-preset-section">' +
          '<div class="autoLayout-preset-title">规则预设</div>' +
          '<div class="autoLayout-preset-row">' +
            '<select id="autoLayoutPresetSelect"><option value="">-- 选择预设 --</option></select>' +
          '</div>' +
          '<div class="autoLayout-preset-row">' +
            '<input id="autoLayoutPresetName" type="text" placeholder="输入预设名称">' +
            '<button id="autoLayoutPresetSaveBtn" class="secondary" title="保存当前参数为新预设">保存</button>' +
          '</div>' +
          '<div class="autoLayout-preset-row">' +
            '<button id="autoLayoutPresetLoadBtn" class="secondary" title="加载选中预设到表单（不会自动生成）">加载</button>' +
            '<button id="autoLayoutPresetOverwriteBtn" class="secondary" title="用当前参数覆盖选中预设">覆盖</button>' +
            '<button id="autoLayoutPresetDeleteBtn" class="secondary" title="删除选中预设">删除</button>' +
          '</div>' +
          '<div class="autoLayout-preset-notice" style="display:none"></div>' +
        '</div>' +
        '<div class="autoLayout-actions">' +
          '<button id="autoLayoutGenerateBtn" title="根据约束自动生成斗拱方案（首层仅1个栌斗）">自动生成方案</button>' +
          '<button id="autoLayoutRecheckBtn" class="secondary" title="运行完整装配检查">装配检查</button>' +
        '</div>' +
        '<div class="autoLayout-actions">' +
          '<button id="autoLayoutRepairBtn" class="secondary" title="自动校准位置、更新连接点、补齐对称">智能修复</button>' +
        '</div>' +
        '<div class="autoLayout-history">' +
          '<button id="autoLayoutUndoBtn" class="secondary" disabled title="撤销上一步操作（可连续撤销20步）">↶ 撤销</button>' +
          '<button id="autoLayoutRedoBtn" class="secondary" disabled title="重做已撤销的操作">↷ 重做</button>' +
        '</div>' +
      '</div>' +
      '<div class="autoLayout-report"></div>';

    var generateBtn = _container.querySelector("#autoLayoutGenerateBtn");
    var recheckBtn = _container.querySelector("#autoLayoutRecheckBtn");
    var repairBtn = _container.querySelector("#autoLayoutRepairBtn");
    var undoBtn = _container.querySelector("#autoLayoutUndoBtn");
    var redoBtn = _container.querySelector("#autoLayoutRedoBtn");

    if (generateBtn) generateBtn.onclick = onGenerate;
    if (recheckBtn) recheckBtn.onclick = onRecheck;
    if (repairBtn) repairBtn.onclick = onRepair;
    if (undoBtn) undoBtn.onclick = onUndo;
    if (redoBtn) redoBtn.onclick = onRedo;

    var presetLoadBtn = _container.querySelector("#autoLayoutPresetLoadBtn");
    var presetSaveBtn = _container.querySelector("#autoLayoutPresetSaveBtn");
    var presetOverwriteBtn = _container.querySelector("#autoLayoutPresetOverwriteBtn");
    var presetDeleteBtn = _container.querySelector("#autoLayoutPresetDeleteBtn");

    if (presetLoadBtn) presetLoadBtn.onclick = onPresetLoad;
    if (presetSaveBtn) presetSaveBtn.onclick = onPresetSave;
    if (presetOverwriteBtn) presetOverwriteBtn.onclick = onPresetOverwrite;
    if (presetDeleteBtn) presetDeleteBtn.onclick = onPresetDelete;

    refreshPresetList();
  }

  return {
    init: init,
    getConfig: getConfig,
    markManualEdit: markManualEdit,
    clearManualEditFlag: clearManualEditFlag,
    hasManualEdits: hasManualEdits,
    setLastGenerated: setLastGenerated,
    recordCurrentScheme: recordCurrentScheme,
    showConflictReport: showConflictReport,
    showResult: showResult,
    showRepairResult: showRepairResult,
    showRepairPlan: showRepairPlan,
    setRepairPreviewState: setRepairPreviewState,
    clearRepairPreview: clearRepairPreview,
    saveStateBeforePreview: saveStateBeforePreview,
    restoreStateBeforePreview: restoreStateBeforePreview,
    getCurrentRepairPlan: getCurrentRepairPlan,
    render: render,
    canUndo: canUndo,
    canRedo: canRedo,
    undo: undo,
    redo: redo,
    computeSchemeDiff: computeSchemeDiff,
    formatDiffSummary: formatDiffSummary,
    setProtectedMode: setProtectedMode,
    isProtectedMode: isProtectedMode
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutPanel };
