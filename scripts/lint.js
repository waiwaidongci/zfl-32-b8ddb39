const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const JS_DIR = path.join(ROOT, "js");
const TEST_DIR = path.join(ROOT, "test");

let issues = 0;
let filesChecked = 0;

function listJsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileIssues = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    if (line.includes("debugger")) {
      fileIssues.push({ line: lineNum, msg: "遗留 debugger 语句" });
    }

    if (/\bconsole\.log\s*\(/.test(line) && !/\/\/.*console\.log/.test(line)) {
      fileIssues.push({ line: lineNum, msg: "console.log 调试输出" });
    }

    if (/\btodo\b/i.test(line) && /\/\//.test(line)) {
      fileIssues.push({ line: lineNum, msg: "TODO 注释" });
    }
  });

  if (fileIssues.length > 0) {
    console.log("\n  " + relPath);
    fileIssues.forEach(issue => {
      console.log("    L" + issue.line + ": " + issue.msg);
    });
    issues += fileIssues.length;
  }
  filesChecked++;
}

console.log("\n  代码静态检查 (Lint)");
console.log("  ==================\n");

const jsFiles = listJsFiles(JS_DIR);
const testFiles = listJsFiles(TEST_DIR);
const allFiles = [...jsFiles, ...testFiles];

allFiles.forEach(checkFile);

console.log("\n  --------");
console.log("  检查文件: " + filesChecked + " 个");
console.log("  发现问题: " + issues + " 个");

if (issues > 0) {
  console.log("\n  ⚠️  请检查上述问题\n");
} else {
  console.log("\n  ✨ 检查通过，未发现问题\n");
}

process.exit(issues > 0 ? 1 : 0);
