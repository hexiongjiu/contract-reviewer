# 贡献指南

感谢参与合同审查工作台的开发。普通使用者只需阅读 [`README.md`](README.md)；本文件面向准备修改代码、法律数据或测试用例的贡献者。

## 开发环境

- Node.js 22.5 或更高版本
- npm
- 首次安装依赖和加载向量模型时可访问 npm 与 Hugging Face

```bash
git clone https://github.com/hexiongjiu/contract-reviewer.git
cd contract-reviewer
npm install
npm start
```

本地服务默认地址为 `http://127.0.0.1:8765/`。

## 单元测试

```bash
npm test
```

单元测试覆盖法律数据唯一 ID、一条法条一个存储向量、主题路由、语义候选约束、AI 复核状态、法条结构清洗、结构化审核解析、段落匹配和脚本语法。

## 页面级烟雾测试

Playwright 已声明为开发依赖。首次运行前安装 Chromium：

```bash
npx playwright install chromium
```

先在一个终端启动应用：

```bash
npm start
```

再在另一个终端运行：

```bash
npm run test:ui
```

页面测试覆盖审核重试、场景化提示词、风险渲染、履约台账、双栏联动、历史依据复用和法律依据库基本浏览。测试会创建和更新本地测试历史；请在独立的开发副本中运行，不要复用存有真实合同的 `server/data/`。

## 修改法律数据

修改或新增法规时，需要同时：

1. 提供全国人大或最高人民法院等官方来源地址；
2. 核对文件全称、文号、修订/施行时间及现行有效状态；
3. 保留编、章、节、一般规定等结构层级；
4. 更新 `legal-source-review/` 中的来源记录；
5. 重新生成 `js/legal-basis-data.js`；
6. 执行 `npm run build:vectors` 重建法条向量索引；
7. 运行完整测试。

向量索引必须保持一条法条对应一个存储向量。长法条可以在该条内部切片和聚合，不得跨法条合并语义片段。

## 代码风格

- 页面结构放在 HTML，样式放在 `css/`，业务逻辑放在 `js/` 或 `server/`。
- JavaScript 使用 4 个空格缩进，并延续所在文件的命名方式。
- 不提交 `node_modules/`、`server/model-cache/`、`server/data/`、调试日志、API Key 或测试合同。
- 提交前运行 `npm test` 和 `git diff --check`。

## 提交 Pull Request

1. Fork 仓库并创建功能分支；
2. 完成修改和测试；
3. 提交清晰的变更说明、验证方法和必要截图；
4. 发起 Pull Request。

提交贡献即表示同意以本项目的 MIT License 发布相应代码。第三方组件、模型和法律文本仍遵循各自的许可证或适用规则。
