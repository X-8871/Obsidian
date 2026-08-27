---
type: tool-profile
domain: client-governance
client: Codex
status: active
created: 2026-08-27
tags: [Codex, Tool-Profile, Computer-Use, Governance]
---

# ⚡ CODEX 专属行为规范与避坑档案

> [!IMPORTANT]
> 当 AI 运行在 **OpenAI Codex** 客户端环境中时，除遵循 `[[AGENT_CORE]]` 全局宪法外，必须强制执行本档案中的**工具特异性约束**。

---

## 一、 🖥️ 桌面控制与 Node 运行时生命周期 (Computer-Use & Node REPL)

1. **子进程与管道清理**：
   - 调用 `node_repl` 或 `computer-use` 插件执行系统级操作后，必须确保所有的中间管道与子进程正常结束，避免遗留未释放的进程句柄。
2. **沙箱与权限操作审慎原则**：
   - 当前环境为 Windows Elevated Sandbox 模式，在执行高危系统指令、注册表或文件覆盖前，必须向用户进行显式二次确认。

---

## 二、 🛠️ 代码重构与质量审计准则 (Ponytail 规范)

1. **增量重构原则**：
   - 使用 Ponytail 或技术债分析工具时，禁止大面积推倒已有稳定代码，必须采用小步提交、单元测试覆盖的渐进式演进策略。
2. **ESP32 与 LVGL 专项**：
   - 当涉及 `esp32-s3-lvgl-ui` 开发时，必须遵守项目的物理路径规范，并确保构建命令与专用 Python 3.11 路径对齐。

---

## 三、 📄 跨工具状态同步

- 在 Codex 中完成阶段性编码后，必须在当前项目根目录实时输出/刷新 `HANDOFF.md` 看板，便于 Antigravity 或 OpenCode 接手。
