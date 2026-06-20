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

  function collectCandidatesForLayer(layer, supporters, existingScheme, partsPerLayer, symmetric) {
    var preferredTypes = AutoLayoutConstraintModel.getPreferredTypes(layer);
    var candidates = [];
    var usedSupporterSlots = {};

    for (var si = 0; si < supporters.length; si++) {
      var supporter = supporters[si];

      for (var ti = 0; ti < preferredTypes.length; ti++) {
        var newType = preferredTypes[ti];

        if (!AssemblyRules.canSupport(supporter.type, newType)) continue;

        var slotKey = supporter.id + "->" + newType;
        if (usedSupporterSlots[slotKey]) continue;

        var positions = AutoLayoutConstraintModel.calcPositions(newType, supporter, existingScheme.concat(candidates));

        for (var pi = 0; pi < positions.length; pi++) {
          var pos = positions[pi];
          var candidate = makePart(newType, pos.x, pos.y, layer, pos.dir);

          if (!AutoLayoutConstraintModel.isValidPlacement(candidate, existingScheme.concat(candidates))) {
            continue;
          }

          if (!AutoLayoutConstraintModel.hasAdequateSupport(candidate, existingScheme.concat(candidates))) {
            continue;
          }

          candidate._supporterId = supporter.id;
          candidate._supporterType = supporter.type;
          candidate._priority = ti;
          candidate._supportScore = AutoLayoutConstraintModel.findBestSupporter(
            candidate, existingScheme.concat(candidates)
          ) ? AutoLayoutConstraintModel.findBestSupporter(candidate, existingScheme.concat(candidates)).score : 0;
          candidates.push(candidate);
        }

        if (positions.length > 0) usedSupporterSlots[slotKey] = true;
      }
    }

    return candidates;
  }

  function scoreCandidate(candidate, existingScheme) {
    var score = 0;

    score -= candidate._priority * 50;

    var supporter = AutoLayoutConstraintModel.findBestSupporter(candidate, existingScheme);
    if (supporter) {
      score += supporter.score;
      if (supporter.isEnough) score += 200;
    }

    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var nSize = AssemblyRules.getSize(candidate.type);
    var cCenterX = candidate.x + nSize.w / 2;
    var distFromAxis = Math.abs(cCenterX - axis);
    score -= distFromAxis * 0.1;

    if (candidate.layer % 2 === 0) {
      if (["华拱", "昂", "耍头"].includes(candidate.type)) score += 30;
    } else {
      if (["散斗", "耍头"].includes(candidate.type)) score += 30;
    }

    return score;
  }

  function selectOptimalCandidates(candidates, partsPerLayer, symmetric, existingScheme) {
    if (candidates.length === 0) return [];

    candidates.forEach(function(c) {
      c._combinedScore = scoreCandidate(c, existingScheme.concat(candidates));
    });

    candidates.sort(function(a, b) {
      if (b._combinedScore !== a._combinedScore) return b._combinedScore - a._combinedScore;
      return a.x - b.x;
    });

    var maxPrimary = symmetric ? Math.ceil(partsPerLayer / 2) : partsPerLayer;
    var selected = [];
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var selectedAxes = new Set();

    for (var i = 0; i < candidates.length; i++) {
      if (selected.length >= maxPrimary) break;

      var c = candidates[i];
      var nSize = AssemblyRules.getSize(c.type);
      var cCenterX = c.x + nSize.w / 2;
      var isOnAxis = Math.abs(cCenterX - axis) < 5;

      var hasConflict = selected.some(function(s) {
        return !AutoLayoutConstraintModel.isValidPlacement(c, existingScheme.concat(selected));
      });
      if (hasConflict) continue;

      if (!isOnAxis && symmetric) {
        var mirroredCenter = 2 * axis - cCenterX;
        var mirrorKey = Math.round(mirroredCenter);
        if (selectedAxes.has(mirrorKey)) continue;
      }

      var hasAdequate = AutoLayoutConstraintModel.hasAdequateSupport(c, existingScheme.concat(selected));
      if (!hasAdequate) continue;

      if (isOnAxis) {
        selectedAxes.add(Math.round(cCenterX));
      } else if (symmetric) {
        selectedAxes.add(Math.round(cCenterX));
      }

      selected.push(c);
    }

    return selected;
  }

  function addSymmetryMirrors(selected, existingScheme) {
    var result = selected.slice();
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();

    for (var i = 0; i < selected.length; i++) {
      var mirrored = AutoLayoutConstraintModel.mirrorPart(selected[i]);
      if (!mirrored) continue;

      var nSize = AssemblyRules.getSize(mirrored.type);
      var cCenterX = mirrored.x + nSize.w / 2;
      var isOnAxis = Math.abs(cCenterX - axis) < 5;
      if (isOnAxis) continue;

      var alreadyMirrored = result.some(function(r) {
        return r.id === mirrored.id || (
          r.type === mirrored.type &&
          r.layer === mirrored.layer &&
          Math.abs(r.x - mirrored.x) < 10
        );
      });
      if (alreadyMirrored) continue;

      if (!AutoLayoutConstraintModel.isValidPlacement(mirrored, existingScheme.concat(result))) {
        continue;
      }

      if (!AutoLayoutConstraintModel.hasAdequateSupport(mirrored, existingScheme.concat(result))) {
        continue;
      }

      mirrored._supporterId = selected[i]._supporterId;
      mirrored._priority = selected[i]._priority;
      result.push(mirrored);
    }
    return result;
  }

  function fillConnectStrings(parts, scheme) {
    for (var i = 0; i < parts.length; i++) {
      var existing = scheme.filter(function(p) { return p.id !== parts[i].id; });
      parts[i].connect = AutoLayoutConstraintModel.generateConnectString(parts[i], existing);
    }
  }

  function tryFillLayer(layer, currentScheme, partsPerLayer, symmetric, maxAttempts) {
    var supporters = currentScheme.filter(function(p) { return p.layer === layer - 1; });
    if (supporters.length === 0) return [];

    var bestResult = null;
    var bestScore = -Infinity;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var candidates = collectCandidatesForLayer(layer, supporters, currentScheme, partsPerLayer, symmetric);
      if (candidates.length === 0) continue;

      var selected = selectOptimalCandidates(candidates, partsPerLayer, symmetric, currentScheme);

      if (symmetric) {
        selected = addSymmetryMirrors(selected, currentScheme);
      }

      if (selected.length > partsPerLayer) {
        selected.sort(function(a, b) {
          return (b._combinedScore || 0) - (a._combinedScore || 0);
        });
        selected = selected.slice(0, partsPerLayer);
      }

      var quickCheck = AutoLayoutConflictDetector.quickCheck(currentScheme.concat(selected));
      var score = selected.length * 100 - quickCheck.total * 50;

      if (score > bestScore) {
        bestScore = score;
        bestResult = selected.slice();
      }

      if (quickCheck.total === 0 && selected.length >= Math.min(partsPerLayer, 2)) {
        break;
      }
    }

    return bestResult || [];
  }

  function postProcessScheme(scheme) {
    var processed = scheme.map(function(p) { return Object.assign({}, p); });

    for (var i = 0; i < processed.length; i++) {
      if (processed[i].layer > 1) {
        var best = AutoLayoutConstraintModel.findBestSupporter(processed[i], processed);
        if (best) {
          var nSize = AssemblyRules.getSize(processed[i].type);
          var sSize = AssemblyRules.getSize(best.part.type);
          var targetY = AutoLayoutConstraintModel.calcY(best.part.y, sSize.h, nSize.h);

          if (Math.abs(processed[i].y - targetY) > 5) {
            processed[i].y = targetY;
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

    for (var layer = 2; layer <= targetLayers; layer++) {
      var selected = tryFillLayer(layer, scheme, partsPerLayer, symmetric, 3);

      if (selected.length === 0 && layer > 3) {
        var extendedSupporters = scheme.filter(function(p) {
          return p.layer >= layer - 2 && p.layer < layer;
        });
        if (extendedSupporters.length > 0) {
          var candidates = collectCandidatesForLayer(layer, extendedSupporters, scheme, partsPerLayer, symmetric);
          selected = selectOptimalCandidates(candidates, partsPerLayer, symmetric, scheme);
          if (symmetric) {
            selected = addSymmetryMirrors(selected, scheme);
          }
        }
      }

      if (selected.length === 0) {
        continue;
      }

      fillConnectStrings(selected, scheme);

      for (var i = 0; i < selected.length; i++) {
        delete selected[i]._supporterId;
        delete selected[i]._supporterType;
        delete selected[i]._priority;
        delete selected[i]._supportScore;
        delete selected[i]._combinedScore;
        scheme.push(selected[i]);
      }
    }

    scheme = postProcessScheme(scheme);

    return scheme;
  }

  function repairScheme(scheme, config) {
    var repaired = scheme.slice().map(function(p) { return Object.assign({}, p); });
    var targetLayers = config.targetLayers || 4;
    var partsPerLayer = config.partsPerLayer || 3;
    var symmetric = !!config.symmetric;

    var byLayer = {};
    for (var i = 0; i < repaired.length; i++) {
      if (!byLayer[repaired[i].layer]) byLayer[repaired[i].layer] = [];
      byLayer[repaired[i].layer].push(repaired[i]);
    }

    for (var j = 0; j < repaired.length; j++) {
      if (repaired[j].layer > 1) {
        var best = AutoLayoutConstraintModel.findBestSupporter(repaired[j], repaired);
        if (best && best.part) {
          var nSize = AssemblyRules.getSize(repaired[j].type);
          var sSize = AssemblyRules.getSize(best.part.type);
          repaired[j].y = AutoLayoutConstraintModel.calcY(best.part.y, sSize.h, nSize.h);
        }
      }
    }

    for (var k = 0; k < repaired.length; k++) {
      repaired[k].connect = AutoLayoutConstraintModel.generateConnectString(
        repaired[k],
        repaired.filter(function(p) { return p.id !== repaired[k].id; })
      );
    }

    if (symmetric) {
      var axis = AutoLayoutConstraintModel.getSymmetryAxis();
      var toAdd = [];
      for (var m = 0; m < repaired.length; m++) {
        var p = repaired[m];
        var pSize = AssemblyRules.getSize(p.type);
        var pCenter = p.x + pSize.w / 2;
        if (Math.abs(pCenter - axis) < 5) continue;

        var hasPair = repaired.some(function(q) {
          if (q.layer !== p.layer || q.type !== p.type || q.id === p.id) return false;
          var qSize = AssemblyRules.getSize(q.type);
          var qCenter = q.x + qSize.w / 2;
          return Math.abs(qCenter - (2 * axis - pCenter)) < 15;
        });

        if (!hasPair) {
          var mirrored = AutoLayoutConstraintModel.mirrorPart(p);
          if (mirrored && AutoLayoutConstraintModel.isValidPlacement(mirrored, repaired.concat(toAdd))) {
            if (AutoLayoutConstraintModel.hasAdequateSupport(mirrored, repaired.concat(toAdd))) {
              mirrored.connect = AutoLayoutConstraintModel.generateConnectString(mirrored, repaired.concat(toAdd));
              toAdd.push(mirrored);
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
