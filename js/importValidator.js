const ImportValidator = {
  VALID_TYPES: ["栌斗", "华拱", "昂", "耍头", "散斗"],
  VALID_DIRS: ["正", "左挑", "右挑"],
  REQUIRED_FIELDS: ["type", "x", "y", "layer"],
  MAX_LAYER: 16,
  MIN_LAYER: 1,

  validate(parts, supportedTypes) {
    const validTypes = (supportedTypes && supportedTypes.length) ? supportedTypes : this.VALID_TYPES;
    const typeDistribution = {};
    const unknownTypes = new Set();
    const missingFieldIssues = [];
    const invalidLayerIssues = [];
    const invalidDirIssues = [];
    const invalidCoordIssues = [];
    const partFlags = [];

    let unknownCount = 0;
    let missingFieldCount = 0;
    let invalidLayerCount = 0;

    parts.forEach((p, idx) => {
      const flags = {
        hasUnknownType: false,
        hasMissingFields: false,
        hasInvalidLayer: false,
        hasInvalidDir: false,
        missingFields: []
      };

      if (!p.type || !validTypes.includes(p.type)) {
        flags.hasUnknownType = true;
        unknownTypes.add(p.type || "(空)");
        unknownCount++;
      } else {
        typeDistribution[p.type] = (typeDistribution[p.type] || 0) + 1;
      }

      const missing = [];
      this.REQUIRED_FIELDS.forEach(field => {
        if (p[field] === undefined || p[field] === null || p[field] === "") {
          if (field === "type" && p.type !== undefined && p.type !== null) return;
          missing.push(field);
        }
      });
      if (missing.length > 0) {
        flags.hasMissingFields = true;
        flags.missingFields = missing;
        missingFieldCount++;
        missingFieldIssues.push({
          index: p._originalIndex !== undefined ? p._originalIndex : idx,
          type: p.type || "(未知)",
          id: p.id,
          fields: missing
        });
      }

      if (p.layer !== undefined && p.layer !== null) {
        const layer = Number(p.layer);
        if (isNaN(layer) || layer < this.MIN_LAYER || layer > this.MAX_LAYER || !Number.isInteger(layer)) {
          flags.hasInvalidLayer = true;
          invalidLayerCount++;
          invalidLayerIssues.push({
            index: p._originalIndex !== undefined ? p._originalIndex : idx,
            type: p.type || "(未知)",
            id: p.id,
            layerValue: p.layer
          });
        }
      }

      if (p.dir !== undefined && p.dir !== null && p.dir !== "") {
        if (!this.VALID_DIRS.includes(p.dir)) {
          flags.hasInvalidDir = true;
          invalidDirIssues.push({
            index: p._originalIndex !== undefined ? p._originalIndex : idx,
            type: p.type || "(未知)",
            id: p.id,
            dirValue: p.dir
          });
        }
      }

      if ((p.x !== undefined && (isNaN(Number(p.x)) || !isFinite(Number(p.x)))) ||
          (p.y !== undefined && (isNaN(Number(p.y)) || !isFinite(Number(p.y))))) {
        invalidCoordIssues.push({
          index: p._originalIndex !== undefined ? p._originalIndex : idx,
          type: p.type || "(未知)",
          id: p.id,
          x: p.x,
          y: p.y
        });
      }

      partFlags.push(flags);
    });

    const canImport = unknownCount === 0;
    const hasWarnings = missingFieldCount > 0 || invalidLayerCount > 0 ||
                        invalidDirIssues.length > 0 || invalidCoordIssues.length > 0;

    const typeDistArray = validTypes.map(t => ({
      type: t,
      count: typeDistribution[t] || 0
    }));
    if (unknownTypes.size > 0) {
      unknownTypes.forEach(t => {
        typeDistArray.push({
          type: t,
          count: parts.filter(p => p.type === t).length,
          isUnknown: true
        });
      });
    }

    return {
      totalCount: parts.length,
      validTypes,
      typeDistribution: typeDistArray,
      unknownTypes: Array.from(unknownTypes),
      unknownCount,
      missingFieldCount,
      missingFieldIssues,
      invalidLayerCount,
      invalidLayerIssues,
      invalidDirIssues,
      invalidCoordIssues,
      partFlags,
      canImport,
      hasWarnings,
      severity: canImport ? (hasWarnings ? "warning" : "ok") : "error"
    };
  }
};

if (typeof module !== "undefined") module.exports = { ImportValidator };
