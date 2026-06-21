# 古建筑斗拱拆解排布模拟

拖拽构件到画布，设置层级和连接点，检查装配关系。支持构件放置、拖拽、层级连接设置、装配检查、爆炸图、本地保存和导出JSON。

## 使用方式

### 方式一：直接打开（零依赖）

直接在浏览器中打开 `index.html` 即可使用，无需任何构建工具或依赖安装。

### 方式二：本地开发服务器

需要 Node.js 18+ 环境。

```bash
# 启动本地开发服务器（默认端口 8080）
npm start

# 或使用 dev 别名
npm run dev

# 指定端口
PORT=3000 npm start
```

启动后访问 `http://localhost:8080`。

## 工程化命令

### 测试

```bash
# 运行所有测试
npm test

# 监听模式：文件变化自动重跑测试
npm run test:watch
```

测试覆盖的纯逻辑模块：
- **ImportParser** - 导入解析
- **ImportValidator** - 导入校验
- **SchemeDiff** - 方案差异对比
- **AssemblyRules** - 装配规则
- **AssemblyChecker** - 装配检查
- **AssemblyStepCalculator** - 装配步骤计算
- **MeasurementSerializer** - 测量标注序列化
- **GeometryTransform** - 几何变换（镜像、批量复制）
- **AutoLayoutConstraintModel** - 自动排布约束模型
- **AutoLayoutConflictDetector** - 自动排布冲突检测

### 冒烟检查

```bash
# 运行冒烟检查（文件存在性、脚本顺序、语法正确性）
npm run smoke
```

冒烟检查内容：
- `index.html` 存在且可读
- 所有 CSS / JS 引用文件存在
- 所有 JS 文件语法正确（`node --check`）
- 脚本加载顺序正确（基础模块在前，业务模块在后，`app.js` 最后）
- 自动排布模块顺序正确
- 测试文件存在且语法正确
- 工程化脚本文件存在

### 代码静态检查

```bash
# 运行轻量 lint 检查
npm run lint
```

检查项：
- 遗留 `debugger` 语句
- `console.log` 调试输出
- `TODO` 注释

### 完整验证

```bash
# 冒烟检查 + 单元测试
npm run verify
```

## 项目结构

```
├── index.html              # 入口页面
├── package.json            # 工程化配置（零运行时依赖）
├── css/                    # 样式文件
├── js/                     # 业务脚本（按加载顺序排列）
│   ├── templates.js        # 模板数据
│   ├── assemblyRules.js    # 装配规则（纯逻辑）
│   ├── assemblyChecker.js  # 装配检查（纯逻辑）
│   ├── ...
│   └── app.js              # 应用入口（最后加载）
├── test/
│   └── core.test.js        # 单元测试
└── scripts/                # 工程化脚本
    ├── serve.js            # 静态文件服务器
    ├── smoke-check.js      # 冒烟检查
    ├── lint.js             # 轻量 lint
    └── watch-test.js       # 测试监听
```

## 架构约束

### 全局脚本顺序加载

所有 JS 文件通过 `<script>` 标签按顺序加载，模块之间通过全局变量通信。新增模块时需在 `index.html` 中按依赖顺序插入，并确保：
- 纯逻辑模块在前，UI 模块在后
- 被依赖的模块先加载
- `app.js` 始终在最后

### 浏览器 API 缺失处理

纯逻辑模块可在 Node.js 环境下直接测试。对于依赖浏览器 API 的场景：
- `crypto.randomUUID` - 测试中已 polyfill
- `localStorage` / `FileReader` 等 - 仅限 UI 模块使用，纯逻辑模块不依赖

### Three.js 外部依赖

Three.js 通过 CDN 加载，不参与打包。纯逻辑测试不依赖 Three.js，UI 模块需在浏览器环境下运行。

### 无打包器

项目不使用 Webpack / Vite 等打包工具，保持原生 HTML/JS 方式。如需添加新模块：
1. 在 `js/` 目录创建文件
2. 在 `index.html` 中按顺序添加 `<script>` 标签
3. 使用 `if (typeof module !== "undefined") module.exports = { ... }` 兼容 Node.js 测试

## 开发约定

### 模块导出模式

每个模块同时支持浏览器全局变量和 Node.js CommonJS：

```js
const MyModule = { ... };

// 浏览器中作为全局变量，Node.js 中可 require
if (typeof module !== "undefined") module.exports = { MyModule };
```

### 新增测试

在 `test/core.test.js` 中添加测试用例，使用内置断言：

```js
test("模块名.方法名: 描述", function () {
  equal(actual, expected);
  deepEqual(actualObj, expectedObj);
  ok(condition, "断言描述");
});
```

然后在文件末尾的 `runGroup` 调用中添加对应测试组。
