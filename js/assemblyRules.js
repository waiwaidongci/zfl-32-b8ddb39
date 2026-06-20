const AssemblyRules = {
  PART_SIZES: {
    "栌斗": { w: 74, h: 52 },
    "华拱": { w: 124, h: 34 },
    "昂": { w: 112, h: 28 },
    "耍头": { w: 92, h: 32 },
    "散斗": { w: 48, h: 38 }
  },

  SUPPORT_RULES: {
    "栌斗": ["华拱", "散斗"],
    "华拱": ["华拱", "昂", "耍头", "散斗"],
    "昂": ["昂", "耍头", "散斗"],
    "耍头": ["散斗"],
    "散斗": ["散斗"]
  },

  DIRECTIONAL_PARTS: ["昂", "耍头"],

  VALID_DIRS: ["正", "左挑", "右挑"],

  CONNECT_KEYWORDS: {
    left: ["左", "前端", "前"],
    right: ["右", "后尾", "后"],
    center: ["下承", "中", "柱头"]
  },

  OVERLAP_TOLERANCE_X: -12,
  GAP_TOLERANCE_Y_MIN: -20,
  GAP_TOLERANCE_Y_MAX: 80,
  SAME_LAYER_OVERLAP_TOLERANCE: 5,

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
    return overlapX > this.SAME_LAYER_OVERLAP_TOLERANCE && overlapY > this.SAME_LAYER_OVERLAP_TOLERANCE;
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyRules };
