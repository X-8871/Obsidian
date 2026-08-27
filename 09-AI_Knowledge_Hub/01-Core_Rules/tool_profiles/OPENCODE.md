---
type: tool-profile
domain: client-governance
client: OpenCode
status: active
created: 2026-08-27
tags: [OpenCode, Tool-Profile, AutoGLM, Feishu, Multi-Platform]
---

# 🤖 OPENCODE 专属行为规范与避坑档案

> [!IMPORTANT]
> 当 AI 运行在 **OpenCode** 客户端环境中时，除遵循 `[[AGENT_CORE]]` 全局宪法外，必须强制执行本档案中的**工具特异性约束**。

---

## 一、 🕊️ 飞书生态与 API 交互合规

1. **凭据安全保护**：
   - 调用 `feishu-doc`、`feishu-drive`、`feishu-chat-history` 等飞书插件时，敏感 App ID 与 App Secret 必须读取环境变量，严禁明文硬编码在脚本中。
2. **频率与速率限制 (Rate Limit)**：
   - 批量导出或同步飞书文档时，设置合理的间隔延迟（如 200~500ms），避免触发 API 频控封锁。

---

## 二、 📱 多端生成与临时工件管理

1. **临时生成物归档清理**：
   - 使用 `autoglm-*` 或多端生成工具创建测试项目（如 Android/Flutter/React Native）时，中间产生的 `.tmp` 缓存与大体积产物需在任务完成后清理。
2. **知识本体与 Obsidian 同步 (`obsidian-ontology-sync`)**：
   - 在执行知识图谱同步时，严格以当前 Obsidian Vault 的真实目录结构为准，不擅自更改现有的数字前缀（`00-`、`01-` 等）与文件名。
