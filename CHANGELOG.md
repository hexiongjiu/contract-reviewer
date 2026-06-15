# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-15

### Added
- 民法典查询页，支持全文浏览、关键词/条号搜索、AI 咨询和快速定位条文
- 合同审核意见下方展示 AI 核对后的相关民法典依据
- AI 段落优化和合同问答支持参考相关民法典条文
- 工具顶部与民法典查询页增加免责声明

### Changed
- README 图片统一移动到 `pics/` 目录

## [1.1.1] - 2026-06-13

### Added
- AI 优化原文：右侧原文段落悬停显示 AI 优化按钮，结合审核建议生成可编辑优化版本，确认后替换原文

## [1.1.0] - 2026-05-28

### Added
- 右侧原文面板集成 Quill 富文本编辑器，支持在线修改合同内容
- "下载修改后合同"按钮，编辑内容写入原 DOCX 并保留原始格式
- 本地引入 Quill.js 及样式文件

### Changed
- 上传合同后右侧面板从只读预览改为可编辑的富文本编辑器
- 工具栏支持加粗、颜色、标题、列表等格式操作

## [1.0.0] - 2026-05-22

### Added
- 初始版本 | Initial release
- DOCX 上传与解析
- DeepSeek AI 智能审核（风险提示、条款建议）
- 合同内容自由问答
- 隐私优先设计

