if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.randomUUID) {
  const nodeCrypto = require("crypto");
  globalThis.crypto = globalThis.crypto || {};
  globalThis.crypto.randomUUID = function () {
    return nodeCrypto.randomUUID();
  };
}

const path = require("path");
const assert = require("assert");

const { ImportParser } = require(path.join(__dirname, "..", "js", "importParser.js"));
const { ImportValidator } = require(path.join(__dirname, "..", "js", "importValidator.js"));
const { SchemeDiff } = require(path.join(__dirname, "..", "js", "schemeDiff.js"));

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function deepEqual(actual, expected, msg) {
  try {
    assert.deepStrictEqual(actual, expected, msg);
    return true;
  } catch (e) {
    throw e;
  }
}

function equal(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
}

function ok(cond, msg) {
  assert.ok(cond, msg || "expected truthy value");
}

function run() {
  const results = [];
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      results.push({ name: t.name, ok: true });
      process.stdout.write("  \u2713 " + t.name + "\n");
    } catch (err) {
      failed++;
      results.push({ name: t.name, ok: false, error: err });
      process.stdout.write("  \u2717 " + t.name + "\n");
      const lines = (err.message || String(err)).split("\n");
      for (const l of lines) {
        process.stdout.write("      " + l + "\n");
      }
      if (err.actual !== undefined) {
        process.stdout.write("      actual:   " + JSON.stringify(err.actual) + "\n");
        process.stdout.write("      expected: " + JSON.stringify(err.expected) + "\n");
      }
    }
  }
  return results;
}

// ============================================================
// ImportParser._processParts
// ============================================================

test("ImportParser._processParts: 有效 id 保留不变", function () {
  const parts = [
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].id, "p1");
  equal(result.idAddedCount, 0);
});

test("ImportParser._processParts: 缺失 id 时自动生成", function () {
  const parts = [
    { type: "栌斗", x: 100, y: 200, layer: 1 }
  ];
  const result = ImportParser._processParts(parts);
  ok(typeof result.parts[0].id === "string" && result.parts[0].id.length > 0,
    "缺失 id 时应生成字符串 id");
  equal(result.idAddedCount, 1);
});

test("ImportParser._processParts: id 为空字符串时自动生成", function () {
  const parts = [
    { id: "", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "   ", type: "华拱", x: 200, y: 200, layer: 2 }
  ];
  const result = ImportParser._processParts(parts);
  ok(result.parts[0].id.length > 0);
  ok(result.parts[1].id.length > 0);
  equal(result.idAddedCount, 2);
});

test("ImportParser._processParts: 重复 id 时重名的自动换新 id", function () {
  const parts = [
    { id: "dup", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "dup", type: "华拱", x: 200, y: 200, layer: 2 },
    { id: "dup", type: "昂", x: 300, y: 200, layer: 3 }
  ];
  const result = ImportParser._processParts(parts);
  const ids = result.parts.map(p => p.id);
  const unique = new Set(ids);
  equal(unique.size, 3, "所有 id 应唯一");
  equal(result.idAddedCount, 2, "两个重复 id 应被重新生成");
});

test("ImportParser._processParts: 数字字符串坐标被转成整数", function () {
  const parts = [
    { id: "a", type: "栌斗", x: "123.7", y: "456.2", layer: "2.9" }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].x, 124, "x 应四舍五入到整数");
  equal(result.parts[0].y, 456, "y 应四舍五入到整数");
  equal(result.parts[0].layer, 3, "layer 应四舍五入到整数");
  equal(typeof result.parts[0].x, "number");
  equal(typeof result.parts[0].y, "number");
  equal(typeof result.parts[0].layer, "number");
});

test("ImportParser._processParts: layer 小数取整", function () {
  const parts = [
    { id: "a", type: "栌斗", x: 100, y: 100, layer: 1.1 },
    { id: "b", type: "华拱", x: 200, y: 200, layer: 2.5 },
    { id: "c", type: "昂", x: 300, y: 300, layer: 3.9 }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].layer, 1);
  equal(result.parts[1].layer, 3);
  equal(result.parts[2].layer, 4);
});

test("ImportParser._processParts: layer 为 NaN 时回退到 1", function () {
  const parts = [
    { id: "a", type: "栌斗", x: 100, y: 100, layer: "abc" }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].layer, 1);
});

test("ImportParser._processParts: x/y 为 NaN 时回退到默认值", function () {
  const parts = [
    { id: "a", type: "栌斗", x: "not-a-number", y: NaN, layer: 1 }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].x, 460);
  equal(result.parts[0].y, 320);
});

test("ImportParser._processParts: type/dir/connect 被规范化为字符串并 trim", function () {
  const parts = [
    { id: "a", type: "  栌斗  ", x: 100, y: 100, layer: 1, dir: "  正  ", connect: 123 }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0].type, "栌斗");
  equal(result.parts[0].dir, "正");
  equal(result.parts[0].connect, "123");
});

test("ImportParser._processParts: _originalIndex 被正确设置", function () {
  const parts = [
    { id: "a", type: "栌斗", x: 100, y: 100, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 200, layer: 2 },
    { id: "c", type: "昂", x: 300, y: 300, layer: 3 }
  ];
  const result = ImportParser._processParts(parts);
  equal(result.parts[0]._originalIndex, 0);
  equal(result.parts[1]._originalIndex, 1);
  equal(result.parts[2]._originalIndex, 2);
});

// ============================================================
// ImportValidator.validate
// ============================================================

test("ImportValidator.validate: 全部合法的构件返回 ok", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "正", connect: "柱头" },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2, dir: "左挑", connect: "下承" }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.canImport, true);
  equal(result.hasWarnings, false);
  equal(result.severity, "ok");
  equal(result.unknownCount, 0);
  equal(result.missingFieldCount, 0);
  equal(result.invalidLayerCount, 0);
  equal(result.invalidDirIssues.length, 0);
});

test("ImportValidator.validate: 未知构件类型标记为 error", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "奇怪的构件", x: 200, y: 300, layer: 2 },
    { id: "c", type: "未知斗拱", x: 300, y: 400, layer: 1 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.canImport, false);
  equal(result.severity, "error");
  equal(result.unknownCount, 2);
  ok(result.unknownTypes.includes("奇怪的构件"));
  ok(result.unknownTypes.includes("未知斗拱"));
  equal(result.partFlags[0].hasUnknownType, false);
  equal(result.partFlags[1].hasUnknownType, true);
  equal(result.partFlags[2].hasUnknownType, true);
});

test("ImportValidator.validate: 缺失必填字段时 hasWarnings=true", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", y: 300, layer: 2 },
    { id: "c", type: "昂", x: 300, layer: 3 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.canImport, true);
  equal(result.hasWarnings, true);
  equal(result.severity, "warning");
  equal(result.missingFieldCount, 2);
  ok(result.missingFieldIssues.find(i => i.fields.includes("x")), "应检测到缺失 x");
  ok(result.missingFieldIssues.find(i => i.fields.includes("y")), "应检测到缺失 y");
  equal(result.partFlags[0].hasMissingFields, false);
  equal(result.partFlags[1].hasMissingFields, true);
  equal(result.partFlags[2].hasMissingFields, true);
});

test("ImportValidator.validate: 缺失 layer 字段", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.missingFieldCount, 1);
  ok(result.missingFieldIssues[0].fields.includes("layer"));
});

test("ImportValidator.validate: layer 小于 1 判为非法层级", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 0 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: -5 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidLayerCount, 2);
  equal(result.partFlags[0].hasInvalidLayer, true);
  equal(result.partFlags[1].hasInvalidLayer, true);
});

test("ImportValidator.validate: layer 大于 16 判为非法层级", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 17 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 100 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidLayerCount, 2);
});

test("ImportValidator.validate: layer 非整数判为非法层级", function () {
  const parts = [
    { _originalIndex: 0, id: "a", type: "栌斗", x: 100, y: 200, layer: 2.5 }
  ];
  const result = ImportValidator.validate(parts);
  equal(result.invalidLayerCount, 1);
  equal(result.partFlags[0].hasInvalidLayer, true);
});

test("ImportValidator.validate: layer 为 NaN 判为非法层级", function () {
  const parts = [
    { _originalIndex: 0, id: "a", type: "栌斗", x: 100, y: 200, layer: NaN }
  ];
  const result = ImportValidator.validate(parts);
  equal(result.invalidLayerCount, 1);
});

test("ImportValidator.validate: layer 合法边界值通过", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 16 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidLayerCount, 0);
  equal(result.partFlags[0].hasInvalidLayer, false);
  equal(result.partFlags[1].hasInvalidLayer, false);
});

test("ImportValidator.validate: 非法方向被检测", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "正" },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2, dir: "斜向" },
    { id: "c", type: "昂", x: 300, y: 400, layer: 3, dir: "up" }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidDirIssues.length, 2);
  equal(result.partFlags[0].hasInvalidDir, false);
  equal(result.partFlags[1].hasInvalidDir, true);
  equal(result.partFlags[2].hasInvalidDir, true);
  ok(result.invalidDirIssues.find(i => i.dirValue === "斜向"));
  ok(result.invalidDirIssues.find(i => i.dirValue === "up"));
});

test("ImportValidator.validate: 合法方向（正/左挑/右挑）通过", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "正" },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2, dir: "左挑" },
    { id: "c", type: "昂", x: 300, y: 400, layer: 3, dir: "右挑" },
    { id: "d", type: "耍头", x: 400, y: 500, layer: 2 }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidDirIssues.length, 0);
  for (const f of result.partFlags) equal(f.hasInvalidDir, false);
});

test("ImportValidator.validate: 空 dir 不判为非法", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "" }
  ]).parts;
  const result = ImportValidator.validate(parts);
  equal(result.invalidDirIssues.length, 0);
});

test("ImportValidator.validate: 自定义 supportedTypes 参数生效", function () {
  const parts = ImportParser._processParts([
    { id: "a", type: "自定义构件", x: 100, y: 200, layer: 1 }
  ]).parts;
  const result = ImportValidator.validate(parts, ["自定义构件", "另一种"]);
  equal(result.canImport, true);
  equal(result.unknownCount, 0);
});

test("ImportValidator.validate: 非法坐标被检测", function () {
  const parts = [
    { _originalIndex: 0, id: "a", type: "栌斗", x: Infinity, y: 200, layer: 1 },
    { _originalIndex: 1, id: "b", type: "华拱", x: 200, y: NaN, layer: 2 }
  ];
  const result = ImportValidator.validate(parts);
  equal(result.invalidCoordIssues.length, 2);
});

// ============================================================
// SchemeDiff.compare
// ============================================================

function makeScheme(list) {
  return list.map(function (p, i) {
    return Object.assign({
      id: "p" + (i + 1),
      type: "栌斗",
      x: 100 + i * 100,
      y: 100,
      layer: 1,
      dir: "正",
      connect: ""
    }, p);
  });
}

test("SchemeDiff.compare: 两个相同方案无差异", function () {
  const scheme = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 }
  ]);
  const result = SchemeDiff.compare(scheme, scheme);
  equal(result.hasDifferences, false);
  equal(result.summary.addedCount, 0);
  equal(result.summary.deletedCount, 0);
  equal(result.summary.movedCount, 0);
  equal(result.summary.layerChangedCount, 0);
  equal(result.summary.connectChangedCount, 0);
  equal(result.summary.totalCount, 0);
});

test("SchemeDiff.compare: 检测新增构件", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 },
    { id: "c", type: "昂", x: 300, y: 400, layer: 3 }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.addedCount, 2);
  equal(result.summary.deletedCount, 0);
  equal(result.hasDifferences, true);
  const addedIds = result.added.map(d => d.partId).sort();
  deepEqual(addedIds, ["b", "c"]);
  ok(result.diffMap["b"].includes("added"));
  ok(result.diffMap["c"].includes("added"));
});

test("SchemeDiff.compare: 检测删除构件", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 },
    { id: "c", type: "昂", x: 300, y: 400, layer: 3 }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.deletedCount, 2);
  equal(result.summary.addedCount, 0);
  const deletedIds = result.deleted.map(d => d.partId).sort();
  deepEqual(deletedIds, ["b", "c"]);
});

test("SchemeDiff.compare: 检测位置移动（超过阈值）", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 110, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 310, layer: 2 }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.movedCount, 2);
  const movedIds = result.moved.map(d => d.partId).sort();
  deepEqual(movedIds, ["a", "b"]);
  deepEqual(result.moved[0].from, { x: 100, y: 200 });
  deepEqual(result.moved[0].to, { x: 110, y: 200 });
});

test("SchemeDiff.compare: 小位移（阈值内）不判为移动", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 101, y: 201, layer: 1 },
    { id: "b", type: "华拱", x: 202, y: 300, layer: 2 }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.movedCount, 0);
});

test("SchemeDiff.compare: 检测层级变化", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2 }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 3 },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 5 }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.layerChangedCount, 2);
  const layerItemA = result.layerChanged.find(d => d.partId === "a");
  const layerItemB = result.layerChanged.find(d => d.partId === "b");
  equal(layerItemA.from, 1);
  equal(layerItemA.to, 3);
  equal(layerItemB.from, 2);
  equal(layerItemB.to, 5);
});

test("SchemeDiff.compare: 检测方向变化", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "正" }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "左挑" }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.dirChangedCount, 1);
  equal(result.dirChanged[0].from, "正");
  equal(result.dirChanged[0].to, "左挑");
});

test("SchemeDiff.compare: 检测连接点变化", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, connect: "柱头" },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2, connect: "" }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, connect: "下承" },
    { id: "b", type: "华拱", x: 200, y: 300, layer: 2, connect: "柱头" }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.connectChangedCount, 2);
  const connA = result.connectChanged.find(d => d.partId === "a");
  const connB = result.connectChanged.find(d => d.partId === "b");
  equal(connA.from, "柱头");
  equal(connA.to, "下承");
  equal(connB.from, "(空)");
  equal(connB.to, "柱头");
});

test("SchemeDiff.compare: 一个构件同时多种变更被分别统计", function () {
  const saved = makeScheme([
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1, dir: "正", connect: "柱头" }
  ]);
  const current = makeScheme([
    { id: "a", type: "栌斗", x: 200, y: 300, layer: 3, dir: "左挑", connect: "下承" }
  ]);
  const result = SchemeDiff.compare(current, saved);
  equal(result.summary.movedCount, 1);
  equal(result.summary.layerChangedCount, 1);
  equal(result.summary.dirChangedCount, 1);
  equal(result.summary.connectChangedCount, 1);
  ok(result.diffMap["a"].includes("moved"));
  ok(result.diffMap["a"].includes("layer"));
  ok(result.diffMap["a"].includes("dir"));
  ok(result.diffMap["a"].includes("connect"));
});

test("SchemeDiff.compare: 坐标和 layer 数字字符串被规范化后再比较", function () {
  const saved = [
    { id: "a", type: "栌斗", x: "100", y: "200", layer: "1" }
  ];
  const current = [
    { id: "a", type: "栌斗", x: 100, y: 200, layer: 1 }
  ];
  const result = SchemeDiff.compare(current, saved);
  equal(result.hasDifferences, false);
  equal(result.summary.movedCount, 0);
  equal(result.summary.layerChangedCount, 0);
});

test("SchemeDiff.compare: 测量标注新增", function () {
  const saved = { annotations: [], scale: null };
  const current = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 } }
    ],
    scale: null
  };
  const scheme = [];
  const result = SchemeDiff.compare(scheme, scheme, current, saved);
  equal(result.summary.measurementAddedCount, 1);
  equal(result.summary.measurementDeletedCount, 0);
  equal(result.summary.measurementChangedCount, 0);
  equal(result.measurementDiff.added[0].annotationId, "m1");
  ok(result.hasDifferences);
});

test("SchemeDiff.compare: 测量标注删除", function () {
  const saved = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 } },
      { id: "m2", from: { x: 200, y: 300 }, to: { x: 400, y: 500 } }
    ],
    scale: null
  };
  const current = { annotations: [], scale: null };
  const scheme = [];
  const result = SchemeDiff.compare(scheme, scheme, current, saved);
  equal(result.summary.measurementDeletedCount, 2);
  const delIds = result.measurementDiff.deleted.map(d => d.annotationId).sort();
  deepEqual(delIds, ["m1", "m2"]);
});

test("SchemeDiff.compare: 测量标注坐标变化", function () {
  const saved = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 } }
    ],
    scale: null
  };
  const current = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 500, y: 600 } }
    ],
    scale: null
  };
  const scheme = [];
  const result = SchemeDiff.compare(scheme, scheme, current, saved);
  equal(result.summary.measurementChangedCount, 1);
  equal(result.measurementDiff.changed[0].annotationId, "m1");
});

test("SchemeDiff.compare: 测量标注坐标相同不判变化", function () {
  const saved = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 } }
    ],
    scale: null
  };
  const current = {
    annotations: [
      { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 }, label: "ignored" }
    ],
    scale: null
  };
  const scheme = [];
  const result = SchemeDiff.compare(scheme, scheme, current, saved);
  equal(result.summary.measurementChangedCount, 0);
});

test("SchemeDiff.compare: 比例尺变化", function () {
  const saved = { annotations: [], scale: { pixelsPerUnit: 10, unitName: "份" } };
  const current = { annotations: [], scale: { pixelsPerUnit: 20, unitName: "份" } };
  const scheme = [];
  const result = SchemeDiff.compare(scheme, scheme, current, saved);
  ok(result.measurementDiff.scaleChanged);
  equal(result.measurementDiff.scaleFrom.pixelsPerUnit, 10);
  equal(result.measurementDiff.scaleTo.pixelsPerUnit, 20);
  ok(result.hasDifferences);
});

// ============================================================
// Run
// ============================================================

const allTests = tests.slice();

function runGroup(title, prefix) {
  process.stdout.write("\n" + title + "\n");
  const group = allTests.filter(t => t.name.startsWith(prefix));
  tests.splice(0, tests.length);
  group.forEach(t => tests.push(t));
  run();
}

runGroup("ImportParser 测试", "ImportParser");
runGroup("ImportValidator 测试", "ImportValidator");
runGroup("SchemeDiff 测试", "SchemeDiff");

const totalPassed = passed;
const totalFailed = failed;

process.stdout.write("\n========================================\n");
process.stdout.write("总计: " + (totalPassed + totalFailed) + " 个测试, 通过 " + totalPassed + ", 失败 " + totalFailed + "\n");
process.stdout.write("========================================\n");

if (totalFailed > 0) {
  process.exit(1);
}
