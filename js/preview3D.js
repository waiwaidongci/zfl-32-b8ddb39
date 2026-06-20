const Preview3D = (function() {
  let canvas2D = null;
  let canvas3DWrap = null;
  let canvas3D = null;
  let toggleBtn = null;
  let is3DMode = false;
  let isExploded = false;
  let currentScheme = [];
  let highlightedIds = new Set();
  let onSelectPart = null;
  let _selectionUnsub = null;

  const EXPLODE_DISTANCE = 28;

  function init(opts) {
    canvas2D = document.querySelector("#canvas");
    canvas3DWrap = document.querySelector("#canvas3DWrap");
    canvas3D = document.querySelector("#canvas3D");
    toggleBtn = document.querySelector("#viewToggleBtn");

    if (opts && opts.onSelectPart) onSelectPart = opts.onSelectPart;

    if (toggleBtn) {
      toggleBtn.onclick = toggleView;
    }

    if (canvas3D && canvas3DWrap) {
      ThreeScene.init(canvas3D, canvas3DWrap);
      ThreeScene.setOnPartClick(function(partId, shiftKey) {
        if (onSelectPart) onSelectPart(partId, shiftKey);
      });
    }

    updateView();
  }

  function toggleView() {
    is3DMode = !is3DMode;
    if (toggleBtn) {
      toggleBtn.textContent = is3DMode ? "切换2D编辑" : "切换3D预览";
      toggleBtn.classList.toggle("secondary", !is3DMode);
    }
    updateView();

    if (is3DMode) {
      setTimeout(function() {
        ThreeScene.handleResize();
        ThreeScene.resetCamera();
      }, 50);
    }
  }

  function updateView() {
    if (!canvas2D || !canvas3DWrap) return;
    if (is3DMode) {
      canvas2D.style.display = "none";
      canvas3DWrap.style.display = "block";
      ThreeScene.handleResize();
    } else {
      canvas2D.style.display = "";
      canvas3DWrap.style.display = "none";
    }
  }

  function updateScheme(scheme) {
    currentScheme = scheme ? scheme.slice() : [];
    rebuildScene();
  }

  function rebuildScene() {
    if (!ThreeScene.isInitialized()) return;
    const group = Model3DBuilder.buildAll(currentScheme);
    ThreeScene.setParts(group);
    applyExplosion(isExploded);
    refreshHighlights();
  }

  function setHighlightedIds(ids) {
    highlightedIds = ids instanceof Set ? new Set(ids) : new Set(ids || []);
    refreshHighlights();
  }

  function refreshHighlights() {
    const partsGroup = ThreeScene.getPartsGroup();
    if (!partsGroup) return;

    partsGroup.children.forEach(function(partGroup) {
      const pid = partGroup.userData ? partGroup.userData.partId : null;
      const shouldHighlight = pid && highlightedIds.has(pid);
      Model3DBuilder.applyHighlight(partGroup, shouldHighlight);
    });
  }

  function toggleExplosion() {
    isExploded = !isExploded;
    applyExplosion(isExploded);
  }

  function applyExplosion(exploded) {
    const partsGroup = ThreeScene.getPartsGroup();
    if (!partsGroup) return;
    Model3DBuilder.applyExplosion(partsGroup, exploded ? EXPLODE_DISTANCE : 0);
  }

  function setExploded(value) {
    isExploded = !!value;
    applyExplosion(isExploded);
  }

  function isActive() {
    return is3DMode;
  }

  function focusOnPartIds(ids) {
    if (!ThreeScene.isInitialized()) return;
    ThreeScene.focusOnPartIds(ids);
  }

  function handleResize() {
    if (is3DMode) ThreeScene.handleResize();
  }

  return {
    init: init,
    toggleView: toggleView,
    updateScheme: updateScheme,
    setHighlightedIds: setHighlightedIds,
    focusOnPartIds: focusOnPartIds,
    toggleExplosion: toggleExplosion,
    setExploded: setExploded,
    isActive: isActive,
    handleResize: handleResize
  };
})();

if (typeof module !== "undefined") module.exports = { Preview3D };
