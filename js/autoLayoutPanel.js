const AutoLayoutPanel = (function() {
  var _container = null;
  var _callbacks = null;
  var _lastGeneratedScheme = null;
  var _hasManualEdits = false;
  var _historyStack = [];
  var _historyIndex = -1;
  var _MAX_HISTORY = 20;

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

  function pushHistory(scheme) {
    if (_historyIndex < _historyStack.length - 1) {
      _historyStack = _historyStack.slice(0, _historyIndex + 1);
    }
    _historyStack.push(JSON.stringify(scheme));
    if (_historyStack.length > _MAX_HISTORY) {
      _historyStack.shift();
    } else {
      _historyIndex++;
    }
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
    updateHistoryButtons();
    return JSON.parse(_historyStack[_historyIndex]);
  }

  function redo() {
    if (!canRedo()) return null;
    _historyIndex++;
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
    var scheme = undo();
    if (scheme && _callbacks.onRestoreHistory) {
      _callbacks.onRestoreHistory(scheme);
    }
  }

  function onRedo() {
    var scheme = redo();
    if (scheme && _callbacks.onRestoreHistory) {
      _callbacks.onRestoreHistory(scheme);
    }
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

    var html = '<div class="autoLayout-status autoLayout-status-ok">已完成智能修复</div>';
    html += '<div class="autoLayout-detail">';
    if (result.yAdjusted > 0) html += '垂直位置校准：' + result.yAdjusted + ' 个构件，';
    if (result.connectUpdated > 0) html += '连接点更新：' + result.connectUpdated + ' 个，';
    if (result.symmetryAdded > 0) html += '对称补齐：' + result.symmetryAdded + ' 个';
    html += '</div>';
    reportEl.innerHTML = html;
  }

  function onGenerate() {
    if (_hasManualEdits && _lastGeneratedScheme) {
      showConfirmOverlay(
        "当前方案已有手动编辑，重新生成将覆盖所有改动。\n\n是否确定重新生成？",
        function() {
          doGenerate();
        },
        function() {}
      );
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
    var counts = partTypes.map(function(t) {
      return t + "：" + scheme.filter(function(p) { return p.type === t; }).length;
    }).join(" / ");

    var quickResult = AutoLayoutConflictDetector.quickCheck(scheme);
    var statusClass = quickResult.isClean ? "autoLayout-status-ok" : "autoLayout-status-warn";
    var statusText = quickResult.isClean
      ? "生成完成，装配检查通过 ✓"
      : "生成完成，发现 " + quickResult.total + " 个潜在问题";

    var layersPresent = new Set(scheme.map(function(p) { return p.layer; }));
    var actualLayers = layersPresent.size;

    reportEl.innerHTML =
      '<div class="autoLayout-status ' + statusClass + '">' + statusText + '</div>' +
      '<div class="autoLayout-counts">' + counts + '</div>' +
      '<div class="autoLayout-detail">共 ' + scheme.length + ' 个构件，分布于 ' + actualLayers + ' 层（目标 ' + config.targetLayers + ' 层）' +
      (config.symmetric ? "，左右对称模式" : "") + '</div>';

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
      reportEl.innerHTML += '<div class="autoLayout-edit-indicator">✏️ 已进行手动编辑</div>';
    }
  }

  function showConflictReport(result) {
    var reportEl = _container.querySelector(".autoLayout-report");
    if (!reportEl) return;

    if (result.issues.length === 0) {
      reportEl.innerHTML = '<div class="autoLayout-status autoLayout-status-ok">✓ 装配检查通过，未发现问题。</div>';
      return;
    }

    var html = '<div class="autoLayout-status autoLayout-status-warn">发现 ' +
      '<b class="bad">' + result.errorCount + '</b> 个错误，' +
      '<b class="warn">' + result.warningCount + '</b> 个警告，' +
      '<b class="info">' + (result.totalCount - result.errorCount - result.warningCount) + '</b> 条提示</div>';

    var maxShow = 12;
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
  }

  function showConfirmOverlay(message, onConfirm, onCancel) {
    var overlay = document.createElement("div");
    overlay.className = "autoLayout-confirm-overlay";
    overlay.innerHTML =
      '<div class="autoLayout-confirm-dialog">' +
        '<div class="autoLayout-confirm-title">⚠️ 确认操作</div>' +
        '<div class="autoLayout-confirm-msg">' + message.replace(/\n/g, '<br>') + '</div>' +
        '<div class="autoLayout-confirm-hint">提示：可使用「撤销」按钮恢复之前的状态</div>' +
        '<div class="autoLayout-confirm-btns">' +
          '<button class="autoLayout-confirm-ok">确认重新生成</button>' +
          '<button class="autoLayout-confirm-cancel secondary">取消</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector(".autoLayout-confirm-ok").onclick = function() {
      document.body.removeChild(overlay);
      onConfirm();
    };
    overlay.querySelector(".autoLayout-confirm-cancel").onclick = function() {
      document.body.removeChild(overlay);
      onCancel();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        onCancel();
      }
    };

    var escHandler = function(e) {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", escHandler);
        onCancel();
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function markManualEdit() {
    _hasManualEdits = true;
    var indicator = _container ? _container.querySelector(".autoLayout-edit-indicator") : null;
    if (indicator) {
      indicator.style.display = "block";
    }
  }

  function clearManualEditFlag() {
    _hasManualEdits = false;
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
  }

  function recordCurrentScheme(scheme) {
    if (scheme) {
      pushHistory(scheme);
    }
  }

  function render() {
    if (!_container) return;

    _container.innerHTML =
      '<div class="autoLayout-form">' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutLayers">目标层数</label>' +
          '<input id="autoLayoutLayers" type="number" min="2" max="12" value="5" title="2-12层">' +
        '</div>' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutDensity">每层构件数量上限</label>' +
          '<input id="autoLayoutDensity" type="number" min="1" max="10" value="4" title="1-10个">' +
        '</div>' +
        '<div class="autoLayout-field autoLayout-check-field">' +
          '<label><input id="autoLayoutSymmetric" type="checkbox" checked> 左右对称布局</label>' +
        '</div>' +
        '<div class="autoLayout-field">' +
          '<label for="autoLayoutBaseConnect">基础连接点</label>' +
          '<input id="autoLayoutBaseConnect" type="text" value="柱头" placeholder="如：柱头、柱身">' +
        '</div>' +
        '<div class="autoLayout-actions">' +
          '<button id="autoLayoutGenerateBtn" title="根据约束自动生成斗拱方案">自动生成</button>' +
          '<button id="autoLayoutRecheckBtn" class="secondary" title="对当前方案进行装配规则检查">装配检查</button>' +
        '</div>' +
        '<div class="autoLayout-actions">' +
          '<button id="autoLayoutRepairBtn" class="secondary" title="自动校准位置、连接点和对称性">智能修复</button>' +
        '</div>' +
        '<div class="autoLayout-history">' +
          '<button id="autoLayoutUndoBtn" class="secondary" disabled title="撤销上一步操作">↶ 撤销</button>' +
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
    redo: redo
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutPanel };
