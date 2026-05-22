<div align="center">

# 📜 AI合同审核工具 | Contract Review Assistant

**上传 DOCX · 智能审核 · AI问答 · 保留格式导出**

[![Deploy to GitHub Pages](https://github.com/hexiongjiu/contract-reviewer/actions/workflows/pages.yml/badge.svg)](https://github.com/hexiongjiu/contract-reviewer/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://hexiongjiu.github.io/contract-reviewer/)

</div>

---

## 🇨🇳 中文说明

### 这是什么？

纯前端 AI 合同审核工具，支持上传 DOCX 合同，配置审核选项（风险提示、条款建议等），调用 DeepSeek API 进行智能审核，并支持基于合同内容的自由问答，数据 100% 保留在浏览器本地，API Key 不上传任何第三方服务器。

### ✨ 功能特性

- 📄 **DOCX 上传与解析**（基于 Mammoth.js）
- 🤖 **DeepSeek AI 智能审核**
  - 风险提示 / Risk alerts
  - 条款建议 / Clause suggestions
  - 合规检查 / Compliance checklist
- 💬 **合同内容自由问答**
- 🔑 **隐私优先**
  - API Key 仅存储在浏览器 `localStorage`
  - 所有请求直接发往 DeepSeek 官方，无中间服务器
- 📥 **保留格式导出**

---

## 🇺🇸 English

### What is this?

A 100% front-end AI contract review tool. Upload DOCX contracts, configure review options, call DeepSeek API for smart review, and support free Q&A about the contract content. All data stays in your browser locally.

---

## 🚀 快速开始 / Quick Start

### 在线使用 / Online

直接访问 Pages 网址，无需安装。

### 本地运行 / Run Locally

```bash
git clone https://github.com/hexiongjiu/contract-reviewer.git
cd contract-reviewer
# 用浏览器打开 index.html 即可 / Just open index.html in your browser
```

---

## 📝 License

MIT © 2026 hexiongjiu

