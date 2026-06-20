const AutoLayoutConstraintModel = (function() {
  const CENTER_X = 520;
  const BASE_Y = 620;
  const TARGET_GAP_Y = 22;
  const END_OFFSET = 18;
  const MIN_OVERLAP_FOR_SUPPORT = 20;

  const LAYER_TYPE_PRIORITY = [
    null,
    ["栌斗"],
    ["华拱", "散斗", "昂"],
    ["散斗", "华拱", "昂"],
    ["华拱", "昂", "散斗"],
    ["散斗", "华拱", "昂"],
    ["耍头", "昂", "华拱", "散斗"],
    ["散斗", "华拱", "耍头"],
    ["昂", "华拱", "散斗"],
    ["散斗", "耍头", "华拱"],
    ["华拱", "昂", "散斗"],
    ["散斗", "耍头", "华拱"],
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

  function findBestSupporter(candidate, lowerParts, preferDirectLayer) {
    var cRect = AssemblyRules.getRect(candidate);
    var best = null;
    var bestScore = -Infinity;
    var directLayer = candidate.layer - 1;

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
      var score = supportInfo.overlapX * 1.0 - layerDist * 25;
      if (supportInfo.isEnough) score += 100;
      if (preferDirectLayer && lp.layer === directLayer) score += 150;
      if (lp.layer === directLayer) score += 50;

      if (score > bestScore) {
        bestScore = score;
        best = {
          part: lp,
          overlapX: supportInfo.overlapX,
          overlapRatio: supportInfo.overlapRatio,
          layerDist: layerDist,
          isEnough: supportInfo.isEnough,
          score: score,
          isDirectLayer: lp.layer === directLayer
        };
      }
    }
    return best;
  }

  function findAllSupporters(candidate, lowerParts) {
    var cRect = AssemblyRules.getRect(candidate);
    var supporters = [];
    var directLayer = candidate.layer - 1;

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
      var score = supportInfo.overlapX * 1.0 - layerDist * 25;
      if (supportInfo.isEnough) score += 100;
      if (lp.layer === directLayer) score += 50;

      supporters.push({
        part: lp,
        overlapX: supportInfo.overlapX,
        overlapRatio: supportInfo.overlapRatio,
        layerDist: layerDist,
        isEnough: supportInfo.isEnough,
        score: score,
        isDirectLayer: lp.layer === directLayer
      });
    }
    supporters.sort(function(a, b) { return b.score - a.score; });
    return supporters;
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

    var allSupporters = findAllSupporters(part, scheme);
    if (allSupporters.length === 0) return "";

    var directSupporters = allSupporters.filter(function(s) { return s.isDirectLayer; });
    var primarySupporters = directSupporters.length > 0 ? directSupporters : allSupporters;

    var best = primarySupporters[0];
    var bestPart = best.part;

    var sSize = AssemblyRules.getSize(bestPart.type);
    var pSize = AssemblyRules.getSize(part.type);
    var sCenterX = bestPart.x + sSize.w / 2;
    var pCenterX = part.x + pSize.w / 2;
    var offset = pCenterX - sCenterX;
    var offsetRatio = Math.abs(offset) / (sSize.w / 2);

    var positionDesc = "";
    if (Math.abs(offset) < 15 || offsetRatio < 0.15) {
      positionDesc = "下承";
    } else if (offset < 0) {
      if (offsetRatio > 0.7) {
        positionDesc = "";
      } else if (offsetRatio > 0.4) {
        positionDesc = "";
      } else {
        positionDesc = "";
      }
      positionDesc = bestPart.type + "左部";
      if (allSupporters.length === 1 && Math.abs(offset) > sSize.w * 0.35) {
        positionDesc = bestPart.type + "左端";
      }
    } else {
      positionDesc = bestPart.type + "右部";
      if (allSupporters.length === 1 && Math.abs(offset) > sSize.w * 0.35) {
        positionDesc = bestPart.type + "右端";
      }
    }

    if (Math.abs(offset) < 15 || offsetRatio < 0.15) {
      positionDesc = "下承" + bestPart.type;
    } else if (offset < -sSize.w * 0.3) {
      positionDesc = bestPart.type + "左端";
    } else if (offset > sSize.w * 0.3) {
      positionDesc = bestPart.type + "右端";
    } else if (offset < 0) {
      positionDesc = bestPart.type + "左部";
    } else {
      positionDesc = bestPart.type + "右部";
    }

    var connectStr = positionDesc;
    if (primarySupporters.length >= 2) {
      var second = primarySupporters[1];
      if (second.isEnough && second.overlapX >= MIN_OVERLAP_FOR_SUPPORT * 0.8) {
        connectStr = connectStr + "兼承" + second.part.type;
      }
    }

    return connectStr;
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

  function generateConnectSuggestions(part, scheme) {
    var suggestions = [];
    var seen = {};

    function addSuggestion(text, score, source) {
      if (!text || seen[text]) return;
      seen[text] = true;
      suggestions.push({ text: text, score: score || 0, source: source || "general" });
    }

    if (part.layer === 1) {
      addSuggestion("柱头", 100, "layer1");
      if (part.type === "栌斗") {
        addSuggestion("柱头正中", 90, "layer1");
      }
    }

    var others = scheme.filter(function(p) { return p.id !== part.id; });
    var allSupporters = findAllSupporters(part, others);

    if (allSupporters.length > 0) {
      var directSupporters = allSupporters.filter(function(s) { return s.isDirectLayer; });
      var primary = directSupporters.length > 0 ? directSupporters : allSupporters;

      for (var si = 0; si < Math.min(primary.length, 3); si++) {
        var sup = primary[si];
        var sPart = sup.part;
        var sSize = AssemblyRules.getSize(sPart.type);
        var pSize = AssemblyRules.getSize(part.type);
        var sCenterX = sPart.x + sSize.w / 2;
        var pCenterX = part.x + pSize.w / 2;
        var offset = pCenterX - sCenterX;
        var absOffset = Math.abs(offset);
        var baseScore = sup.score + (sup.isDirectLayer ? 50 : 0);

        if (absOffset < 15 || absOffset < sSize.w * 0.12) {
          addSuggestion("下承" + sPart.type, baseScore + 80, "support_center");
          addSuggestion(sPart.type + "正中", baseScore + 40, "support_center");
        } else if (offset < -sSize.w * 0.3) {
          addSuggestion(sPart.type + "左端", baseScore + 70, "support_left_end");
          addSuggestion("下承" + sPart.type + "左部", baseScore + 35, "support_left");
        } else if (offset > sSize.w * 0.3) {
          addSuggestion(sPart.type + "右端", baseScore + 70, "support_right_end");
          addSuggestion("下承" + sPart.type + "右部", baseScore + 35, "support_right");
        } else if (offset < 0) {
          addSuggestion(sPart.type + "左部", baseScore + 60, "support_left");
          addSuggestion("下承" + sPart.type + "左部", baseScore + 30, "support_left");
        } else {
          addSuggestion(sPart.type + "右部", baseScore + 60, "support_right");
          addSuggestion("下承" + sPart.type + "右部", baseScore + 30, "support_right");
        }
      }

      if (primary.length >= 2) {
        var second = primary[1];
        if (second.isEnough || second.overlapX >= MIN_OVERLAP_FOR_SUPPORT * 0.6) {
          var firstType = primary[0].part.type;
          var secondType = second.part.type;
          if (firstType !== secondType) {
            addSuggestion("下承" + firstType + "兼承" + secondType, 55, "multi_support");
          }
        }
      }
    }

    var sameLayerNeighbors = others.filter(function(p) {
      if (p.layer !== part.layer) return false;
      var rectA = AssemblyRules.getRect(part);
      var rectB = AssemblyRules.getRect(p);
      return AssemblyRules.checkSameLayerConnection(rectA, rectB);
    });

    if (sameLayerNeighbors.length > 0) {
      var pSize2 = AssemblyRules.getSize(part.type);
      var pCenter2 = part.x + pSize2.w / 2;

      for (var ni = 0; ni < sameLayerNeighbors.length; ni++) {
        var neighbor = sameLayerNeighbors[ni];
        var nSize = AssemblyRules.getSize(neighbor.type);
        var nCenter = neighbor.x + nSize.w / 2;
        var neighborScore = 30;

        if (nCenter < pCenter2 - 20) {
          addSuggestion("与" + neighbor.type + "左端邻接", neighborScore, "same_layer_left");
        } else if (nCenter > pCenter2 + 20) {
          addSuggestion("与" + neighbor.type + "右端邻接", neighborScore, "same_layer_right");
        } else {
          addSuggestion("与" + neighbor.type + "并列", neighborScore, "same_layer");
        }
      }
    }

    if (AssemblyRules.isDirectionalPart(part.type)) {
      if (part.dir === "左挑") {
        addSuggestion("向左挑出", 25, "direction");
      } else if (part.dir === "右挑") {
        addSuggestion("向右挑出", 25, "direction");
      }
    }

    var typeDefaults = {
      "华拱": ["跨承" + (allSupporters[0] ? allSupporters[0].part.type : "栌斗"), "华拱正身"],
      "昂": ["昂身下承" + (allSupporters[0] ? allSupporters[0].part.type : "栌斗"), "昂尾挑出"],
      "耍头": ["耍头承" + (allSupporters[0] ? allSupporters[0].part.type : "散斗"), "耍头正出"],
      "散斗": ["散斗承托", "交互斗"],
      "栌斗": ["栌斗坐柱头", "大斗"]
    };
    if (typeDefaults[part.type]) {
      for (var di = 0; di < typeDefaults[part.type].length; di++) {
        addSuggestion(typeDefaults[part.type][di], 10, "type_default");
      }
    }

    suggestions.sort(function(a, b) { return b.score - a.score; });

    var rawTexts = [];
    for (var ri = 0; ri < suggestions.length && rawTexts.length < 6; ri++) {
      rawTexts.push(suggestions[ri].text);
    }

    if (rawTexts.length === 0 && part.layer > 1) {
      var lowerAny = others.filter(function(p) { return p.layer < part.layer; });
      if (lowerAny.length > 0) {
        lowerAny.sort(function(a, b) { return b.layer - a.layer; });
        rawTexts.push("下承" + lowerAny[0].type);
        if (lowerAny.length > 1) rawTexts.push(lowerAny[1].type + "上方");
      } else {
        rawTexts.push("待指定");
      }
    }

    var validated = AssemblyRules.filterConnectSuggestions(part, rawTexts, scheme);
    var result = validated.map(function(v) { return v.text; });

    if (result.length === 0) {
      result = rawTexts.slice(0, 3);
    }

    return result.slice(0, 3);
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
    findAllSupporters: findAllSupporters,
    generateConnectString: generateConnectString,
    generateConnectSuggestions: generateConnectSuggestions,
    getSymmetryAxis: getSymmetryAxis,
    mirrorPart: mirrorPart,
    checkSymmetryPair: checkSymmetryPair
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutConstraintModel };
