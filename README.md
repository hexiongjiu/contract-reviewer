<div align="center">

# 合同审查工作台

**DOCX 合同解析 · DeepSeek 结构化审核 · 本地法律语义检索 · 双栏对照编辑 · 履约台账**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5-31572c.svg)](https://nodejs.org/)
[![Local App](https://img.shields.io/badge/runtime-local-176b61.svg)](#下载后使用)

</div>

一个面向中文合同的开源辅助审查工具。它把合同上传、风险识别、法律依据核对、原文定位、修改稿编辑、合同要素提取和履约事项管理放进同一个本地工作台。

> 本项目用于学习、参考和辅助审阅，不构成法律意见或律师服务。AI 和本地检索结果都可能遗漏或误判，实际使用时应核对官方法源并由专业人员判断。

## 功能概览

- **结构化合同审核**：按合同类型和审核立场生成场景化审核重点，输出风险等级、影响方、理由、建议及可替换条款。
- **合同双栏对照**：左侧显示标注合同，右侧保留可直接编辑的合同稿；点击任一侧段落，另一侧自动滚动并高亮对应内容。
- **逐项处理风险**：按风险等级筛选、定位原文、忽略问题，或将建议条款直接采纳到编辑稿。
- **合同要素与履约台账**：提取金额、期限、责任事项和明确日期，支持状态更新、CSV 导出及 ICS 日历导出。
- **本地法律依据库**：收录《民法典》以及 24 份现行法律、司法解释、规定和批复，共约 2,533 条结构化条文；保留层级、施行/修订时间和官方来源地址。
- **混合法律检索**：关键词与主题路由负责高精度初筛，本地小型向量模型补充语义召回，再由大模型复核候选是否真正适用于当前问题。
- **法律依据结果留存**：向量候选、AI 采用结果、复核理由、模型和法律库版本随历史记录写入 SQLite；再次加载不会重复调用 AI。
- **DOCX 导入与导出**：解析表格、列表和常见文本格式，可下载标注合同与修改后的合同。
- **合同问答和段落优化**：围绕当前合同继续提问，或结合审核问题与候选法条优化指定段落。
- **隐私边界清晰**：API Key 仅保存在浏览器；本地服务模式下，审核历史存入本机 SQLite。调用 DeepSeek 时，合同及相关上下文仍会发送到所配置的外部 API。

## 法律依据检索如何工作

```text
合同风险问题
   ├─ 关键词、标题、条号与主题路由
   └─ bge-small-zh-v1.5 本地语义召回
                 ↓
          候选合并与适用范围过滤
                 ↓
             DeepSeek 逐条复核
                 ↓
       AI 已复核并采用 / 未采用 / 失败
                 ↓
          结果与历史记录写入 SQLite
```

向量索引遵循“一条法条，一个存储向量”。较长法条可以在生成向量时按该条内部切片，最后只在同一条法条内部聚合，不会把相邻两条法条混成一个语义片段。当前索引使用 512 维向量，并通过本地 HTTP 接口 `/api/legal-search` 查询。

本地召回不是最终法律结论：只有大模型明确选择的候选才显示为“AI 已复核并采用”；空结果、格式错误或请求失败会显示不同状态，不会伪装成已采用依据。

## 下载后使用

本项目作为本地应用运行。请勿直接双击 `index.html`；向量检索、法律依据复核记录和 SQLite 历史数据库都需要随项目提供的 Node.js 本地服务。

### 使用前准备

1. 安装 [Node.js](https://nodejs.org/) 22.5 或更高版本，建议选择当前 LTS 版本。
2. 准备一个 [DeepSeek API Key](https://platform.deepseek.com/)。
3. 首次安装依赖和首次加载向量模型需要联网；之后模型和依赖会保存在本地。

### Windows：下载 ZIP 后启动

1. 在本仓库页面点击 **Code → Download ZIP**。
2. 将 ZIP 完整解压到一个固定文件夹；不要在压缩包预览窗口中直接运行。
3. 双击解压目录中的 `start-vector-server.cmd`。
4. 第一次启动时，脚本会自动执行 `npm install`。看到 `Contract Reviewer` 地址后，不要关闭命令窗口。
5. 在浏览器打开 `http://127.0.0.1:8765/`。
6. 在“API 配置”中填写 DeepSeek API Key，上传 DOCX 合同后即可开始审核。

首次使用语义检索时，程序会下载量化后的 `Xenova/bge-small-zh-v1.5` 模型，约 24 MB。下载完成后模型缓存在 `server/model-cache/`，以后通常无需重新下载。关闭应用时，回到命令窗口按 `Ctrl+C`；下次仍然双击 `start-vector-server.cmd`。

### 使用 Git 下载并启动

```bash
git clone https://github.com/hexiongjiu/contract-reviewer.git
cd contract-reviewer
npm install
npm start
```

然后打开：

- 合同审查工作台：`http://127.0.0.1:8765/`
- 法律依据库：`http://127.0.0.1:8765/legal-library.html`

仓库已经包含预生成的法条向量索引。只有索引缺失或法律数据发生变化时，才需要手动执行：

```bash
npm run build:vectors
```

### 常见启动问题

- **提示找不到 `node` 或 `npm`**：安装 Node.js 后关闭并重新打开命令窗口，再运行启动脚本。
- **端口 8765 已占用**：先关闭已经运行的本项目窗口，或执行 `node server/vector-server.mjs --port 8878` 改用其他端口。
- **首次法律检索较慢**：通常是在下载或加载本地向量模型，等待完成后再次检索即可。
- **页面能打开但审核失败**：检查 DeepSeek API Key、网络连接、账户余额和所选模型是否可用。
- **历史记录在哪里**：保存在 `server/data/contract-reviewer.sqlite`；升级代码前可单独备份该文件。

## 配置 DeepSeek

在 [DeepSeek 开放平台](https://platform.deepseek.com/) 创建 API Key，并在页面的“API 配置”中填写。Key 只写入当前浏览器的 `localStorage`，不会写入 SQLite、导出合同或 Git 仓库。

项目使用兼容的聊天补全接口并请求 JSON 输出。审核、法律候选复核、段落优化和合同问答都可能产生 API 调用，请留意模型可用性、计费和上下文长度限制。

## 数据存储与隐私

应用使用 Node.js 内置的 `node:sqlite`，无需另外安装数据库软件。首次启动后，历史记录数据库会自动创建在：

```text
server/data/contract-reviewer.sqlite
```

该数据库保存合同正文、审核问题、聊天内容、履约台账和法律依据复核结果。加载历史记录时会直接读取已经保存的依据，不会再次调用 AI；如需按最新内容重新判断，可在对应记录中点击“重新核对”。

如需备份审核数据，请先停止本地服务，再复制整个 `server/data/` 目录。数据库及其可能出现的 `-wal`、`-shm` 文件都可能包含合同信息，不应上传到公共仓库或发送给无权查看合同的人员；这些文件已被项目的 `.gitignore` 排除。

## 法律资料说明

法律依据库当前包括：

- 《中华人民共和国民法典》；
- 劳动合同法、劳动法、公司法、电子签名法、个人信息保护法、数据安全法、著作权法、商标法；
- 民法典合同编通则、总则编、担保制度等司法解释；
- 买卖合同、劳动争议、建设工程、技术合同、著作权、个人信息等相关司法解释、规定及批复。

每份资料的名称、版本、施行时间、官方地址和核查说明见 [`legal-source-review/`](legal-source-review/)。法规会持续变化，仓库中的文本是有核查日期的本地快照，不代表自动实时更新。

## 开源组件与模型

| 项目 | 本项目中的用途 | 许可证 |
|---|---|---|
| [Transformers.js](https://github.com/huggingface/transformers.js) (`@huggingface/transformers` 4.0.1) | 在 Node.js 中运行 ONNX 文本向量模型 | Apache-2.0 |
| [BAAI/bge-small-zh-v1.5](https://huggingface.co/BAAI/bge-small-zh-v1.5)（运行时加载 [Xenova 的量化 ONNX 转换](https://huggingface.co/Xenova/bge-small-zh-v1.5)） | 中文法条与风险问题的 512 维语义向量；两者是同一模型的原始版本与运行格式，不会加载两套模型 | 原模型 MIT；转换文件见其仓库说明 |
| [Mammoth.js](https://github.com/mwilliamson/mammoth.js) | 将 DOCX 解析为 HTML 和纯文本 | BSD-2-Clause |
| [JSZip](https://github.com/Stuk/jszip) 3.10.1 | 读取和修改 DOCX 内部 ZIP/XML | MIT 或 GPL-3.0 |
| [Quill](https://github.com/slab/quill) 1.3.7 | 合同富文本编辑器 | BSD-3-Clause |
| [Node.js](https://github.com/nodejs/node) `node:sqlite` | 本地 HTTP 服务和审核历史数据库 | MIT |
| [Playwright](https://github.com/microsoft/playwright) | 页面级烟雾测试（开发工具，不参与运行） | Apache-2.0 |

更完整的版权和许可证说明见 [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md)。DeepSeek 是外部 API 服务，不作为本仓库内置的开源模型分发。

## 项目结构

```text
contract-reviewer/
├─ index.html                     # 合同审查工作台
├─ legal-library.html             # 统一法律依据库
├─ css/app.css                    # 主界面样式
├─ js/app.js                      # 审核、交互、历史和导出
├─ js/review-core.js              # 结构化结果解析与安全标注
├─ js/legal-basis-data.js         # 结构化法律条文数据
├─ js/legal-basis-evidence.js     # 分层召回、混合排序与依据展示
├─ server/vector-server.mjs       # 本地 Web 服务、向量检索及 SQLite API
├─ server/vector-data/            # 一条法条一个向量的本地索引
├─ scripts/build-vector-index.mjs # 法条向量索引构建脚本
├─ legal-source-review/           # 官方法源留档与版本核查记录
└─ tests/                         # 核心单元测试与页面级烟雾测试
```

主页面的 HTML、CSS 和 JavaScript 已拆分，避免继续把全部逻辑堆在单个 HTML 文件中。

## 测试

```bash
npm test
```

当前单元测试覆盖法律数据唯一 ID、一条法条一个向量、主题路由、语义候选约束、AI 复核状态、法条结构清洗、结构化审核解析、段落匹配和脚本语法。

安装 Playwright 并启动本地服务后，还可以运行：

```bash
npm run test:ui
```

页面级烟雾测试覆盖审核重试、场景化提示词、风险渲染、台账、双栏联动、历史依据复用和法律依据库基本浏览。

## 安全与使用限制

- 不要在公共设备保存真实合同或 API Key。
- 不要把 `server/data/`、浏览器存储、调试日志或测试合同提交到仓库。
- 法律语义相似度只用于候选召回，不能单独证明条文适用。
- “AI 已复核”表示模型执行过候选筛选，不表示律师确认或司法机关认定。
- 下载或分享审核结果前，应人工复核合同正文、修改建议和引用法条。

截至 2026-09-07，`npm audit` 会报告 Transformers.js 的传递依赖 `onnxruntime-node/adm-zip` 与 `sharp/libvips` 的高等级公告，上游依赖树暂未提供兼容修复。项目服务仅监听 `127.0.0.1`；在修复发布前，请勿将端口暴露到公网，也不要用不可信的模型压缩包替换模型缓存。

## 贡献

欢迎提交 Issue 和 Pull Request。修改法律数据时，请同时提供官方来源地址、版本/施行日期，并运行完整测试。更多说明见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## License

项目代码采用 [MIT License](LICENSE)。第三方组件、模型和法律文本分别遵循其各自的许可证或适用规则。

MIT © 2026 hexiongjiu
