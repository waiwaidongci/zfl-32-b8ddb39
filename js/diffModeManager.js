var DiffModeManager = {
  _deps: null,
  _isActive: false,
  _diffResult: null,

  init(panelSelector, deps) {
    this._deps = deps || {};
    this._isActive = false;
    this._diffResult = null;

    var self = this;
    SchemeDiffUI.init(panelSelector, {
      onDiffModeChanged: function(active, diffResult, restoredSnapshot) {
        self._handleDiffModeChanged(active, diffResult, restoredSnapshot);
      },
      onDiffItemSelect: function(partId, diffType) {
        self._handleDiffItemSelect(partId, diffType);
      },
      onDiffMeasurementSelect: function(annotationId, diffType) {
        self._handleDiffMeasurementSelect(annotationId, diffType);
      }
    });
  },

  isActive() {
    return this._isActive;
  },

  getDiffResult() {
    return this._diffResult;
  },

  enterDiffMode(savedSchemeId) {
    if (this._isActive) {
      this.exitDiffMode();
    }

    var deps = this._deps;
    if (!deps) {
      console.error("DiffModeManager not initialized");
      return;
    }

    var snapshot = StateSnapshotManager.createSnapshot();
    SchemeDiffUI.saveStateSnapshot(snapshot);

    var currentScheme = deps.getScheme ? deps.getScheme() : [];
    var measurementData = deps.getMeasurementData ? deps.getMeasurementData() : null;

    SchemeDiffUI.enterDiffMode(currentScheme, savedSchemeId, measurementData);
  },

  exitDiffMode() {
    SchemeDiffUI.exitDiffMode();
  },

  _handleDiffModeChanged(active, diffResult, restoredSnapshot) {
    var deps = this._deps;
    if (!deps) return;

    if (active) {
      this._isActive = true;
      this._diffResult = diffResult;
      Preview3D.setDiffMode(true, diffResult);
      document.body.classList.add("diff-mode-active");
    } else {
      this._isActive = false;
      this._diffResult = null;
      Preview3D.setDiffMode(false, null);
      document.body.classList.remove("diff-mode-active");
      if (restoredSnapshot) {
        StateSnapshotManager.restoreSnapshot(restoredSnapshot);
      }
    }

    if (deps.renderAll) {
      deps.renderAll();
    }
  },

  _handleDiffItemSelect(partId, diffType) {
    var deps = this._deps;
    if (!deps) return;

    if (diffType === "deleted") {
      var diffItem = this._diffResult ? this._diffResult.deleted.find(function(d) { return d.partId === partId; }) : null;
      if (diffItem && diffItem.part) {
        var canvas = deps.getCanvas ? deps.getCanvas() : null;
        if (canvas) {
          var ghostEl = canvas.querySelector('.diff-deleted-ghost[data-ghost-id="' + partId + '"]');
          if (ghostEl) {
            ghostEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            ghostEl.style.outline = "5px solid rgba(198, 40, 40, 1)";
            var savedOutline = ghostEl.style.outline;
            setTimeout(function() {
              ghostEl.style.outline = "";
            }, 2500);
          }
        }
        if (Preview3D.isActive()) {
          Preview3D.focusOnPartIds([partId + "_ghost_deleted"]);
        }
      }
      return;
    }

    if (diffType === "moved") {
      var canvas = deps.getCanvas ? deps.getCanvas() : null;
      var targetGhost = null;
      if (this._diffResult && canvas) {
        var movedItem = this._diffResult.moved.find(function(d) { return d.partId === partId; });
        if (movedItem && movedItem.from) {
          var allGhosts = canvas.querySelectorAll('.diff-move-ghost');
          for (var gi = 0; gi < allGhosts.length; gi++) {
            var gx = parseInt(allGhosts[gi].style.left) || 0;
            var gy = parseInt(allGhosts[gi].style.top) || 0;
            if (Math.abs(gx - movedItem.from.x) < 5 && Math.abs(gy - movedItem.from.y) < 5) {
              targetGhost = allGhosts[gi];
              break;
            }
          }
        }
      }
    }

    var scheme = deps.getScheme ? deps.getScheme() : [];
    var part = scheme.find(function(p) { return p.id === partId; });
    if (!part) return;

    SelectionManager.select(partId);

    var canvas = deps.getCanvas ? deps.getCanvas() : null;
    if (canvas) {
      var el = canvas.querySelector('.part[data-id="' + partId + '"]');
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }

    if (Preview3D.isActive()) {
      Preview3D.focusOnPartIds([partId]);
    }

    if (deps.renderAll) {
      deps.renderAll();
    }
  },

  _handleDiffMeasurementSelect(annotationId, diffType) {
    var deps = this._deps;
    if (!deps) return;

    var canvas = deps.getCanvas ? deps.getCanvas() : null;
    if (canvas) {
      var annEl = canvas.querySelector('.annotation-group[data-annotation-id="' + annotationId + '"]');
      if (annEl) {
        annEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        annEl.style.filter = "drop-shadow(0 0 8px rgba(255, 193, 7, 0.9))";
        setTimeout(function() {
          annEl.style.filter = "";
        }, 2500);
      }
    }
    if (diffType === "measDeleted" && this._diffResult && this._diffResult.measurementDiff) {
      var delItem = this._diffResult.measurementDiff.deleted.find(function(d) { return d.annotationId === annotationId; });
      if (delItem && delItem.annotation) {
        alert("已删除的标注信息：\n" + SchemeDiff.formatMeasurementLabel(delItem.annotation));
      }
    }
  }
};

if (typeof module !== "undefined") module.exports = { DiffModeManager };
