const GeometryTransform = {
  mirrorCopy(scheme, selectedIds, axisX) {
    var parts = scheme.filter(function(p) { return selectedIds.has(p.id); });
    if (parts.length === 0) return [];

    if (typeof axisX !== "number" || isNaN(axisX)) {
      axisX = this._computeGroupCenterX(parts);
    }

    return parts.map(function(p) {
      var s = AssemblyRules.getSize(p.type);
      var centerX = p.x + s.w / 2;
      var mirroredCenterX = 2 * axisX - centerX;
      var newX = Math.round(mirroredCenterX - s.w / 2);

      return {
        id: crypto.randomUUID(),
        type: p.type,
        x: newX,
        y: p.y,
        layer: p.layer,
        dir: this._flipDir(p.dir),
        connect: p.connect
      };
    }.bind(this));
  },

  batchCopy(scheme, selectedIds, count, spacingX) {
    var parts = scheme.filter(function(p) { return selectedIds.has(p.id); });
    if (parts.length === 0) return [];
    count = Math.max(1, Math.round(count));
    spacingX = Math.round(spacingX);

    var result = [];
    for (var i = 1; i <= count; i++) {
      parts.forEach(function(p) {
        result.push({
          id: crypto.randomUUID(),
          type: p.type,
          x: Math.round(p.x + i * spacingX),
          y: p.y,
          layer: p.layer,
          dir: p.dir,
          connect: p.connect
        });
      });
    }
    return result;
  },

  _flipDir(dir) {
    if (dir === "左挑") return "右挑";
    if (dir === "右挑") return "左挑";
    return dir;
  },

  _computeGroupCenterX(parts) {
    if (parts.length === 0) return 600;
    var total = 0;
    parts.forEach(function(p) {
      var s = AssemblyRules.getSize(p.type);
      total += p.x + s.w / 2;
    });
    return total / parts.length;
  }
};

if (typeof module !== "undefined") module.exports = { GeometryTransform };
