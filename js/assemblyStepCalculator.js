const AssemblyStepCalculator = {
  calculateSteps(scheme, options = {}) {
    if (!scheme || scheme.length === 0) {
      return {
        steps: [],
        totalSteps: 0,
        layers: [],
        layerSteps: {},
        preinstalledPartIds: [],
        allSteps: []
      };
    }

    const sorted = this.sortByLayerAndConnection(scheme);
    const allSteps = sorted.map((part, index) => this.createStep(part, index, sorted));

    const layers = this.getLayers(scheme);
    const layerSteps = this.groupStepsByLayer(allSteps);

    const startLayer = options.startLayer !== undefined && options.startLayer !== null
      ? Number(options.startLayer)
      : null;
    const targetLayer = options.targetLayer !== undefined && options.targetLayer !== null
      ? Number(options.targetLayer)
      : null;

    const preinstalledPartIds = [];
    if (startLayer !== null) {
      allSteps.forEach(step => {
        if (step.layer < startLayer) {
          preinstalledPartIds.push(step.partId);
        }
      });
    }

    let steps = allSteps;
    if (startLayer !== null) {
      const startIdx = this._getFirstStepIndexForLayer(allSteps, startLayer);
      if (startIdx > 0) {
        steps = allSteps.slice(startIdx).map((step, idx) => ({
          ...step,
          stepIndex: idx
        }));
      }
    }
    if (targetLayer !== null) {
      steps = steps.filter(s => s.layer <= targetLayer);
      if (startLayer !== null) {
        steps = steps.filter(s => s.layer >= startLayer);
      }
      steps = steps.map((step, idx) => ({ ...step, stepIndex: idx }));
    }

    const filteredLayerSteps = this.groupStepsByLayer(steps);

    return {
      steps,
      allSteps,
      totalSteps: steps.length,
      layers,
      layerSteps: filteredLayerSteps,
      preinstalledPartIds: preinstalledPartIds,
      installedPartIds: (stepIndex) => {
        const currentInstalled = stepIndex < 0
          ? []
          : steps.slice(0, stepIndex + 1).map(s => s.partId);
        return preinstalledPartIds.concat(currentInstalled);
      },
      getFirstStepIndexForLayer: (layer) => this._getFirstStepIndexForLayer(steps, layer)
    };
  },

  getLayers(scheme) {
    const layerSet = new Set();
    scheme.forEach(p => layerSet.add(Number(p.layer) || 1));
    return Array.from(layerSet).sort((a, b) => a - b);
  },

  groupStepsByLayer(steps) {
    const grouped = {};
    steps.forEach(step => {
      if (!grouped[step.layer]) grouped[step.layer] = [];
      grouped[step.layer].push(step.stepIndex);
    });
    return grouped;
  },

  _getFirstStepIndexForLayer(steps, layer) {
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].layer >= layer) return i;
    }
    return steps.length;
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
    const layerDescription = this.getLayerDescription(part.layer);
    const typeDescription = this.getTypeDescription(part.type);

    return {
      stepIndex: index,
      partId: part.id,
      partType: part.type,
      typeDescription: typeDescription,
      layer: part.layer,
      layerDescription: layerDescription,
      direction: part.dir,
      connectPoint: connectPoint,
      hints: hints,
      position: { x: part.x, y: part.y }
    };
  },

  getLayerDescription(layer) {
    const descriptions = {
      1: "基础层 · 最底层承重构件",
      2: "第二层 · 过渡连接构件",
      3: "第三层 · 主要受力构件",
      4: "第四层 · 悬挑构件层",
      5: "第五层 · 上层承重构件"
    };
    return descriptions[layer] || `第${layer}层 · 装配层`;
  },

  getTypeDescription(type) {
    const descriptions = {
      "栌斗": "斗拱最底部的方形斗，承托整个斗拱结构的基础构件",
      "华拱": "水平方向伸出的拱构件，主要起悬挑和承重作用",
      "昂": "斜向伸出的悬挑构件，具有杠杆作用，前端承挑檐檩",
      "耍头": "位于昂后尾上方的装饰性与功能性构件，起平衡作用",
      "散斗": "小型斗状构件，用于拱、昂等构件的节点承托"
    };
    return descriptions[type] || `${type}构件`;
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
