const AssemblyChecker = {
  checkAll(scheme, partTypes) {
    const issues = [];

    this.checkMissingConnect(scheme, issues);
    this.checkSupportAndSuspension(scheme, issues);
    this.checkSameLayerOverlap(scheme, issues);
    this.checkDirectionConsistency(scheme, issues);

    const counts = partTypes.map(type =>
      type + "：" + scheme.filter(p => p.type === type).length
    ).join(" / ");

    const errors = issues.filter(i => i.severity === "error");
    const warnings = issues.filter(i => i.severity === "warning");

    return {
      issues: issues.sort((a, b) => {
        const sevOrder = { error: 0, warning: 1 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) {
          return sevOrder[a.severity] - sevOrder[b.severity];
        }
        return a.layer - b.layer;
      }),
      counts,
      errorCount: errors.length,
      warningCount: warnings.length,
      totalCount: issues.length
    };
  },

  checkMissingConnect(scheme, issues) {
    for (const p of scheme) {
      if (!p.connect || p.connect.trim() === "") {
        issues.push({
          partId: p.id,
          partType: p.type,
          layer: p.layer,
          severity: "warning",
          rule: "missing_connect",
          message: p.type + "（第" + p.layer + "层）缺少连接点设置"
        });
      }
    }
  },

  checkSupportAndSuspension(scheme, issues) {
    const byLayer = {};
    for (const p of scheme) {
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    for (const p of scheme) {
      if (p.layer <= 1) continue;

      const lowerParts = byLayer[p.layer - 1] || [];
      if (lowerParts.length === 0) {
        issues.push({
          partId: p.id,
          partType: p.type,
          layer: p.layer,
          severity: "error",
          rule: "no_support_layer",
          message: p.type + "（第" + p.layer + "层）下方第" + (p.layer - 1) + "层没有任何构件，完全悬空"
        });
        continue;
      }

      const upperRect = AssemblyRules.getRect(p);
      let hasValidSupport = false;
      let hasPositionalSupport = false;
      let wrongSupportType = null;

      for (const lower of lowerParts) {
        const lowerRect = AssemblyRules.getRect(lower);
        const supportCheck = AssemblyRules.checkSupportOverlap(upperRect, lowerRect);

        if (supportCheck.isSupported) {
          hasPositionalSupport = true;
          if (AssemblyRules.canSupport(lower.type, p.type)) {
            hasValidSupport = true;
            break;
          } else {
            wrongSupportType = lower.type;
          }
        }
      }

      if (!hasPositionalSupport) {
        issues.push({
          partId: p.id,
          partType: p.type,
          layer: p.layer,
          severity: "error",
          rule: "suspension",
          message: p.type + "（第" + p.layer + "层）位置悬空，未与下层构件对齐承托"
        });
      } else if (!hasValidSupport && wrongSupportType) {
        issues.push({
          partId: p.id,
          partType: p.type,
          layer: p.layer,
          severity: "error",
          rule: "invalid_support_type",
          message: p.type + "（第" + p.layer + "层）下方" + wrongSupportType + "不允许承托此类型构件"
        });
      }
    }
  },

  checkSameLayerOverlap(scheme, issues) {
    const byLayer = {};
    for (const p of scheme) {
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    const checkedPairs = new Set();

    for (const layer of Object.keys(byLayer)) {
      const parts = byLayer[layer];
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const pairKey = [a.id, b.id].sort().join("|");
          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);

          const rectA = AssemblyRules.getRect(a);
          const rectB = AssemblyRules.getRect(b);
          if (AssemblyRules.checkSameLayerOverlap(rectA, rectB)) {
            issues.push({
              partId: a.id,
              partType: a.type,
              layer: a.layer,
              relatedPartIds: [b.id],
              severity: "warning",
              rule: "same_layer_overlap",
              message: "第" + a.layer + "层的" + a.type + "与" + b.type + "位置重叠"
            });
          }
        }
      }
    }
  },

  checkDirectionConsistency(scheme, issues) {
    for (const p of scheme) {
      if (!AssemblyRules.isDirectionalPart(p.type)) continue;

      if (!AssemblyRules.directionMatchesConnect(p.dir, p.connect, p.type)) {
        const kw = AssemblyRules.CONNECT_KEYWORDS;
        let expectedDir = "正";
        if (p.connect) {
          if (kw.left.some(k => p.connect.includes(k))) expectedDir = "左挑";
          if (kw.right.some(k => p.connect.includes(k))) expectedDir = "右挑";
        }
        issues.push({
          partId: p.id,
          partType: p.type,
          layer: p.layer,
          severity: "warning",
          rule: "direction_mismatch",
          message: p.type + "（第" + p.layer + "层）方向为「" + p.dir + "」，但连接点「" + p.connect + "」暗示应为「" + expectedDir + "」"
        });
      }
    }
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyChecker };
