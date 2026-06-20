const AutoLayoutConflictDetector = (function() {

  function detectAll(scheme, partTypes, options) {
    options = options || {};
    var symmetric = !!options.symmetric;

    var baseResult = AssemblyChecker.checkAll(scheme, partTypes);
    var extraIssues = [];

    if (symmetric) {
      checkSymmetry(scheme, extraIssues);
    }

    checkOrphanedParts(scheme, extraIssues);
    checkConnectAccuracy(scheme, extraIssues);
    checkInsufficientSupport(scheme, extraIssues);
    checkVerticalAlignment(scheme, extraIssues);
    checkLayerDensity(scheme, extraIssues);

    var allIssues = baseResult.issues.concat(extraIssues);
    allIssues.sort(function(a, b) {
      var sevOrder = { error: 0, warning: 1, info: 2 };
      var sa = sevOrder[a.severity] !== undefined ? sevOrder[a.severity] : 3;
      var sb = sevOrder[b.severity] !== undefined ? sevOrder[b.severity] : 3;
      if (sa !== sb) return sa - sb;
      return a.layer - b.layer;
    });

    var errorCount = baseResult.errorCount + extraIssues.filter(function(i) { return i.severity === "error"; }).length;
    var warningCount = baseResult.warningCount + extraIssues.filter(function(i) { return i.severity === "warning"; }).length;

    return {
      issues: allIssues,
      counts: baseResult.counts,
      errorCount: errorCount,
      warningCount: warningCount,
      totalCount: allIssues.length,
      baseIssues: baseResult.issues.length,
      extraIssues: extraIssues.length
    };
  }

  function checkSymmetry(scheme, issues) {
    var axis = AutoLayoutConstraintModel.getSymmetryAxis();
    var byLayer = {};
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    for (var layer in byLayer) {
      var parts = byLayer[layer];
      var axisParts = [];
      var offAxisParts = [];

      for (var j = 0; j < parts.length; j++) {
        var pSize = AssemblyRules.getSize(parts[j].type);
        var centerX = parts[j].x + pSize.w / 2;
        if (Math.abs(centerX - axis) < 5) {
          axisParts.push(parts[j]);
        } else {
          offAxisParts.push(parts[j]);
        }
      }

      for (var k = 0; k < offAxisParts.length; k++) {
        var hasPair = AutoLayoutConstraintModel.checkSymmetryPair(offAxisParts[k], scheme);
        if (!hasPair) {
          issues.push({
            partId: offAxisParts[k].id,
            partType: offAxisParts[k].type,
            layer: offAxisParts[k].layer,
            severity: "warning",
            rule: "symmetry_broken",
            message: offAxisParts[k].type + "（第" + offAxisParts[k].layer + "层）缺少对称配对构件"
          });
        }
      }
    }
  }

  function checkOrphanedParts(scheme, issues) {
    if (scheme.length === 0) return;

    var connected = new Set();
    var byLayer = {};
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    for (var i = 0; i < scheme.length; i++) {
      if (scheme[i].layer <= 1) {
        connected.add(scheme[i].id);
        continue;
      }

      var p = scheme[i];
      var pRect = AssemblyRules.getRect(p);
      var allLayers = Object.keys(byLayer).map(Number).sort(function(a, b) { return a - b; });
      var candidateLayers = allLayers.filter(function(l) { return l < p.layer && l >= p.layer - AssemblyRules.MAX_SUPPORT_SEARCH_LAYERS; });

      for (var ci = 0; ci < candidateLayers.length; ci++) {
        var lowerParts = byLayer[candidateLayers[ci]] || [];
        for (var li = 0; li < lowerParts.length; li++) {
          var lower = lowerParts[li];
          if (!connected.has(lower.id)) continue;
          var lRect = AssemblyRules.getRect(lower);
          var check = AssemblyRules.checkSupportOverlap(pRect, lRect);
          if (check.isSupported) {
            connected.add(p.id);
            break;
          }
        }
        if (connected.has(p.id)) break;
      }
    }

    for (var i = 0; i < scheme.length; i++) {
      if (!connected.has(scheme[i].id)) {
        var alreadyReported = issues.some(function(iss) {
          return iss.partId === scheme[i].id && (iss.rule === "suspension" || iss.rule === "orphaned_part");
        });
        if (!alreadyReported) {
          issues.push({
            partId: scheme[i].id,
            partType: scheme[i].type,
            layer: scheme[i].layer,
            severity: "error",
            rule: "orphaned_part",
            message: scheme[i].type + "（第" + scheme[i].layer + "层）与主体结构断开，属于孤立构件"
          });
        }
      }
    }
  }

  function checkInsufficientSupport(scheme, issues) {
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (p.layer <= 1) continue;

      var supporter = AutoLayoutConstraintModel.findBestSupporter(p, scheme);
      if (!supporter) continue;

      if (!supporter.isEnough) {
        var alreadyReported = issues.some(function(iss) {
          return iss.partId === p.id && (iss.rule === "suspension" || iss.rule === "invalid_support_type");
        });
        if (!alreadyReported) {
          issues.push({
            partId: p.id,
            partType: p.type,
            layer: p.layer,
            severity: "warning",
            rule: "insufficient_support",
            message: p.type + "（第" + p.layer + "层）承托接触面积不足，建议调整位置或更换下方承托构件"
          });
        }
      }
    }
  }

  function checkVerticalAlignment(scheme, issues) {
    var byLayer = {};
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    var allLayers = Object.keys(byLayer).map(Number).sort(function(a, b) { return a - b; });

    for (var li = 1; li < allLayers.length; li++) {
      var currentLayer = allLayers[li];
      var prevLayer = allLayers[li - 1];
      var currentParts = byLayer[currentLayer] || [];
      var prevParts = byLayer[prevLayer] || [];

      if (prevParts.length === 0 || currentParts.length === 0) continue;

      var maxGap = AssemblyRules.GAP_TOLERANCE_Y_MAX || 160;
      var minGap = AssemblyRules.GAP_TOLERANCE_Y_MIN || -20;

      for (var ci = 0; ci < currentParts.length; ci++) {
        var cp = currentParts[ci];
        var cpRect = AssemblyRules.getRect(cp);
        var hasProperVerticalGap = false;

        for (var pi = 0; pi < prevParts.length; pi++) {
          var pp = prevParts[pi];
          var ppRect = AssemblyRules.getRect(pp);
          var gapY = ppRect.top - cpRect.bottom;

          if (gapY >= minGap && gapY <= maxGap) {
            hasProperVerticalGap = true;
            break;
          }
        }

        if (!hasProperVerticalGap && cp.layer > 1) {
          issues.push({
            partId: cp.id,
            partType: cp.type,
            layer: cp.layer,
            severity: "info",
            rule: "vertical_gap_irregular",
            message: cp.type + "（第" + cp.layer + "层）与下层构件的垂直间距略不规则，可考虑微调"
          });
        }
      }
    }
  }

  function checkLayerDensity(scheme, issues) {
    var byLayer = {};
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    var layerCounts = Object.keys(byLayer).map(function(l) {
      return { layer: Number(l), count: byLayer[l].length };
    }).sort(function(a, b) { return a.layer - b.layer; });

    if (layerCounts.length < 2) return;

    var avgCount = layerCounts.reduce(function(sum, l) { return sum + l.count; }, 0) / layerCounts.length;

    for (var j = 0; j < layerCounts.length; j++) {
      var lc = layerCounts[j];
      if (lc.layer === 1) continue;

      if (lc.count === 0) {
        issues.push({
          partId: null,
          partType: null,
          layer: lc.layer,
          severity: "info",
          rule: "empty_layer",
          message: "第" + lc.layer + "层没有任何构件"
        });
      } else if (lc.count > avgCount * 2 && lc.count > 4) {
        issues.push({
          partId: null,
          partType: null,
          layer: lc.layer,
          severity: "info",
          rule: "layer_overcrowded",
          message: "第" + lc.layer + "层构件密度较高（" + lc.count + "个），可能存在排布过密问题"
        });
      }
    }
  }

  function checkConnectAccuracy(scheme, issues) {
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!p.connect || p.connect.trim() === "") continue;

      var mentionedTypes = AssemblyRules.extractMentionedPartTypes(p.connect);
      var hasPositionalMatch = false;

      for (var m = 0; m < mentionedTypes.length; m++) {
        var mentionedType = mentionedTypes[m];
        if (mentionedType === p.type) continue;

        var candidates = scheme.filter(function(s) { return s.type === mentionedType && s.id !== p.id; });
        for (var c = 0; c < candidates.length; c++) {
          if (AssemblyChecker.partsCanConnectByPosition(p, candidates[c])) {
            hasPositionalMatch = true;
            break;
          }
        }
        if (hasPositionalMatch) break;
      }

      if (mentionedTypes.length > 0 && !hasPositionalMatch) {
        var alreadyReported = issues.some(function(iss) {
          return iss.partId === p.id && (iss.rule === "connect_mention_mismatch" || iss.rule === "connect_inaccurate");
        });
        if (!alreadyReported) {
          issues.push({
            partId: p.id,
            partType: p.type,
            layer: p.layer,
            severity: "info",
            rule: "connect_inaccurate",
            message: p.type + "（第" + p.layer + "层）连接点「" + p.connect + "」与实际相邻构件不完全匹配，可考虑更新"
          });
        }
      }
    }
  }

  function quickCheck(scheme) {
    var byLayer = {};
    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    var problems = {
      suspension: 0,
      overlap: 0,
      missingConnect: 0,
      invalidSupport: 0,
      insufficientSupport: 0
    };

    for (var i = 0; i < scheme.length; i++) {
      var p = scheme[i];
      if (!p.connect || p.connect.trim() === "") problems.missingConnect++;

      if (p.layer <= 1) continue;

      var hasSupport = false;
      var allLayers = Object.keys(byLayer).map(Number);
      var candidateLayers = allLayers.filter(function(l) { return l < p.layer && l >= p.layer - AssemblyRules.MAX_SUPPORT_SEARCH_LAYERS; });

      var bestSupporter = AutoLayoutConstraintModel.findBestSupporter(p, scheme);

      if (bestSupporter) {
        if (bestSupporter.isEnough) {
          hasSupport = true;
        } else {
          problems.insufficientSupport++;
        }
        if (!AssemblyRules.canSupport(bestSupporter.part.type, p.type)) {
          problems.invalidSupport++;
        }
      }

      if (!hasSupport && !bestSupporter) {
        problems.suspension++;
      }
    }

    for (var layer in byLayer) {
      var parts = byLayer[layer];
      for (var a = 0; a < parts.length; a++) {
        for (var b = a + 1; b < parts.length; b++) {
          var rA = AssemblyRules.getRect(parts[a]);
          var rB = AssemblyRules.getRect(parts[b]);
          if (AssemblyRules.checkSameLayerOverlap(rA, rB)) problems.overlap++;
        }
      }
    }

    var total = problems.suspension + problems.overlap + problems.missingConnect +
                problems.invalidSupport + problems.insufficientSupport;
    return {
      problems: problems,
      isClean: total === 0,
      total: total
    };
  }

  return {
    detectAll: detectAll,
    quickCheck: quickCheck
  };
})();

if (typeof module !== "undefined") module.exports = { AutoLayoutConflictDetector };
