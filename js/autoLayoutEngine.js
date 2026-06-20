const AutoLayoutEngine = (function() {

  function makePart(type, x, y, layer, dir, connect) {
    return {
      id: crypto.randomUUID(),
      type: type,
      x: Math.round(x),
      y: Math.round(y),
      layer: layer,
      dir: dir || "正",
      connect: connect || ""
    };
  }

  function calcLayerDensityWeights(targetParts, existingParts, layer) {
    var weight = 1.0;
    var targetForLayer = targetParts;
    if (layer === 1) weight = 0.3;
    if (existingParts >= targetForLayer) weight = 0.1;
    else if (existingParts < targetForLayer * 0.3) weight = 2.5;
    else if (existingParts < targetForLayer * 0.6) weight = 1.5;
    return weight;
  }

  function collectExtendedCandidatePositions(newType, supporter, existingScheme, layer) {
    var sSize = AssemblyRules.getSize(supporter.type);
    var nSize = AssemblyRules.getSize(newType);
    var y = AutoLayoutConstraintModel.calcY(supporter.y, sSize.h, nSize.h);
    var positions = [];
    var mode = AutoLayoutConstraintModel.getPlacementMode(supporter.type, newType);
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();

    var baseLeft = supporter.x;
    var baseRight = supporter.x + sSize.w;
    var baseCenter = supporter.x + sSize.w / 2;
    var newHalfW = nSize.w / 2;

    var candidateX = [];

    if (["华拱", "昂", "耍头"].includes(newType)) {
      candidateX.push(baseCenter - newHalfW);
      candidateX.push(baseLeft + sSize.w * 0.15 - newHalfW);
      candidateX.push(baseRight - sSize.w * 0.15 - newHalfW);
      candidateX.push(baseLeft + sSize.w * 0.35 - newHalfW);
      candidateX.push(baseRight - sSize.w * 0.35 - newHalfW);
      candidateX.push(axis - newHalfW);

      var spread = Math.max(sSize.w * 0.6, 120);
      candidateX.push(axis - spread * 0.5 - newHalfW);
      candidateX.push(axis + spread * 0.5 - newHalfW);
      candidateX.push(axis - spread - newHalfW);
      candidateX.push(axis + spread - newHalfW);
    }

    if (newType === "散斗") {
      candidateX.push(baseCenter - newHalfW);
      candidateX.push(baseLeft + AutoLayoutConstraintModel.END_OFFSET - newHalfW);
      candidateX.push(baseRight - AutoLayoutConstraintModel.END_OFFSET - newHalfW);
      candidateX.push(baseLeft + sSize.w * 0.25 - newHalfW);
      candidateX.push(baseRight - sSize.w * 0.25 - newHalfW);
      candidateX.push(axis - newHalfW);

      var offsetSteps = [40, 60, 80, 100, 120, 140];
      for (var os = 0; os < offsetSteps.length; os++) {
        candidateX.push(axis - offsetSteps[os] - newHalfW);
        candidateX.push(axis + offsetSteps[os] - newHalfW);
      }
    }

    if (newType === "栌斗") {
      candidateX.push(baseCenter - newHalfW);
      candidateX.push(axis - newHalfW);
    }

    candidateX = candidateX.map(function(x) { return Math.round(x); });

    var seen = {};
    var uniqueX = [];
    for (var i = 0; i < candidateX.length; i++) {
      if (!seen[candidateX[i]]) {
        seen[candidateX[i]] = true;
        uniqueX.push(candidateX[i]);
      }
    }

    for (var j = 0; j < uniqueX.length; j++) {
      var x = uniqueX[j];
      var direction = "正";
      var centerX = x + newHalfW;
      if (["昂", "耍头", "华拱"].includes(newType)) {
        if (Math.abs(centerX - axis) < 20) direction = "正";
        else if (centerX < axis) direction = "左挑";
        else direction = "右挑";
      }
      positions.push({ x: x, y: y, dir: direction });
    }

    var validPositions = [];
    for (var k = 0; k < positions.length; k++) {
      var testPart = makePart(newType, positions[k].x, positions[k].y, layer, positions[k].dir);
      if (!AutoLayoutConstraintModel.isValidPlacement(testPart, existingScheme)) continue;

      var supporterCheck = AutoLayoutConstraintModel.findBestSupporter(testPart, existingScheme, true);
      if (!supporterCheck || supporterCheck.overlapX < 12) continue;

      validPositions.push(positions[k]);
    }

    return validPositions;
  }

  function collectCandidatesForLayer(layer, allLowerParts, existingScheme, partsPerLayer, symmetric) {
    var preferredTypes = AutoLayoutConstraintModel.getPreferredTypes(layer);
    var candidates = [];
    var existingOnLayer = existingScheme.filter(function(p) { return p.layer === layer; }).length;
    var densityBonus = calcLayerDensityWeights(partsPerLayer, existingOnLayer, layer);

    var supporterPool = allLowerParts.slice();

    if (layer > 3) {
      var extraLayers = existingScheme.filter(function(p) {
        return p.layer < layer && p.layer >= layer - 3;
      });
      for (var e = 0; e < extraLayers.length; e++) {
        if (!supporterPool.includes(extraLayers[e])) {
          supporterPool.push(extraLayers[e]);
        }
      }
    }

    var centerAxis = AutoLayoutConstraintModel.getSymmetryAxis();

    for (var si = 0; si < supporterPool.length; si++) {
      var supporter = supporterPool[si];

      for (var ti = 0; ti < preferredTypes.length; ti++) {
        var newType = preferredTypes[ti];

        if (!AssemblyRules.canSupport(supporter.type, newType)) continue;

        var positions = collectExtendedCandidatePositions(newType, supporter, existingScheme.concat(candidates), layer);

        for (var pi = 0; pi < positions.length; pi++) {
          var pos = positions[pi];
          var candidate = makePart(newType, pos.x, pos.y, layer, pos.dir);

          if (!AutoLayoutConstraintModel.isValidPlacement(candidate, existingScheme.concat(candidates))) {
            continue;
          }

          var directSupporter = AutoLayoutConstraintModel.findBestSupporter(candidate, existingScheme.concat(candidates), true);
          if (!directSupporter || directSupporter.overlapX < 12) continue;

          var nSize = AssemblyRules.getSize(candidate.type);
          var cCenterX = candidate.x + nSize.w / 2;
          var distFromAxis = Math.abs(cCenterX - centerAxis);

          var typeMatchBonus = (layer % 2 === 0 && ["华拱", "昂"].includes(newType)) ? 40 :
                               (layer % 2 === 1 && ["散斗", "耍头"].includes(newType)) ? 40 : 0;

          candidate._supporterId = directSupporter.part.id;
          candidate._supporterLayer = directSupporter.part.layer;
          candidate._supportScore = directSupporter.score;
          candidate._isDirectLayer = directSupporter.isDirectLayer;
          candidate._priority = ti;
          candidate._typeBonus = typeMatchBonus;
          candidate._axisDist = distFromAxis;
          candidate._densityBonus = densityBonus;
          candidate._combinedScore =
            typeMatchBonus +
            directSupporter.score * 0.5 +
            (directSupporter.isDirectLayer ? 80 : 0) +
            densityBonus * 30 -
            ti * 20 -
            distFromAxis * 0.08;

          var isDuplicate = candidates.some(function(c) {
            return c.type === candidate.type &&
                   Math.abs(c.x - candidate.x) < 25 &&
                   Math.abs(c.y - candidate.y) < 15;
          });
          if (!isDuplicate) {
            candidates.push(candidate);
          }
        }
      }
    }

    return candidates;
  }

  function selectCandidatesWithQuantity(candidates, partsPerLayer, symmetric, existingScheme) {
    if (candidates.length === 0) return [];

    var target = partsPerLayer;
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();

    candidates.sort(function(a, b) {
      if (b._combinedScore !== a._combinedScore) return b._combinedScore - a._combinedScore;
      return a._axisDist - b._axisDist;
    });

    var selected = [];
    var selectedCenters = new Set();
    var maxPrimary = symmetric ? Math.max(2, Math.ceil(target / 2) + 2) : target;
    var centerBias = [];
    var offCenterBias = [];
    var nSize;

    for (var ci = 0; ci < candidates.length; ci++) {
      nSize = AssemblyRules.getSize(candidates[ci].type);
      var c = candidates[ci];
      var cCenter = Math.round(c.x + nSize.w / 2);
      var isOnAxis = Math.abs(cCenter - axis) < 15;
      if (isOnAxis) centerBias.push(c);
      else offCenterBias.push(c);
    }

    var orderedCandidates = centerBias.concat(offCenterBias);
    var processedX = new Set();
    var minGapByType = { "栌斗": 55, "华拱": 90, "昂": 75, "耍头": 65, "散斗": 35 };

    var attempt = 0;
    var selectionStrategies = [
      { gapScale: 1.0, requireSupport: true, maxDuplicateType: 4 },
      { gapScale: 0.75, requireSupport: true, maxDuplicateType: 6 },
      { gapScale: 0.6, requireSupport: false, maxDuplicateType: 8 },
      { gapScale: 0.4, requireSupport: false, maxDuplicateType: 12 }
    ];

    while (selected.length < maxPrimary && attempt < selectionStrategies.length) {
      var strategy = selectionStrategies[attempt];

      for (var i = 0; i < orderedCandidates.length && selected.length < maxPrimary; i++) {
        var c = orderedCandidates[i];

        nSize = AssemblyRules.getSize(c.type);
        var cCenterX = Math.round(c.x + nSize.w / 2);
        var minGap = (minGapByType[c.type] || 40) * strategy.gapScale;

        var hasConflict = false;
        for (var sc = 0; sc < selected.length; sc++) {
          var sel = selected[sc];
          var selSize = AssemblyRules.getSize(sel.type);
          var selCenter = Math.round(sel.x + selSize.w / 2);

          if (c.type === sel.type) {
            var gap = Math.abs(selCenter - cCenterX);
            if (gap < minGap) { hasConflict = true; break; }
          }

          if (!AutoLayoutConstraintModel.isValidPlacement(c, existingScheme.concat([sel]))) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) continue;

        if (strategy.requireSupport) {
          var hasSup = AutoLayoutConstraintModel.hasAdequateSupport(c, existingScheme.concat(selected));
          if (!hasSup) {
            var bestSup = AutoLayoutConstraintModel.findBestSupporter(c, existingScheme.concat(selected), false);
            if (!bestSup || bestSup.overlapX < 10) continue;
          }
        }

        var isOnAxis2 = Math.abs(cCenterX - axis) < 15;
        var selectedAlready = selected.some(function(s) {
          return s.type === c.type && Math.abs(s.x - c.x) < minGap * 0.6;
        });
        if (selectedAlready) continue;

        var typeCount = selected.filter(function(s) { return s.type === c.type; }).length;
        if (typeCount >= strategy.maxDuplicateType) continue;

        selected.push(c);
        selectedCenters.add(Math.round(cCenterX / 5) * 5);
      }

      attempt++;
    }

    return selected;
  }

  function addSymmetryMirrorsWithCheck(selected, existingScheme, partsPerLayer) {
    var result = selected.slice();
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var currentCount = result.length;
    var maxTotal = partsPerLayer;

    for (var i = 0; i < selected.length && currentCount < maxTotal; i++) {
      var mirrored = AutoLayoutConstraintModel.mirrorPart(selected[i]);
      if (!mirrored) continue;

      var nSize = AssemblyRules.getSize(mirrored.type);
      var cCenterX = mirrored.x + nSize.w / 2;
      var isOnAxis = Math.abs(cCenterX - axis) < 15;
      if (isOnAxis) continue;

      var alreadyMirrored = result.some(function(r) {
        return r.id === mirrored.id || (
          r.type === mirrored.type &&
          r.layer === mirrored.layer &&
          Math.abs(r.x - mirrored.x) < 30
        );
      });
      if (alreadyMirrored) continue;

      var conflict = false;
      for (var j = 0; j < result.length; j++) {
        if (!AutoLayoutConstraintModel.isValidPlacement(mirrored, existingScheme.concat([result[j]]))) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      if (!AutoLayoutConstraintModel.hasAdequateSupport(mirrored, existingScheme.concat(result))) {
        continue;
      }

      mirrored._supporterId = selected[i]._supporterId;
      mirrored._combinedScore = (selected[i]._combinedScore || 50) - 5;
      result.push(mirrored);
      currentCount++;
    }

    return result;
  }

  function fillConnectStrings(parts, scheme) {
    for (var i = 0; i < parts.length; i++) {
      var existing = scheme.filter(function(p) { return p.id !== parts[i].id; });
      parts[i].connect = AutoLayoutConstraintModel.generateConnectString(parts[i], existing);
    }
  }

  function cleanupTransientFields(part) {
    delete part._supporterId;
    delete part._supporterLayer;
    delete part._supportScore;
    delete part._isDirectLayer;
    delete part._priority;
    delete part._typeBonus;
    delete part._axisDist;
    delete part._densityBonus;
    delete part._combinedScore;
    delete part._totalOverlap;
  }

  function buildQuantitySupplementCandidates(layer, existingScheme, selected) {
    var preferredTypes = AutoLayoutConstraintModel.getPreferredTypes(layer);
    var lowerParts = existingScheme.filter(function(p) {
      return p.layer < layer && p.layer >= layer - AssemblyRules.MAX_SUPPORT_SEARCH_LAYERS;
    });
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var candidates = [];
    var yOffsets = [0, -42, 40, -84, -126, -21, 21, -63, -105];

    for (var si = 0; si < lowerParts.length; si++) {
      var supporter = lowerParts[si];
      var sSize = AssemblyRules.getSize(supporter.type);
      var sCenter = supporter.x + sSize.w / 2;

      for (var ti = 0; ti < preferredTypes.length; ti++) {
        var type = preferredTypes[ti];
        if (!AssemblyRules.canSupport(supporter.type, type)) continue;

        var nSize = AssemblyRules.getSize(type);
        var baseY = AutoLayoutConstraintModel.calcY(supporter.y, sSize.h, nSize.h);
        var baseX = Math.round(sCenter - nSize.w / 2);
        var lateralOffsets = [
          0,
          -Math.round(Math.min(36, nSize.w * 0.25)),
          Math.round(Math.min(36, nSize.w * 0.25)),
          -Math.round(Math.min(64, nSize.w * 0.45)),
          Math.round(Math.min(64, nSize.w * 0.45))
        ];

        for (var yi = 0; yi < yOffsets.length; yi++) {
          for (var xi = 0; xi < lateralOffsets.length; xi++) {
            var x = baseX + lateralOffsets[xi];
            var y = baseY + yOffsets[yi];
            var centerX = x + nSize.w / 2;
            var dir = "正";

            if (["昂", "耍头", "华拱"].includes(type)) {
              if (centerX < axis - 20) dir = "左挑";
              else if (centerX > axis + 20) dir = "右挑";
            }

            var candidate = makePart(type, x, y, layer, dir);
            var comparisonScheme = existingScheme.concat(selected, candidates);
            if (!AutoLayoutConstraintModel.isValidPlacement(candidate, comparisonScheme)) continue;

            var best = AutoLayoutConstraintModel.findBestSupporter(candidate, comparisonScheme, true);
            if (!best || !best.isEnough) continue;

            candidate._combinedScore =
              (best.isDirectLayer ? 200 : 80) +
              best.score -
              ti * 25 -
              Math.abs(centerX - axis) * 0.05 -
              Math.abs(yOffsets[yi]) * 0.2;
            candidates.push(candidate);
          }
        }
      }
    }

    candidates.sort(function(a, b) {
      return (b._combinedScore || 0) - (a._combinedScore || 0);
    });
    return candidates;
  }

  function supplementLayerQuantity(layer, existingScheme, selected, partsPerLayer) {
    var result = selected.slice();
    if (result.length >= partsPerLayer) return result.slice(0, partsPerLayer);

    var candidates = buildQuantitySupplementCandidates(layer, existingScheme, result);
    for (var i = 0; i < candidates.length && result.length < partsPerLayer; i++) {
      var candidate = candidates[i];
      if (!AutoLayoutConstraintModel.isValidPlacement(candidate, existingScheme.concat(result))) continue;

      var best = AutoLayoutConstraintModel.findBestSupporter(candidate, existingScheme.concat(result), true);
      if (!best || !best.isEnough) continue;

      var duplicate = result.some(function(part) {
        return part.type === candidate.type &&
          Math.abs(part.x - candidate.x) < 4 &&
          Math.abs(part.y - candidate.y) < 4;
      });
      if (duplicate) continue;

      result.push(candidate);
    }
    return result;
  }

  function tryFillLayerStrict(layer, allScheme, partsPerLayer, symmetric, maxAttempts) {
    var currentLayerParts = allScheme.filter(function(p) { return p.layer === layer; });
    var bestResult = currentLayerParts.slice();
    var bestScore = -Infinity;
    var target = partsPerLayer;
    if (layer === 1) target = 1;

    var supporterRangeStrategies = [1, 2, 3];
    var strictnessModes = ["strict", "normal", "loose"];

    for (var sri = 0; sri < supporterRangeStrategies.length; sri++) {
      for (var mode = 0; mode < strictnessModes.length; mode++) {
        var maxLayerDist = supporterRangeStrategies[sri];
        var strictMode = strictnessModes[mode];
        var allLowerParts = allScheme.filter(function(p) {
          return p.layer < layer && p.layer >= layer - maxLayerDist;
        });

        if (allLowerParts.length === 0) continue;

        var workingScheme = allScheme.filter(function(p) { return p.layer !== layer; });
        workingScheme = workingScheme.concat(bestResult);

        var candidates = collectCandidatesForLayer(
          layer, allLowerParts, workingScheme, partsPerLayer, symmetric
        );

        if (candidates.length === 0) continue;

        var selected = selectCandidatesWithQuantity(candidates, partsPerLayer, symmetric, workingScheme);

        if (symmetric) {
          selected = addSymmetryMirrorsWithCheck(selected, workingScheme, partsPerLayer);
        }

        if (selected.length > target) {
          selected.sort(function(a, b) {
            return (b._combinedScore || 0) - (a._combinedScore || 0);
          });
          selected = selected.slice(0, target);
        }

        var filledScheme = workingScheme.concat(selected);
        var quickCheck = AutoLayoutConflictDetector.quickCheck(filledScheme);
        var layerCount = selected.length;

        var quantityWeight = strictMode === "strict" ? 250 : (strictMode === "normal" ? 200 : 150);
        var penaltyWeight = strictMode === "strict" ? 80 : (strictMode === "normal" ? 40 : 15);

        var quantityScore = layerCount >= target ? quantityWeight : (layerCount / target) * quantityWeight;
        var qualityBonus = 0;
        if (quickCheck.isClean) qualityBonus += 80;
        qualityBonus -= quickCheck.overlap * penaltyWeight;
        qualityBonus -= quickCheck.suspension * penaltyWeight * 1.5;
        qualityBonus -= quickCheck.insufficientSupport * (penaltyWeight * 0.5);

        var score = quantityScore + qualityBonus + qualityBonus;

        var meetsTarget = layerCount >= target;
        var acceptableQuality = strictMode !== "strict" || quickCheck.total <= 2;
        var isBest = score > bestScore || (meetsTarget && acceptableQuality && bestResult.length < target);

        if (isBest) {
          bestScore = score;
          bestResult = selected.slice();
        }

        if (layerCount >= target && quickCheck.total <= 1) {
          return bestResult;
        }
        if (meetsTarget && acceptableQuality) {
          break;
        }
      }
      if (bestResult.length >= target) break;
    }

    return bestResult;
  }

  function postProcessFullScheme(scheme, config) {
    var processed = scheme.map(function(p) { return Object.assign({}, p); });
    var targetLayers = config.targetLayers;
    var partsPerLayer = config.partsPerLayer;

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < processed.length; i++) {
        if (processed[i].layer > 1) {
          var best = AutoLayoutConstraintModel.findBestSupporter(processed[i], processed, true);
          if (best && best.part) {
            var nSize = AssemblyRules.getSize(processed[i].type);
            var sSize = AssemblyRules.getSize(best.part.type);
            var targetY = AutoLayoutConstraintModel.calcY(best.part.y, sSize.h, nSize.h);

            if (Math.abs(processed[i].y - targetY) > 3) {
              var adjusted = Object.assign({}, processed[i], { y: targetY });
              var others = processed.filter(function(p) { return p.id !== processed[i].id; });
              if (AutoLayoutConstraintModel.isValidPlacement(adjusted, others)) {
                processed[i].y = targetY;
              }
            }
          }
        }
      }
    }

    fillConnectStrings(processed, processed);

    return processed;
  }

  function generateScheme(config) {
    var targetLayers = config.targetLayers || 4;
    var partsPerLayer = config.partsPerLayer || 3;
    var symmetric = !!config.symmetric;
    var baseConnect = config.baseConnect || "柱头";

    var scheme = [];

    var ludouW = AssemblyRules.getSize("栌斗").w;
    var ludou = makePart(
      "栌斗",
      AutoLayoutConstraintModel.CENTER_X - ludouW / 2,
      AutoLayoutConstraintModel.BASE_Y,
      1,
      "正",
      baseConnect
    );
    scheme.push(ludou);

    var lastLayerWithParts = 1;

    for (var layer = 2; layer <= targetLayers; layer++) {
      var selected = tryFillLayerStrict(layer, scheme, partsPerLayer, symmetric, 4);

      if (selected.length < partsPerLayer) {
        selected = fallbackFillLayer(layer, scheme, partsPerLayer, symmetric);
      }

      if (selected.length < partsPerLayer) {
        selected = supplementLayerQuantity(layer, scheme, selected, partsPerLayer);
      }

      if (selected.length === 0) {
        continue;
      }

      if (selected.length > partsPerLayer) {
        selected = selected.slice(0, partsPerLayer);
      }

      fillConnectStrings(selected, scheme);

      for (var i = 0; i < selected.length; i++) {
        cleanupTransientFields(selected[i]);
        scheme.push(selected[i]);
      }

      lastLayerWithParts = layer;
    }

    scheme = postProcessFullScheme(scheme, config);

    return scheme;
  }

  function fallbackFillLayer(layer, existingScheme, partsPerLayer, symmetric) {
    var preferredTypes = AutoLayoutConstraintModel.getPreferredTypes(layer);
    var allLowerParts = existingScheme.filter(function(p) {
      return p.layer >= Math.max(1, layer - 3) && p.layer < layer;
    });
    if (allLowerParts.length === 0) return [];

    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var candidates = [];

    for (var si = 0; si < allLowerParts.length; si++) {
      var supp = allLowerParts[si];

      for (var ti = 0; ti < preferredTypes.length; ti++) {
        var nType = preferredTypes[ti];
        if (!AssemblyRules.canSupport(supp.type, nType)) continue;

        var sSize = AssemblyRules.getSize(supp.type);
        var nSize = AssemblyRules.getSize(nType);
        var y = AutoLayoutConstraintModel.calcY(supp.y, sSize.h, nSize.h);

        var xPositions = [];
        var sLeft = supp.x;
        var sRight = supp.x + sSize.w;
        var sCenter = supp.x + sSize.w / 2;

        xPositions.push(sCenter - nSize.w / 2);
        xPositions.push(sLeft + sSize.w * 0.1 - nSize.w / 2);
        xPositions.push(sLeft + sSize.w * 0.2 - nSize.w / 2);
        xPositions.push(sLeft + sSize.w * 0.3 - nSize.w / 2);
        xPositions.push(sRight - sSize.w * 0.1 - nSize.w / 2);
        xPositions.push(sRight - sSize.w * 0.2 - nSize.w / 2);
        xPositions.push(sRight - sSize.w * 0.3 - nSize.w / 2);
        xPositions.push(sLeft - nSize.w * 0.2);
        xPositions.push(sLeft - nSize.w * 0.6);
        xPositions.push(sLeft - nSize.w * 1.1);
        xPositions.push(sRight - nSize.w * 0.8);
        xPositions.push(sRight - nSize.w * 0.4);
        xPositions.push(sRight + nSize.w * 0.1);
        xPositions.push(axis - nSize.w / 2);
        xPositions.push(axis - 30 - nSize.w / 2);
        xPositions.push(axis + 30 - nSize.w / 2);
        xPositions.push(axis - 60 - nSize.w / 2);
        xPositions.push(axis + 60 - nSize.w / 2);
        xPositions.push(axis - 90 - nSize.w / 2);
        xPositions.push(axis + 90 - nSize.w / 2);
        xPositions.push(axis - 120 - nSize.w / 2);
        xPositions.push(axis + 120 - nSize.w / 2);
        xPositions.push(axis - 150 - nSize.w / 2);
        xPositions.push(axis + 150 - nSize.w / 2);
        xPositions.push(axis - 180 - nSize.w / 2);
        xPositions.push(axis + 180 - nSize.w / 2);
        xPositions.push(axis - 210 - nSize.w / 2);
        xPositions.push(axis + 210 - nSize.w / 2);

        xPositions = xPositions.map(function(x) { return Math.round(x); });
        var seen = {};
        xPositions = xPositions.filter(function(x) {
          if (seen[x]) return false;
          seen[x] = true;
          return true;
        });

        for (var xi = 0; xi < xPositions.length; xi++) {
          var dir = "正";
          var centerX = xPositions[xi] + nSize.w / 2;
          if (["昂", "耍头", "华拱"].includes(nType)) {
            if (centerX < axis - 20) dir = "左挑";
            else if (centerX > axis + 20) dir = "右挑";
          }

          var cand = makePart(nType, xPositions[xi], y, layer, dir);
          if (!AutoLayoutConstraintModel.isValidPlacement(cand, existingScheme.concat(candidates))) continue;

          var allSup = AutoLayoutConstraintModel.findAllSupporters(cand, existingScheme.concat(candidates));
          var directSup = allSup.filter(function(s) { return s.isDirectLayer; });
          var useSup = directSup.length > 0 ? directSup : allSup;
          if (useSup.length === 0) continue;

          var totalOverlap = useSup.reduce(function(acc, s) { return acc + s.overlapX; }, 0);
          var overlapRatio = nSize.w > 0 ? totalOverlap / nSize.w : 0;

          if (totalOverlap < 14 && overlapRatio < 0.22) continue;

          var primaryScore = useSup.length > 0 ? useSup[0].score : 0;
          cand._combinedScore = primaryScore * 1.0 + totalOverlap * 0.5 - (overlapRatio < 0.3 ? 100 : 0);
          cand._axisDist = Math.abs(centerX - axis);
          cand._totalOverlap = totalOverlap;
          candidates.push(cand);
        }
      }
    }

    candidates.sort(function(a, b) {
      if (b._combinedScore !== a._combinedScore) return (b._combinedScore || 0) - (a._combinedScore || 0);
      return (a._axisDist || 0) - (b._axisDist || 0);
    });

    var maxSelect = symmetric ? Math.ceil(partsPerLayer / 2) + 3 : partsPerLayer;
    var selected = [];
    var minGap = { "栌斗": 48, "华拱": 75, "昂": 65, "耍头": 55, "散斗": 28 };

    for (var ci = 0; ci < candidates.length && selected.length < maxSelect; ci++) {
      var c = candidates[ci];
      var cSize = AssemblyRules.getSize(c.type);
      var cCenter = c.x + cSize.w / 2;
      var typeMinGap = minGap[c.type] || 30;

      var conflict = false;
      for (var si = 0; si < selected.length; si++) {
        var s = selected[si];
        var sSize = AssemblyRules.getSize(s.type);
        var sCenter = s.x + sSize.w / 2;
        if (s.type === c.type && Math.abs(sCenter - cCenter) < typeMinGap * 0.6) { conflict = true; break; }
        if (Math.abs(sCenter - cCenter) < 24) { conflict = true; break; }
        if (!AutoLayoutConstraintModel.isValidPlacement(c, existingScheme.concat([s]))) { conflict = true; break; }
      }
      if (conflict) continue;

      selected.push(c);
    }

    if (symmetric) {
      selected = addSymmetryMirrorsWithCheck(selected, existingScheme, partsPerLayer);
    }

    if (selected.length > partsPerLayer) {
      selected.sort(function(a, b) { return (b._combinedScore || 0) - (a._combinedScore || 0); });
      selected = selected.slice(0, partsPerLayer);
    }

    return selected;
  }

  function repairScheme(scheme, config) {
    var originalScheme = scheme.slice().map(function(p) { return Object.assign({}, p); });
    var repaired = scheme.slice().map(function(p) { return Object.assign({}, p); });
    var targetLayers = config.targetLayers || 4;
    var partsPerLayer = config.partsPerLayer || 3;
    var symmetric = !!config.symmetric;

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < repaired.length; i++) {
        if (repaired[i].layer > 1) {
          var best = AutoLayoutConstraintModel.findBestSupporter(repaired[i], repaired, true);
          if (best && best.part) {
            var nSize = AssemblyRules.getSize(repaired[i].type);
            var sSize = AssemblyRules.getSize(best.part.type);
            repaired[i].y = AutoLayoutConstraintModel.calcY(best.part.y, sSize.h, nSize.h);
          }
        }
      }
    }

    for (var j = 0; j < repaired.length; j++) {
      repaired[j].connect = AutoLayoutConstraintModel.generateConnectString(
        repaired[j],
        repaired.filter(function(p) { return p.id !== repaired[j].id; })
      );
    }

    if (symmetric) {
      var axis = AutoLayoutConstraintModel.getSymmetryAxis();
      var toAdd = [];
      var byLayer = {};
      for (var k = 0; k < repaired.length; k++) {
        var p = repaired[k];
        if (!byLayer[p.layer]) byLayer[p.layer] = [];
        byLayer[p.layer].push(p);
      }

      var layers = Object.keys(byLayer).map(Number).sort();
      for (var li = 0; li < layers.length; li++) {
        var layer = layers[li];
        var parts = byLayer[layer];

        for (var m = 0; m < parts.length; m++) {
          var part = parts[m];
          var pSize = AssemblyRules.getSize(part.type);
          var pCenter = part.x + pSize.w / 2;
          if (Math.abs(pCenter - axis) < 15) continue;

          var hasPair = repaired.some(function(q) {
            if (q.layer !== part.layer || q.type !== part.type || q.id === part.id) return false;
            var qSize = AssemblyRules.getSize(q.type);
            var qCenter = q.x + qSize.w / 2;
            return Math.abs(qCenter - (2 * axis - pCenter)) < 20;
          });

          if (!hasPair) {
            var mirrored = AutoLayoutConstraintModel.mirrorPart(part);
            if (mirrored && AutoLayoutConstraintModel.isValidPlacement(mirrored, repaired.concat(toAdd))) {
              if (AutoLayoutConstraintModel.hasAdequateSupport(mirrored, repaired.concat(toAdd))) {
                mirrored.connect = AutoLayoutConstraintModel.generateConnectString(
                  mirrored, repaired.concat(toAdd)
                );
                toAdd.push(mirrored);
              }
            }
          }
        }
      }

      repaired = repaired.concat(toAdd);
    }

    return repaired;
  }

  return {
    generateScheme: generateScheme,
    repairScheme: repairScheme
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutEngine };
