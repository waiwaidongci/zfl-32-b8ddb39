const AssemblyStepCalculator = {
  calculateSteps(scheme) {
    if (!scheme || scheme.length === 0) {
      return { steps: [], totalSteps: 0 };
    }

    const sorted = this.sortByLayerAndConnection(scheme);
    const steps = sorted.map((part, index) => this.createStep(part, index, sorted));

    return {
      steps,
      totalSteps: steps.length,
      installedPartIds: (stepIndex) => {
        if (stepIndex < 0) return [];
        return steps.slice(0, stepIndex + 1).map(s => s.partId);
      }
    };
  },

  sortByLayerAndConnection(scheme) {
    const parts = scheme.slice();
    const byLayer = {};

    for (const p of parts) {
      if (!byLayer[p.layer]) byLayer[p.layer] = [];
      byLayer[p.layer].push(p);
    }

    const sortedLayers = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
    const result = [];

    for (const layer of sortedLayers) {
      const layerParts = byLayer[layer];
      const sortedLayerParts = this.sortWithinLayer(layerParts, parts);
      result.push(...sortedLayerParts);
    }

    return result;
  },

  sortWithinLayer(layerParts, allParts) {
    const parts = layerParts.slice();
    const partMap = new Map(allParts.map(p => [p.id, p]));

    const getDependencyScore = (part) => {
      if (!part.connect) return 0;
      const connectLower = part.connect.toLowerCase();
      let score = 0;

      for (const other of allParts) {
        if (other.id === part.id) continue;
        if (connectLower.includes(other.type.toLowerCase())) {
          if (other.layer < part.layer) {
            score += 10;
          } else if (other.layer === part.layer) {
            score += 5;
          }
        }
      }

      if (connectLower.includes("柱头") || connectLower.includes("栌斗")) score += 20;
      if (connectLower.includes("下承")) score += 15;

      return score;
    };

    return parts.sort((a, b) => {
      const scoreA = getDependencyScore(a);
      const scoreB = getDependencyScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;

      const rectA = AssemblyRules.getRect(a);
      const rectB = AssemblyRules.getRect(b);
      if (rectA.left !== rectB.left) return rectA.left - rectB.left;
      return rectA.top - rectB.top;
    });
  },

  createStep(part, index, allSortedParts) {
    const connectPoint = part.connect || "未设置";
    const hints = this.generateAssemblyHints(part, index, allSortedParts);

    return {
      stepIndex: index,
      partId: part.id,
      partType: part.type,
      layer: part.layer,
      direction: part.dir,
      connectPoint: connectPoint,
      hints: hints,
      position: { x: part.x, y: part.y }
    };
  },

  generateAssemblyHints(part, index, allSortedParts) {
    const hints = [];
    const connect = part.connect || "";
    const connectLower = connect.toLowerCase();

    if (connectLower.includes("柱头")) {
      hints.push("此构件为基础承重构件，需安放在柱头正中位置。");
    }

    if (connectLower.includes("下承")) {
      hints.push("将此构件水平安放在下层构件之上，确保上下对齐。");
    }

    if (connectLower.includes("左端") || connectLower.includes("左")) {
      hints.push("对准左侧连接点，确保榫卯契合。");
    }

    if (connectLower.includes("右端") || connectLower.includes("右") || connectLower.includes("后尾")) {
      hints.push("对准右侧连接点，确保榫卯契合。");
    }

    if (connectLower.includes("前端") || connectLower.includes("前")) {
      hints.push("前端出跳，注意悬挑方向和角度。");
    }

    if (part.type === "昂") {
      hints.push("昂构件具有特殊斜度，安装时注意方向标注。");
    }

    if (part.type === "耍头") {
      hints.push("耍头通常位于昂后尾之上，注意承托关系。");
    }

    if (part.type === "散斗") {
      hints.push("散斗用于节点承托，确保平稳放置。");
    }

    if (part.layer > 1) {
      const lowerParts = allSortedParts.filter(p => p.layer < part.layer);
      if (lowerParts.length > 0) {
        const supports = lowerParts.filter(p => AssemblyChecker.partsCanConnectByPosition(part, p));
        if (supports.length > 0) {
          const supportNames = supports.map(s => s.type).join("、");
          hints.push("下方承托构件：" + supportNames + "，检查对齐情况。");
        }
      }
    }

    if (hints.length === 0) {
      hints.push("按照设计位置安放此构件。");
    }

    return hints;
  },

  getStepInfo(steps, stepIndex) {
    if (!steps || stepIndex < 0 || stepIndex >= steps.length) {
      return null;
    }
    return steps[stepIndex];
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyStepCalculator };
