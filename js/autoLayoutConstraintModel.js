const AutoLayoutConstraintModel = (function() {
  const CENTER_X = 520;
  const BASE_Y = 620;
  const TARGET_GAP_Y = 22;
  const END_OFFSET = 18;
  const MIN_OVERLAP_FOR_SUPPORT = 20;

  const LAYER_TYPE_PRIORITY = [
    null,
    ["栌斗"],
    ["华拱"],
    ["散斗"],
    ["华拱", "昂"],
    ["散斗", "耍头"],
    ["华拱", "昂"],
    ["散斗", "耍头"],
    ["昂", "华拱"],
    ["散斗", "耍头"],
    ["华拱", "昂"],
    ["散斗", "耍头"],
    ["散斗", "耍头"],
    ["华拱", "昂"],
    ["散斗"]
  ];

  const HORIZONTAL_TYPES = ["华拱", "昂", "耍头"];
  const DOU_TYPES = ["栌斗", "散斗"];

  function getPreferredTypes(layer) {
    if (layer >= 1 && layer < LAYER_TYPE_PRIORITY.length) {
      return LAYER_TYPE_PRIORITY[layer].slice();
    }
    if (layer % 2 === 0) return ["华拱", "昂"];
    return ["散斗", "耍头"];
  }

  function getPlacementMode(supporterType, newType) {
    if (HORIZONTAL_TYPES.includes(newType)) {
      if (DOU_TYPES.includes(supporterType)) return "center";
      return "center_on_gong";
    }
    if (newType === "散斗") {
      if (HORIZONTAL_TYPES.includes(supporterType)) return "ends";
      return "center_on";
    }
    if (newType === "栌斗") return "center";
    return "center";
  }

  function calcY(supporterY, supporterH, newH) {
    return Math.round(supporterY - newH - TARGET_GAP_Y);
  }

  function calcYForLayer(baseY, layer) {
    if (layer <= 1) return baseY;
    var accumulatedHeight = 0;
    for (var l = 1; l < layer; l++) {
      var avgH = l === 1 ? 52 : 34;
      accumulatedHeight += avgH + TARGET_GAP_Y;
    }
    return Math.round(baseY - accumulatedHeight);
  }

  function calcPositions(newType, supporter, existingParts) {
    var sSize = AssemblyRules.getSize(supporter.type);
    var nSize = AssemblyRules.getSize(newType);
    var mode = getPlacementMode(supporter.type, newType);
    var y = calcY(supporter.y, sSize.h, nSize.h);
    var positions = [];

    if (mode === "center" || mode === "center_on") {
      var x = Math.round(supporter.x + sSize.w / 2 - nSize.w / 2);
      var dir = "正";
      if (newType === "昂" || newType === "耍头") {
        dir = "正";
      }
      positions.push({ x: x, y: y, dir: dir });
    } else if (mode === "center_on_gong") {
      var centerX = Math.round(supporter.x + sSize.w / 2 - nSize.w / 2);
      positions.push({ x: centerX, y: y, dir: "正" });
      if (newType === "昂" || newType === "耍头") {
        var leftShift = Math.round(supporter.x + sSize.w * 0.25 - nSize.w / 2);
        var rightShift = Math.round(supporter.x + sSize.w * 0.75 - nSize.w / 2);
        positions.push({ x: leftShift, y: y, dir: "左挑" });
        positions.push({ x: rightShift, y: y, dir: "右挑" });
      }
    } else if (mode === "ends") {
      var leftX = Math.round(supporter.x + END_OFFSET - nSize.w / 2);
      var rightX = Math.round(supporter.x + sSize.w - END_OFFSET - nSize.w / 2);
      positions.push({ x: leftX, y: y, dir: "正" });
      positions.push({ x: rightX, y: y, dir: "正" });
      var centerX2 = Math.round(supporter.x + sSize.w / 2 - nSize.w / 2);
      positions.push({ x: centerX2, y: y, dir: "正" });
    } else {
      var x2 = Math.round(supporter.x + sSize.w / 2 - nSize.w / 2);
      positions.push({ x: x2, y: y, dir: "正" });
    }

    return positions.filter(function(pos) {
      return !hasOverlapAtPosition(newType, pos.x, pos.y, supporter.layer + 1, existingParts);
    });
  }

  function hasOverlapAtPosition(type, x, y, layer, existingParts) {
    var testRect = {
      left: x,
      right: x + AssemblyRules.getSize(type).w,
      top: y,
      bottom: y + AssemblyRules.getSize(type).h,
      w: AssemblyRules.getSize(type).w,
      h: AssemblyRules.getSize(type).h
    };
    for (var i = 0; i < existingParts.length; i++) {
      var p = existingParts[i];
      if (p.layer !== layer) continue;
      var pRect = AssemblyRules.getRect(p);
      if (AssemblyRules.checkSameLayerOverlap(testRect, pRect)) return true;
    }
    return false;
  }

  function isValidPlacement(candidate, existingParts) {
    var cRect = AssemblyRules.getRect(candidate);
    for (var i = 0; i < existingParts.length; i++) {
      var p = existingParts[i];
      if (p.id === candidate.id) continue;
      if (p.layer !== candidate.layer) continue;
      var eRect = AssemblyRules.getRect(p);
      if (AssemblyRules.checkSameLayerOverlap(cRect, eRect)) return false;
    }
    return true;
  }

  function calculateSupportOverlap(candidate, supporter) {
    var cRect = AssemblyRules.getRect(candidate);
    var sRect = AssemblyRules.getRect(supporter);
    var overlapX = Math.min(cRect.right, sRect.right) - Math.max(cRect.left, sRect.left);
    var overlapRatio = overlapX / Math.min(cRect.w, sRect.w);
    return {
      overlapX: overlapX,
      overlapRatio: overlapRatio,
      isEnough: overlapX >= MIN_OVERLAP_FOR_SUPPORT && overlapRatio >= 0.25
    };
  }

  function findBestSupporter(candidate, lowerParts) {
    var cRect = AssemblyRules.getRect(candidate);
    var best = null;
    var bestScore = -Infinity;

    for (var i = 0; i < lowerParts.length; i++) {
      var lp = lowerParts[i];
      if (lp.layer >= candidate.layer) continue;
      var layerDist = candidate.layer - lp.layer;
      if (layerDist > AssemblyRules.MAX_SUPPORT_SEARCH_LAYERS) continue;
      if (!AssemblyRules.canSupport(lp.type, candidate.type)) continue;

      var lRect = AssemblyRules.getRect(lp);
      var check = AssemblyRules.checkSupportOverlap(cRect, lRect);
      if (!check.isSupported) continue;

      var supportInfo = calculateSupportOverlap(candidate, lp);
      var score = supportInfo.overlapX * 1.0 - layerDist * 10;
      if (supportInfo.isEnough) score += 100;

      if (score > bestScore) {
        bestScore = score;
        best = {
          part: lp,
          overlapX: supportInfo.overlapX,
          overlapRatio: supportInfo.overlapRatio,
          layerDist: layerDist,
          isEnough: supportInfo.isEnough,
          score: score
        };
      }
    }
    return best;
  }

  function hasSupportAbove(candidate, lowerParts) {
    var supporter = findBestSupporter(candidate, lowerParts);
    return supporter !== null && supporter.isEnough;
  }

  function hasAdequateSupport(candidate, lowerParts) {
    var supporter = findBestSupporter(candidate, lowerParts);
    return supporter !== null && supporter.isEnough;
  }

  function generateConnectString(part, scheme) {
    if (part.layer === 1) return "柱头";

    var best = null;
    var bestOverlap = -Infinity;

    for (var i = 0; i < scheme.length; i++) {
      var s = scheme[i];
      if (s.layer >= part.layer) continue;
      if (!AssemblyRules.canSupport(s.type, part.type)) continue;

      var layerDist = part.layer - s.layer;
      if (layerDist > AssemblyRules.MAX_SUPPORT_SEARCH_LAYERS) continue;

      var pRect = AssemblyRules.getRect(part);
      var sRect = AssemblyRules.getRect(s);
      var check = AssemblyRules.checkSupportOverlap(pRect, sRect);

      if (check.isSupported && check.overlapX > bestOverlap) {
        bestOverlap = check.overlapX;
        best = s;
      }
    }

    if (!best) return "";

    var sSize = AssemblyRules.getSize(best.type);
    var pSize = AssemblyRules.getSize(part.type);
    var sCenterX = best.x + sSize.w / 2;
    var pCenterX = part.x + pSize.w / 2;
    var offset = pCenterX - sCenterX;

    if (Math.abs(offset) < 15) {
      return "下承" + best.type;
    } else if (offset < 0) {
      return best.type + "左端";
    } else {
      return best.type + "右端";
    }
  }

  function getSymmetryAxis() {
    return CENTER_X;
  }

  function mirrorPart(part) {
    var nSize = AssemblyRules.getSize(part.type);
    var partCenterX = part.x + nSize.w / 2;
    var axis = getSymmetryAxis();

    if (Math.abs(partCenterX - axis) < 5) return null;

    var mirroredCenterX = 2 * axis - partCenterX;
    var mirroredX = Math.round(mirroredCenterX - nSize.w / 2);

    var mirroredDir = part.dir;
    if (part.dir === "左挑") mirroredDir = "右挑";
    else if (part.dir === "右挑") mirroredDir = "左挑";

    return {
      id: crypto.randomUUID(),
      type: part.type,
      x: mirroredX,
      y: part.y,
      layer: part.layer,
      dir: mirroredDir,
      connect: ""
    };
  }

  function checkSymmetryPair(part, scheme) {
    var axis = getSymmetryAxis();
    var nSize = AssemblyRules.getSize(part.type);
    var partCenterX = part.x + nSize.w / 2;

    if (Math.abs(partCenterX - axis) < 5) return true;

    var mirroredCenterX = 2 * axis - partCenterX;

    for (var i = 0; i < scheme.length; i++) {
      var s = scheme[i];
      if (s.layer !== part.layer || s.type !== part.type || s.id === part.id) continue;
      var sSize = AssemblyRules.getSize(s.type);
      var sCenterX = s.x + sSize.w / 2;
      if (Math.abs(sCenterX - mirroredCenterX) < 10) return true;
    }

    return false;
  }

  return {
    CENTER_X: CENTER_X,
    BASE_Y: BASE_Y,
    TARGET_GAP_Y: TARGET_GAP_Y,
    END_OFFSET: END_OFFSET,
    MIN_OVERLAP_FOR_SUPPORT: MIN_OVERLAP_FOR_SUPPORT,
    getPreferredTypes: getPreferredTypes,
    getPlacementMode: getPlacementMode,
    calcY: calcY,
    calcYForLayer: calcYForLayer,
    calcPositions: calcPositions,
    isValidPlacement: isValidPlacement,
    hasSupportAbove: hasSupportAbove,
    hasAdequateSupport: hasAdequateSupport,
    calculateSupportOverlap: calculateSupportOverlap,
    findBestSupporter: findBestSupporter,
    generateConnectString: generateConnectString,
    getSymmetryAxis: getSymmetryAxis,
    mirrorPart: mirrorPart,
    checkSymmetryPair: checkSymmetryPair
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutConstraintModel };
