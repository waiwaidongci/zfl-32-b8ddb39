const AssemblyRules = {
  PART_SIZES: {
    "栌斗": { w: 74, h: 52 },
    "华拱": { w: 124, h: 34 },
    "昂": { w: 112, h: 28 },
    "耍头": { w: 92, h: 32 },
    "散斗": { w: 48, h: 38 }
  },

  SUPPORT_RULES: {
    "栌斗": ["华拱", "昂", "耍头", "散斗"],
    "华拱": ["华拱", "昂", "耍头", "散斗"],
    "昂": ["昂", "耍头", "散斗"],
    "耍头": ["散斗"],
    "散斗": ["华拱", "昂", "耍头", "散斗"]
  },

  DIRECTIONAL_PARTS: ["昂", "耍头"],

  VALID_DIRS: ["正", "左挑", "右挑"],

  PART_TYPES_FOR_CONNECT: ["栌斗", "华拱", "昂", "耍头", "散斗"],

  CONNECT_KEYWORDS: {
    left: ["左", "前端", "前"],
    right: ["右", "后尾", "后"],
    center: ["下承", "中", "柱头"]
  },

  SELF_DIR_KEYWORDS: {
    left: ["左挑", "向左", "朝左"],
    right: ["右挑", "向右", "朝右"]
  },

  OVERLAP_TOLERANCE_X: -12,
  GAP_TOLERANCE_Y_MIN: -20,
  GAP_TOLERANCE_Y_MAX: 160,
  SAME_LAYER_OVERLAP_TOLERANCE_X: 28,
  SAME_LAYER_OVERLAP_TOLERANCE_Y: 28,
  MAX_SUPPORT_SEARCH_LAYERS: 3,

  getSize(type) {
    return this.PART_SIZES[type] || { w: 60, h: 40 };
  },

  getRect(part) {
    const s = this.getSize(part.type);
    return {
      left: part.x,
      right: part.x + s.w,
      top: part.y,
      bottom: part.y + s.h,
      w: s.w,
      h: s.h
    };
  },

  canSupport(lowerType, upperType) {
    const allowed = this.SUPPORT_RULES[lowerType];
    if (!allowed) return false;
    return allowed.includes(upperType);
  },

  isDirectionalPart(type) {
    return this.DIRECTIONAL_PARTS.includes(type);
  },

  extractMentionedPartTypes(connect) {
    if (!connect) return [];
    const mentioned = [];
    for (const t of this.PART_TYPES_FOR_CONNECT) {
      if (connect.includes(t)) mentioned.push(t);
    }
    return mentioned;
  },

  selfDirMatchesConnect(dir, connect, type) {
    if (!this.isDirectionalPart(type)) return { ok: true, expected: null };
    if (!connect) return { ok: true, expected: null };

    const kw = this.SELF_DIR_KEYWORDS;
    const hasLeftDir = kw.left.some(k => connect.includes(k));
    const hasRightDir = kw.right.some(k => connect.includes(k));

    if (hasLeftDir && dir !== "左挑") {
      return { ok: false, expected: "左挑" };
    }
    if (hasRightDir && dir !== "右挑") {
      return { ok: false, expected: "右挑" };
    }
    return { ok: true, expected: null };
  },

  directionMatchesConnect(dir, connect, type) {
    if (!this.isDirectionalPart(type)) return true;
    if (!connect) return true;
    const kw = this.CONNECT_KEYWORDS;
    const hasLeft = kw.left.some(k => connect.includes(k));
    const hasRight = kw.right.some(k => connect.includes(k));
    if (hasLeft && dir === "左挑") return true;
    if (hasRight && dir === "右挑") return true;
    if (!hasLeft && !hasRight) return true;
    return false;
  },

  checkSupportOverlap(upperRect, lowerRect) {
    const overlapX = Math.min(upperRect.right, lowerRect.right) - Math.max(upperRect.left, lowerRect.left);
    const gapY = lowerRect.top - upperRect.bottom;
    return {
      overlapX: overlapX,
      gapY: gapY,
      isSupported: overlapX > this.OVERLAP_TOLERANCE_X &&
                   gapY > this.GAP_TOLERANCE_Y_MIN &&
                   gapY < this.GAP_TOLERANCE_Y_MAX
    };
  },

  checkSameLayerOverlap(rectA, rectB) {
    const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
    const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
    const minW = Math.min(rectA.w, rectB.w);
    const minH = Math.min(rectA.h, rectB.h);
    const overlapArea = overlapX * overlapY;
    const minArea = minW * minH;
    const areaRatio = overlapArea / minArea;
    const minOverlapX = Math.min(this.SAME_LAYER_OVERLAP_TOLERANCE_X, minW * 0.45);
    const minOverlapY = Math.min(this.SAME_LAYER_OVERLAP_TOLERANCE_Y, minH * 0.6);
    return (overlapX > minOverlapX && overlapY > minOverlapY) || areaRatio > 0.35;
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyRules };
