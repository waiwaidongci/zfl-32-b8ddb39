if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.randomUUID) {
  const nodeCrypto = require("crypto");
  globalThis.crypto = globalThis.crypto || {};
  globalThis.crypto.randomUUID = function () {
    return nodeCrypto.randomUUID();
  };
}

const path = require("path");
const assert = require("assert");

function loadModules() {
  const jsDir = path.join(__dirname, "..", "js");
  const order = [
    "templates.js",
    "assemblyRules.js",
    "assemblyChecker.js",
    "selectionManager.js",
    "geometryTransform.js",
    "measurementState.js",
    "measurementSerializer.js",
    "assemblyStepCalculator.js",
    "importParser.js",
    "importValidator.js",
    "schemeDiff.js",
    "assemblyPlayerState.js",
    "schemeStorage.js",
    "schemeState.js",
    "stateSnapshotManager.js",
    "diffModeManager.js",
    "autoLayoutConstraintModel.js",
    "autoLayoutEngine.js",
    "autoLayoutConflictDetector.js"
  ];

  const modules = {};
  order.forEach(fileName => {
    const mod = require(path.join(jsDir, fileName));
    Object.keys(mod).forEach(key => {
      globalThis[key] = mod[key];
      modules[key] = mod[key];
    });
  });

  return modules;
}

const modules = loadModules();
const {
  ImportParser,
  ImportValidator,
  SchemeDiff,
  AssemblyRules,
  AssemblyChecker,
  AssemblyStepCalculator,
  MeasurementSerializer,
  GeometryTransform,
  AutoLayoutConstraintModel,
  AutoLayoutEngine,
  AutoLayoutConflictDetector
} = modules;

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
// AssemblyRules
// ============================================================

test("AssemblyRules.getSize: 返回正确的构件尺寸", function () {
  const lugDouSize = AssemblyRules.getSize("栌斗");
  equal(lugDouSize.w, 74);
  equal(lugDouSize.h, 52);

  const huaGongSize = AssemblyRules.getSize("华拱");
  equal(huaGongSize.w, 124);
  equal(huaGongSize.h, 34);
});

test("AssemblyRules.getSize: 未知类型返回默认尺寸", function () {
  const size = AssemblyRules.getSize("未知构件");
  equal(size.w, 60);
  equal(size.h, 40);
});

test("AssemblyRules.getRect: 基于坐标和尺寸计算矩形", function () {
  const part = { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 };
  const rect = AssemblyRules.getRect(part);
  equal(rect.left, 100);
  equal(rect.top, 200);
  equal(rect.right, 174);
  equal(rect.bottom, 252);
  equal(rect.w, 74);
  equal(rect.h, 52);
});

test("AssemblyRules.canSupport: 正确判断承托关系", function () {
  equal(AssemblyRules.canSupport("栌斗", "华拱"), true);
  equal(AssemblyRules.canSupport("栌斗", "昂"), true);
  equal(AssemblyRules.canSupport("散斗", "华拱"), true);
  equal(AssemblyRules.canSupport("耍头", "栌斗"), false);
  equal(AssemblyRules.canSupport("未知类型", "华拱"), false);
});

test("AssemblyRules.isDirectionalPart: 判断方向性构件", function () {
  equal(AssemblyRules.isDirectionalPart("昂"), true);
  equal(AssemblyRules.isDirectionalPart("耍头"), true);
  equal(AssemblyRules.isDirectionalPart("栌斗"), false);
  equal(AssemblyRules.isDirectionalPart("华拱"), false);
});

test("AssemblyRules.getKeyPoints: 返回9个关键点", function () {
  const part = { id: "p1", type: "栌斗", x: 100, y: 100, layer: 1 };
  const points = AssemblyRules.getKeyPoints(part);
  equal(points.length, 9);
  const types = points.map(p => p.type);
  ok(types.includes("center"));
  ok(types.includes("top-left"));
  ok(types.includes("bottom-right"));
  ok(types.includes("mid-top"));
});

test("AssemblyRules.checkSupportOverlap: 检测承托重叠", function () {
  const lowerRect = { left: 100, right: 200, top: 200, bottom: 252, w: 100, h: 52 };
  const upperRect = { left: 120, right: 180, top: 140, bottom: 180, w: 60, h: 40 };
  const result = AssemblyRules.checkSupportOverlap(upperRect, lowerRect);
  ok(result.overlapX > 0);
  equal(result.gapY, 20);
  equal(typeof result.isSupported, "boolean");
});

test("AssemblyRules.extractMentionedPartTypes: 提取连接点中提到的构件类型", function () {
  deepEqual(AssemblyRules.extractMentionedPartTypes("下承栌斗"), ["栌斗"]);
  deepEqual(AssemblyRules.extractMentionedPartTypes("上承华拱和散斗"), ["华拱", "散斗"]);
  deepEqual(AssemblyRules.extractMentionedPartTypes("柱头连接"), []);
  deepEqual(AssemblyRules.extractMentionedPartTypes(""), []);
});

// ============================================================
// AssemblyChecker
// ============================================================

function makeSimpleScheme() {
  return [
    { id: "p1", type: "栌斗", x: 483, y: 620, layer: 1, dir: "正", connect: "柱头" },
    { id: "p2", type: "华拱", x: 460, y: 564, layer: 2, dir: "正", connect: "下承栌斗" }
  ];
}

test("AssemblyChecker.checkAll: 简单方案检查不报错", function () {
  const scheme = makeSimpleScheme();
  const result = AssemblyChecker.checkAll(scheme, AssemblyRules.VALID_TYPES || ["栌斗", "华拱", "昂", "耍头", "散斗"]);
  ok(Array.isArray(result.issues));
  equal(typeof result.errorCount, "number");
  equal(typeof result.warningCount, "number");
});

test("AssemblyChecker.checkAll: 检测悬空构件", function () {
  const scheme = [
    { id: "p1", type: "华拱", x: 400, y: 300, layer: 5, dir: "正", connect: "" }
  ];
  const result = AssemblyChecker.checkAll(scheme, ["栌斗", "华拱", "昂", "耍头", "散斗"]);
  const hasSuspension = result.issues.some(i => i.rule === "no_support_layer" || i.rule === "suspension");
  ok(hasSuspension, "应检测到悬空或无承托问题");
});

test("AssemblyChecker.getIssuesForPart: 按构件筛选问题", function () {
  const issues = [
    { partId: "p1", rule: "test1" },
    { partId: "p2", rule: "test2" },
    { partId: "p3", relatedPartIds: ["p1"], rule: "test3" }
  ];
  const p1Issues = AssemblyChecker.getIssuesForPart(issues, "p1");
  equal(p1Issues.length, 2);
});

test("AssemblyChecker.getTipsForPart: 获取问题提示", function () {
  const issues = [
    { partId: "p1", rule: "missing_connect", severity: "warning", message: "test" }
  ];
  const tips = AssemblyChecker.getTipsForPart(issues, "p1");
  ok(tips.length > 0);
  equal(tips[0].rule, "missing_connect");
  ok(Array.isArray(tips[0].tips));
});

// ============================================================
// AssemblyStepCalculator
// ============================================================

test("AssemblyStepCalculator.calculateSteps: 空方案返回空步骤", function () {
  const result = AssemblyStepCalculator.calculateSteps([]);
  equal(result.totalSteps, 0);
  deepEqual(result.steps, []);
  deepEqual(result.layers, []);
  deepEqual(result.preinstalledPartIds, []);
});

test("AssemblyStepCalculator.calculateSteps: 多个构件生成对应步骤", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "p2", type: "华拱", x: 100, y: 150, layer: 2 },
    { id: "p3", type: "散斗", x: 100, y: 100, layer: 3 }
  ];
  const result = AssemblyStepCalculator.calculateSteps(scheme);
  equal(result.totalSteps, 3);
  equal(result.steps.length, 3);
  ok(result.steps[0].stepIndex === 0);
});

test("AssemblyStepCalculator.calculateSteps: 按层级排序", function () {
  const scheme = [
    { id: "p3", type: "散斗", x: 100, y: 100, layer: 3 },
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "p2", type: "华拱", x: 100, y: 150, layer: 2 }
  ];
  const result = AssemblyStepCalculator.calculateSteps(scheme);
  equal(result.steps[0].layer, 1);
  equal(result.steps[result.steps.length - 1].layer, 3);
});

test("AssemblyStepCalculator.calculateSteps: startLayer 参数生效", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "p2", type: "华拱", x: 100, y: 150, layer: 2 },
    { id: "p3", type: "散斗", x: 100, y: 100, layer: 3 }
  ];
  const result = AssemblyStepCalculator.calculateSteps(scheme, { startLayer: 2 });
  equal(result.preinstalledPartIds.length, 1);
  ok(result.preinstalledPartIds.includes("p1"));
  ok(result.totalSteps < 3);
});

test("AssemblyStepCalculator.calculateSteps: targetLayer 参数生效", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "p2", type: "华拱", x: 100, y: 150, layer: 2 },
    { id: "p3", type: "散斗", x: 100, y: 100, layer: 3 },
    { id: "p4", type: "昂", x: 100, y: 50, layer: 4 }
  ];
  const result = AssemblyStepCalculator.calculateSteps(scheme, { targetLayer: 2 });
  equal(result.steps.length, 2);
  ok(result.steps.every(s => s.layer <= 2));
});

test("AssemblyStepCalculator.calculateSteps: 包含 allSteps 完整步骤", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 100, y: 200, layer: 1 },
    { id: "p2", type: "华拱", x: 100, y: 150, layer: 2 }
  ];
  const result = AssemblyStepCalculator.calculateSteps(scheme, { startLayer: 2 });
  equal(result.allSteps.length, 2);
  equal(typeof result.layerSteps, "object");
});

// ============================================================
// MeasurementSerializer
// ============================================================

test("MeasurementSerializer.serialize: 序列化测量数据", function () {
  const annotations = [
    { id: "m1", from: { x: 10, y: 20 }, to: { x: 100, y: 200 } }
  ];
  const scale = { pixelsPerUnit: 40, unitName: "份" };
  const result = MeasurementSerializer.serialize(annotations, scale);
  equal(result.scale.pixelsPerUnit, 40);
  equal(result.scale.unitName, "份");
  equal(result.annotations.length, 1);
  equal(result.annotations[0].id, "m1");
  equal(result.annotations[0].from.x, 10);
  equal(result.annotations[0].to.y, 200);
});

test("MeasurementSerializer.deserialize: 反序列化正常数据", function () {
  const data = {
    scale: { pixelsPerUnit: 50, unitName: "厘米" },
    annotations: [
      { id: "a1", from: { x: 0, y: 0 }, to: { x: 100, y: 100 } }
    ]
  };
  const result = MeasurementSerializer.deserialize(data);
  equal(result.scale.pixelsPerUnit, 50);
  equal(result.scale.unitName, "厘米");
  equal(result.annotations.length, 1);
});

test("MeasurementSerializer.deserialize: null 返回默认值", function () {
  const result = MeasurementSerializer.deserialize(null);
  equal(result.annotations.length, 0);
  equal(result.scale.pixelsPerUnit, 40);
  equal(result.scale.unitName, "份");
});

test("MeasurementSerializer.deserialize: 非法标注被过滤", function () {
  const data = {
    scale: null,
    annotations: [
      { id: "a1", from: { x: 0, y: 0 }, to: { x: 100, y: 100 } },
      { id: "bad1", from: null, to: { x: 100, y: 100 } },
      { id: "bad2", from: { x: 0, y: 0 }, to: "invalid" },
      null
    ]
  };
  const result = MeasurementSerializer.deserialize(data);
  equal(result.annotations.length, 1);
  equal(result.annotations[0].id, "a1");
});

test("MeasurementSerializer.deserialize: 坐标被取整", function () {
  const data = {
    annotations: [
      { id: "a1", from: { x: 10.7, y: 20.2 }, to: { x: 30.1, y: 40.9 } }
    ]
  };
  const result = MeasurementSerializer.deserialize(data);
  equal(result.annotations[0].from.x, 11);
  equal(result.annotations[0].from.y, 20);
  equal(result.annotations[0].to.x, 30);
  equal(result.annotations[0].to.y, 41);
});

test("MeasurementSerializer.deserialize: 缺少id时自动生成", function () {
  const data = {
    annotations: [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 10 } }
    ]
  };
  const result = MeasurementSerializer.deserialize(data);
  equal(result.annotations.length, 1);
  ok(typeof result.annotations[0].id === "string");
  ok(result.annotations[0].id.length > 0);
});

test("MeasurementSerializer.buildExportData: 构建导出数据", function () {
  const scheme = [{ id: "p1", type: "栌斗" }];
  const annotations = [{ id: "m1", from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }];
  const scale = { pixelsPerUnit: 40, unitName: "份" };
  const result = MeasurementSerializer.buildExportData(scheme, annotations, scale);
  ok(Array.isArray(result.scheme));
  ok(result.measurement);
  ok(result.measurement.annotations);
});

test("MeasurementSerializer.parseImportData: 解析导入数据", function () {
  const data = {
    scheme: [{ id: "p1", type: "栌斗" }],
    measurement: {
      scale: { pixelsPerUnit: 50, unitName: "份" },
      annotations: []
    }
  };
  const result = MeasurementSerializer.parseImportData(data);
  ok(result !== null);
  ok(Array.isArray(result.scheme));
  ok(result.measurement);
  equal(result.measurement.scale.pixelsPerUnit, 50);
});

test("MeasurementSerializer.parseImportData: null 返回null", function () {
  const result = MeasurementSerializer.parseImportData(null);
  equal(result, null);
});

// ============================================================
// GeometryTransform
// ============================================================

test("GeometryTransform.mirrorCopy: 空选择返回空数组", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1 }];
  const result = GeometryTransform.mirrorCopy(scheme, new Set(), 200);
  deepEqual(result, []);
});

test("GeometryTransform.mirrorCopy: 沿对称轴镜像", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1, dir: "正", connect: "" }];
  const axisX = 300;
  const result = GeometryTransform.mirrorCopy(scheme, new Set(["p1"]), axisX);
  equal(result.length, 1);
  equal(result[0].type, "栌斗");
  equal(result[0].layer, 1);
  equal(result[0].y, 100);

  const originalCenter = 100 + 74 / 2;
  const mirroredCenter = 2 * axisX - originalCenter;
  const expectedX = Math.round(mirroredCenter - 74 / 2);
  equal(result[0].x, expectedX);
});

test("GeometryTransform.mirrorCopy: 未指定轴时使用组中心", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1, dir: "正", connect: "" }];
  const result = GeometryTransform.mirrorCopy(scheme, new Set(["p1"]));
  equal(result.length, 1);
  equal(typeof result[0].x, "number");
});

test("GeometryTransform.batchCopy: 批量复制", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1, dir: "正", connect: "" }];
  const result = GeometryTransform.batchCopy(scheme, new Set(["p1"]), 3, 50);
  equal(result.length, 3);
  equal(result[0].x, 150);
  equal(result[1].x, 200);
  equal(result[2].x, 250);
  equal(result[0].y, 100);
  equal(result[1].layer, 1);
});

test("GeometryTransform.batchCopy: count 至少为1", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1, dir: "正", connect: "" }];
  const result = GeometryTransform.batchCopy(scheme, new Set(["p1"]), 0, 50);
  equal(result.length, 1);
});

test("GeometryTransform.batchCopy: 空选择返回空数组", function () {
  const scheme = [{ id: "p1", type: "栌斗", x: 100, y: 100, layer: 1 }];
  const result = GeometryTransform.batchCopy(scheme, new Set(), 3, 50);
  deepEqual(result, []);
});

// ============================================================
// AutoLayoutConstraintModel
// ============================================================

test("AutoLayoutConstraintModel.getPreferredTypes: 返回层级推荐类型", function () {
  const layer1 = AutoLayoutConstraintModel.getPreferredTypes(1);
  ok(Array.isArray(layer1));
  ok(layer1.includes("栌斗"));

  const layer2 = AutoLayoutConstraintModel.getPreferredTypes(2);
  ok(Array.isArray(layer2));
  ok(layer2.length > 0);
});

test("AutoLayoutConstraintModel.getPlacementMode: 返回放置模式", function () {
  const mode1 = AutoLayoutConstraintModel.getPlacementMode("栌斗", "华拱");
  equal(typeof mode1, "string");
  ok(mode1.length > 0);

  const mode2 = AutoLayoutConstraintModel.getPlacementMode("华拱", "散斗");
  equal(typeof mode2, "string");
});

test("AutoLayoutConstraintModel.calcY: 计算上层构件Y坐标", function () {
  const supporterY = 200;
  const supporterH = 52;
  const newH = 34;
  const y = AutoLayoutConstraintModel.calcY(supporterY, supporterH, newH);
  equal(typeof y, "number");
  ok(y < supporterY);
});

test("AutoLayoutConstraintModel.getSymmetryAxis: 返回对称轴", function () {
  const axis = AutoLayoutConstraintModel.getSymmetryAxis();
  equal(typeof axis, "number");
  ok(axis > 0);
});

test("AutoLayoutConstraintModel.calcYForLayer: 按层计算Y坐标", function () {
  const baseY = 600;
  const y1 = AutoLayoutConstraintModel.calcYForLayer(baseY, 1);
  const y3 = AutoLayoutConstraintModel.calcYForLayer(baseY, 3);
  equal(y1, baseY);
  ok(y3 < baseY);
});

// ============================================================
// AutoLayoutEngine
// ============================================================

function makeMisalignedAutoLayoutScheme() {
  return [
    { id: "base", type: "栌斗", x: 483, y: 620, layer: 1, dir: "正", connect: "柱头" },
    { id: "upper", type: "华拱", x: 460, y: 500, layer: 2, dir: "正", connect: "" }
  ];
}

test("AutoLayoutEngine.generateScheme: 生成多层方案并补齐连接点", function () {
  const scheme = AutoLayoutEngine.generateScheme({
    targetLayers: 3,
    partsPerLayer: 2,
    symmetric: false,
    baseConnect: "柱头"
  });

  ok(Array.isArray(scheme));
  ok(scheme.length >= 3, "应至少生成基础层和上层构件");
  equal(scheme[0].type, "栌斗");
  equal(scheme[0].layer, 1);
  equal(scheme[0].connect, "柱头");
  ok(scheme.some(p => p.layer === 2), "应生成第2层构件");
  ok(scheme.some(p => p.layer === 3), "应生成第3层构件");
  ok(scheme.every(p => typeof p.id === "string" && p.id.length > 0), "每个构件都应有id");
  ok(scheme.every(p => !Object.keys(p).some(k => k.startsWith("_"))), "导出的方案不应包含临时评分字段");
});

test("AutoLayoutEngine.previewRepairPlan: 生成位置与连接点修复预览", function () {
  const scheme = makeMisalignedAutoLayoutScheme();
  const plan = AutoLayoutEngine.previewRepairPlan(scheme, { symmetric: false });
  const repairedUpper = plan.previewScheme.find(p => p.id === "upper");

  ok(plan.hasChanges);
  equal(plan.originalScheme[1].y, 500);
  equal(scheme[1].y, 500, "预览不应修改原始方案");
  equal(repairedUpper.y, 564);
  equal(repairedUpper.connect, "下承栌斗");
  ok(plan.actions.some(a => a.type === "position_adjust" && a.partId === "upper"));
  ok(plan.actions.some(a => a.type === "connect_update" && a.partId === "upper"));
  equal(plan.stats.positionAdjustCount, 1);
  equal(plan.stats.connectUpdateCount, 1);
  ok(plan.affectedPartIds.includes("upper"));
});

test("AutoLayoutEngine.applyRepairPlan: 应用预览并返回方案副本", function () {
  const plan = AutoLayoutEngine.previewRepairPlan(makeMisalignedAutoLayoutScheme(), { symmetric: false });
  const applied = AutoLayoutEngine.applyRepairPlan(plan);

  deepEqual(applied, plan.previewScheme);
  ok(applied !== plan.previewScheme, "返回数组应是副本");
  ok(applied[0] !== plan.previewScheme[0], "返回构件对象应是副本");
});

test("AutoLayoutEngine.repairScheme: 直接返回修复后的方案", function () {
  const scheme = makeMisalignedAutoLayoutScheme();
  const repaired = AutoLayoutEngine.repairScheme(scheme, { symmetric: false });
  const upper = repaired.find(p => p.id === "upper");

  equal(scheme[1].y, 500, "修复不应修改输入方案");
  equal(upper.y, 564);
  equal(upper.connect, "下承栌斗");
});

// ============================================================
// AutoLayoutConflictDetector
// ============================================================

test("AutoLayoutConflictDetector.detectAll: 返回检测结果", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 483, y: 620, layer: 1, dir: "正", connect: "柱头" }
  ];
  const result = AutoLayoutConflictDetector.detectAll(scheme, ["栌斗", "华拱", "昂", "耍头", "散斗"]);
  ok(Array.isArray(result.issues));
  equal(typeof result.errorCount, "number");
  equal(typeof result.warningCount, "number");
  equal(typeof result.totalCount, "number");
});

test("AutoLayoutConflictDetector.detectAll: 对称模式检查对称问题", function () {
  const scheme = [
    { id: "p1", type: "栌斗", x: 400, y: 600, layer: 1, dir: "正", connect: "" }
  ];
  const result = AutoLayoutConflictDetector.detectAll(
    scheme,
    ["栌斗", "华拱", "昂", "耍头", "散斗"],
    { symmetric: true }
  );
  ok(Array.isArray(result.issues));
  ok(result.extraIssues >= 0);
});

test("AutoLayoutConflictDetector.detectAll: 问题按严重程度排序", function () {
  const scheme = [
    { id: "p1", type: "华拱", x: 400, y: 300, layer: 5, dir: "正", connect: "" }
  ];
  const result = AutoLayoutConflictDetector.detectAll(scheme, ["栌斗", "华拱", "昂", "耍头", "散斗"]);
  if (result.issues.length >= 2) {
    const sevOrder = { error: 0, warning: 1, info: 2 };
    for (let i = 1; i < result.issues.length; i++) {
      const prev = sevOrder[result.issues[i - 1].severity] ?? 3;
      const curr = sevOrder[result.issues[i].severity] ?? 3;
      ok(prev <= curr, "问题应按严重程度从高到低排序");
    }
  }
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
runGroup("AssemblyRules 测试", "AssemblyRules");
runGroup("AssemblyChecker 测试", "AssemblyChecker");
runGroup("AssemblyStepCalculator 测试", "AssemblyStepCalculator");
runGroup("MeasurementSerializer 测试", "MeasurementSerializer");
runGroup("GeometryTransform 测试", "GeometryTransform");
runGroup("AutoLayoutConstraintModel 测试", "AutoLayoutConstraintModel");
runGroup("AutoLayoutEngine 测试", "AutoLayoutEngine");
runGroup("AutoLayoutConflictDetector 测试", "AutoLayoutConflictDetector");

const totalPassed = passed;
const totalFailed = failed;

process.stdout.write("\n========================================\n");
process.stdout.write("总计: " + (totalPassed + totalFailed) + " 个测试, 通过 " + totalPassed + ", 失败 " + totalFailed + "\n");
process.stdout.write("========================================\n");

if (totalFailed > 0) {
  process.exit(1);
}
