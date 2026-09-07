# 安全说明

## 数据边界

- 本地服务只监听 `127.0.0.1`，不应反向代理或暴露到公网。
- API Key 保存在浏览器本地存储中。
- 合同、审核记录、聊天内容、履约台账和法律依据结果可保存在 `server/data/contract-reviewer.sqlite`。
- 调用 DeepSeek API 时，合同及相关上下文会发送给外部服务，请在使用前确认相应的服务条款和数据处理要求。
- 模型文件应从 README 所列的 Hugging Face 仓库获取，不应加载来源不明的模型缓存或压缩包。

## 已知依赖公告

截至 2026-09-07，`npm audit` 报告了 Transformers.js 传递依赖中的高等级公告：

- `onnxruntime-node` 使用的 `adm-zip`：[GHSA-xcpc-8h2w-3j85](https://github.com/advisories/GHSA-xcpc-8h2w-3j85)
- `sharp` 继承的 `libvips` 公告：[GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)

当前依赖树暂未提供兼容修复。项目只处理随仓库生成的向量索引和受信任的上游模型文件，不提供任意 ZIP 或图像上传入口；这些限制不能替代上游修复。维护者应在新版本发布后重新运行 `npm audit` 并评估升级。

## 报告漏洞

如发现安全问题，请优先使用 GitHub 仓库的 Security 页面私下联系维护者。不要在公开 Issue 中附上真实合同、API Key、数据库文件、可直接利用的攻击载荷或其他敏感信息。
