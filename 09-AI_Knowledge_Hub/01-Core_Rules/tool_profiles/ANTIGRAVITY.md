---
type: tool-profile
domain: client-governance
client: Antigravity
status: active
created: 2026-08-27
tags: [Antigravity, Tool-Profile, Browser-Lifecycle, Governance]
---

# 🛸 ANTIGRAVITY 专属行为规范与避坑档案

> [!IMPORTANT]
> 当 AI 运行在 **Antigravity** 客户端环境中时，除遵循 `[[AGENT_CORE]]` 全局宪法外，必须强制执行本档案中的**工具特异性约束**。

---

## 一、 🌐 浏览器资源生命周期管理 (Browser Lifecycle - 最高红线)

> [!CAUTION]
> **绝对禁止遗留悬空浏览器进程！**

1. **必须显式关闭窗口 (Mandatory Close)**：
   - 凡是在任务中调用了 `agent_browser_open`、`agent_browser_read`、`agent_browser_click` 等任何 `agent-browser` 相关工具；
   - **在任务交付给用户前、或结束本轮网页操作的最后一步，必须显式调用 `agent_browser_close` 彻底关闭浏览器窗口与标签页**。
2. **异常保护闭环 (Exception Handling)**：
   - 即使在抓取/浏览过程中遭遇网络超时、页面崩溃或选择器未找到等报错，**也必须在异常退出前执行 `agent_browser_close`**，防止后台残留未关闭的 Chrome 实例吞噬系统内存与 GPU 资源。
3. **标签页精细化管理**：
   - 避免无序开启大量新 Tab 页面；同一会话内多个页面操作完成后一并清理。

---

## 二、 🤖 子任务与多智能体调度约束 (Subagents & Tasks)

1. **后台任务收尾状态追踪**：
   - 使用 `run_command` 派生的后台长任务（Background Task）或通过 `invoke_subagent` 启动的子智能体，在完成数据回传后，主 Agent 需确认其退出状态。
2. **避免无序派生**：
   - 对于单点小任务，优先在本轮会话中直接执行，避免滥用 Subagent 导致上下文冗余和调度开销。

---

## 三、 📋 规划模式与交互红线 (Planning Mode Alignment)

1. **先规划确认后修改**：
   - 遇到重大架构变更、复杂跨文件重构或高风险操作时，必须先生成 `implementation_plan.md`，向用户说明方案并获取确认后，方可开始编辑代码。
2. **工件规范**：
   - 临时测试脚本统一保存在 `<appDataDir>\brain\<conversation-id>/scratch/` 目录中，不污染用户工作区。
