---
type: agent-protocol
domain: task-handoff
status: active
created: 2026-08-26
tags: [Handoff, Protocol, Multi-Agent, Workflow]
---

# 🔄 HANDOFF_PROTOCOL: 多 AI 工具任务交接协议

> [!IMPORTANT]
> 当人类协作者准备在 **Antigravity、Codex、Workbuddy、OpenCode** 等工具之间切换，或当前 AI 完成阶段性任务时，必须生成或更新本交接看板（通常位于项目根目录的 `HANDOFF.md`）。

---

## 一、 交接看板标准结构模板 (HANDOFF.md Template)

每个交接看板必须保持紧凑、精准，包含以下 5 个核心要素：

```markdown
# 📋 任务交接看板 (Task Handoff State)

> **更新时间**: YYYY-MM-DD HH:mm (UTC+8)  
> **交接方**: [如 Antigravity / OpenCode] -> **接手方**: [如 Codex / Workbuddy]

## 1. 🎯 当前核心目标 (Goal)
- [简明扼要说明当前阶段要达成的具体目标]

## 2. 💡 已完成工作与关键决策 (Decisions & Completed)
- [x] **已完成项**: [说明完成的文件或模块]
- **关键技术决策**: [说明为何采用此方案，防止接手模型推倒重来]

## 3. 📂 当前代码/文件状态 (Current State)
- **已修改文件**:
  - `src/...` (完成某功能)
  - `tests/...` (通过单元测试)
- **当前存在状态/分支**: [如 master / feature-xyz，是否可编译运行]

## 4. 🚀 接手后的下一步待办 (Next Actions)
1. [第一步要执行的动作或测试]
2. [第二步要实现的代码逻辑]

## 5. ⚠️ 已知雷区与避坑提示 (Blockers & Gotchas)
- [记录已发现的坑，避免接手模型重复踩坑]
```

---

## 二、 切换与交接执行流程

1. **交接前（工具 A）**：
   - 任务阶段性结束或遇到瓶颈准备换工具时，输出上述标准的 `HANDOFF.md` 到当前项目根目录。
2. **接手时（工具 B）**：
   - 用户只需在接手工具中发送指令：“**读取 AGENT_CORE 与项目根目录的 HANDOFF.md，继续执行下一步。**”
   - 接手工具阅读上下文后，无需任何额外多轮重复对齐，直接开始执行 `4. 下一步待办`。
