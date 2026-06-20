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
    if (_callbacks.onRepair) {
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
