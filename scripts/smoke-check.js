const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "index.html");

let passed = 0;
let failed = 0;
const errors = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("  \u2713 " + name);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log("  \u2717 " + name);
    console.log("    " + e.message);
  }
}

function fileExists(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error("文件不存在: " + relPath);
  }
  if (!fs.statSync(fullPath).isFile()) {
    throw new Error("不是文件: " + relPath);
  }
}

function parseScriptTags(html) {
  const regex = /<script[^>]+src=["']([^"']+)["']/gi;
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1]);
  }
  return results;
}

function parseCssLinks(html) {
  const regex = /<link[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/gi;
  const regex2 = /<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["']/gi;
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1]);
  }
  while ((match = regex2.exec(html)) !== null) {
    if (!results.includes(match[1])) {
      results.push(match[1]);
    }
  }
  return results;
}

console.log("\n  冒烟检查");
console.log("  ========\n");

check("index.html 存在", () => {
  fileExists("index.html");
});

let htmlContent = "";
check("index.html 可读", () => {
  htmlContent = fs.readFileSync(INDEX_HTML, "utf-8");
  if (htmlContent.length < 100) {
    throw new Error("文件内容过短");
  }
});

const cssFiles = parseCssLinks(htmlContent);
const jsFiles = parseScriptTags(htmlContent);

check("CSS 链接数量合理", () => {
  if (cssFiles.length < 3) {
    throw new Error("CSS 文件数量过少: " + cssFiles.length);
  }
  console.log("    共 " + cssFiles.length + " 个 CSS 文件");
});

check("JS 脚本数量合理", () => {
  if (jsFiles.length < 10) {
    throw new Error("JS 脚本数量过少: " + jsFiles.length);
  }
  console.log("    共 " + jsFiles.length + " 个 JS 文件");
});

console.log("\n  CSS 文件检查");
console.log("  -----------");

cssFiles.forEach(css => {
  check("CSS 存在: " + css, () => {
    if (css.startsWith("http://") || css.startsWith("https://")) {
      console.log("    (CDN 资源，跳过本地检查)");
      return;
    }
    fileExists(css);
  });
});

console.log("\n  JS 文件检查");
console.log("  ----------");

const localJsFiles = jsFiles.filter(f => !f.startsWith("http://") && !f.startsWith("https://"));
const cdnJsFiles = jsFiles.filter(f => f.startsWith("http://") || f.startsWith("https://"));

console.log("  CDN 依赖: " + cdnJsFiles.length + " 个");
cdnJsFiles.forEach(f => console.log("    - " + f));

localJsFiles.forEach(js => {
  check("JS 存在: " + js, () => {
    fileExists(js);
  });
});

console.log("\n  JS 语法检查");
console.log("  -----------");

localJsFiles.forEach(js => {
  check("语法正确: " + js, () => {
    const fullPath = path.join(ROOT, js);
    try {
      execSync("node --check " + JSON.stringify(fullPath), {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf-8"
      });
    } catch (e) {
      const stderr = e.stderr || e.message;
      const firstLine = stderr.split("\n")[0];
      throw new Error("语法错误: " + firstLine);
    }
  });
});

console.log("\n  脚本加载顺序检查");
console.log("  ---------------");

const jsOrder = localJsFiles.map(f => f.replace(/^js\//, ""));

const expectedOrder = [
  "templates.js",
  "assemblyRules.js",
  "assemblyChecker.js",
  "selectionManager.js",
  "geometryTransform.js",
  "batchPanel.js",
  "measurementState.js",
  "measurementSerializer.js",
  "annotationRenderer.js",
  "componentData.js",
  "componentDetailRenderer.js",
  "componentEditor.js",
  "renderer.js",
  "assemblyStepCalculator.js",
  "assemblyPlayerState.js",
  "assemblyPlayerUI.js",
  "importParser.js",
  "importValidator.js",
  "importUI.js",
  "schemeStorage.js",
  "schemeState.js",
  "schemeVersionUI.js",
  "schemeDiff.js",
  "schemeDiffUI.js",
  "stateSnapshotManager.js",
  "diffModeManager.js",
  "model3DBuilder.js",
  "threeScene.js",
  "preview3D.js",
  "autoLayoutConstraintModel.js",
  "autoLayoutEngine.js",
  "autoLayoutConflictDetector.js",
  "autoLayoutPanel.js",
  "app.js"
];

check("app.js 最后加载", () => {
  const last = jsOrder[jsOrder.length - 1];
  if (last !== "app.js") {
    throw new Error("app.js 应该最后加载，当前最后是: " + last);
  }
});

check("基础模块在业务模块之前", () => {
  const templateIdx = jsOrder.indexOf("templates.js");
  const rulesIdx = jsOrder.indexOf("assemblyRules.js");
  const appIdx = jsOrder.indexOf("app.js");
  if (templateIdx > rulesIdx) {
    throw new Error("templates.js 应在 assemblyRules.js 之前");
  }
  if (rulesIdx > appIdx) {
    throw new Error("assemblyRules.js 应在 app.js 之前");
  }
});

check("自动排布模块顺序正确", () => {
  const modelIdx = jsOrder.indexOf("autoLayoutConstraintModel.js");
  const engineIdx = jsOrder.indexOf("autoLayoutEngine.js");
  const detectorIdx = jsOrder.indexOf("autoLayoutConflictDetector.js");
  const panelIdx = jsOrder.indexOf("autoLayoutPanel.js");

  if (modelIdx === -1) throw new Error("缺少 autoLayoutConstraintModel.js");
  if (engineIdx === -1) throw new Error("缺少 autoLayoutEngine.js");
  if (detectorIdx === -1) throw new Error("缺少 autoLayoutConflictDetector.js");
  if (panelIdx === -1) throw new Error("缺少 autoLayoutPanel.js");

  if (modelIdx > engineIdx) {
    throw new Error("autoLayoutConstraintModel.js 应在 autoLayoutEngine.js 之前");
  }
  if (engineIdx > detectorIdx) {
    throw new Error("autoLayoutEngine.js 应在 autoLayoutConflictDetector.js 之前");
  }
  if (detectorIdx > panelIdx) {
    throw new Error("autoLayoutConflictDetector.js 应在 autoLayoutPanel.js 之前");
  }
});

console.log("\n  test 目录检查");
console.log("  ------------");

check("测试文件存在", () => {
  fileExists("test/core.test.js");
});

check("测试脚本语法正确", () => {
  const testFile = path.join(ROOT, "test", "core.test.js");
  try {
    execSync("node --check " + JSON.stringify(testFile), {
      stdio: "pipe",
      encoding: "utf-8"
    });
  } catch (e) {
    throw new Error("测试脚本语法错误: " + (e.stderr || e.message).split("\n")[0]);
  }
});

console.log("\n  脚本文件检查");
console.log("  ------------");

const scriptFiles = ["serve.js", "smoke-check.js", "lint.js", "watch-test.js"];
scriptFiles.forEach(f => {
  check("scripts/" + f + " 存在", () => {
    fileExists("scripts/" + f);
  });
});

console.log("\n======== 结果 ========");
console.log("通过: " + passed + " 项");
console.log("失败: " + failed + " 项");
console.log("======================");

if (failed > 0) {
  console.log("\n失败详情:");
  errors.forEach(e => {
    console.log("  - " + e.name + ": " + e.error);
  });
  process.exit(1);
}

console.log("\n  冒烟检查通过 \u2728\n");
