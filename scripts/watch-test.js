const fs = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const JS_DIR = path.join(ROOT, "js");
const TEST_DIR = path.join(ROOT, "test");
const TEST_FILE = path.join(TEST_DIR, "core.test.js");

let running = false;
let pending = false;

function runTests() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  pending = false;

  console.log("\n  运行测试...\n");

  try {
    const output = execSync("node " + JSON.stringify(TEST_FILE), {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: "pipe"
    });
    console.log(output);
    console.log("  ✅ 测试通过");
  } catch (e) {
    console.log(e.stdout || "");
    console.log(e.stderr || "");
    console.log("  ❌ 测试失败");
  }

  running = false;
  if (pending) {
    setTimeout(runTests, 100);
  }
}

function watchDir(dir) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".js")) {
      console.log("\n  文件变化: " + path.join(path.basename(dir), filename));
      runTests();
    }
  });
}

console.log("\n  测试监听模式");
console.log("  ============");
console.log("  监听目录: js/, test/");
console.log("  按 Ctrl+C 退出\n");

watchDir(JS_DIR);
watchDir(TEST_DIR);

runTests();
