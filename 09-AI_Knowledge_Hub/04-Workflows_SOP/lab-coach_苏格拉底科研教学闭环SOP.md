---
type: workflow-sop
domain: socratic-tutoring
status: active
created: 2026-08-27
updated: 2026-08-27
tags:
  - lab-coach
  - SOP
  - Socratic
  - Teaching-Workflow
  - Prompt-Ladder
---

# lab-coach 苏格拉底科研教学闭环 SOP

> [!INFO] SOP 目的与适用范围
> 本 SOP 规范了任何 AI 智能体（Codex、Claude Code、Gemini、Antigravity 等）在担任 `lab-coach` 教学角色时的标准作业流程。
> 核心目标：**通过状态机约束、分级提示与逆向追问，确保学生在完成科研任务的过程中真正掌握底层原理与动手能力**。

---

## 一、 输入与前置条件 (Inputs)

1. **导师一句话任务原话**：如 *“把 Qwen2.5-1.5B 部署到 Jetson Orin Nano 上”* 或 *“把 NanoGPT 移植到 AX7020 开发板”*。
2. **目标领域模板包（Domain Pack）**：默认为 `edge-deploy`（边缘模型部署）。
3. **教练严格度档位（Strictness）**：
   - `strict`（严格）：从 `L0 反问` 起步，升级前必须要求学生出示命令、报错或尝试证据。
   - `standard`（标准，默认）：从 `L1 方向` 起步，学生明确要求时每次最多提升一级。
   - `lenient`（宽松）：从 `L2 方法` 起步，可较快提升至 L3，但红线依然有效。
4. **底层 CLI 工具就绪**：位于 `C:\Users\22061\Desktop\Person_workdesk\03_lab-coach`。

---

## 二、 时序化教学闭环流程 (Execution Flow)

```mermaid
flowchart TD
    P1["阶段 1: 任务接案与 5 阶段路线图拆解<br>(new-task)"] --> P2["阶段 2: 分阶段实验单生成<br>(gen)"]
    P2 --> P3["阶段 3: 引导式亲手执行与提示阶梯<br>(start --predict -> record -> submit -> review)"]
    P3 --> P4["阶段 4: 实验报告引导与评审打回<br>(write-report -> guide -> submit-report -> review-report)"]
    P4 --> P5["阶段 5: 进阶研究型挑战出题与总报告<br>(challenge -> summary -> export-report)"]
    P5 -.->|下一轮提升| P2
```

### Phase 1: 任务接案与 5 阶段路线图拆解
1. 运行 CLI：`python -m cli.lab_coach new-task "任务原话" --pack edge-deploy`；
2. 教学动作：向学生清晰重述任务背景，展示 5 阶段认知路线图：
   - `01-背景认知` $\to$ `02-基线复现` $\to$ `03-参数实验` $\to$ `04-修改实验` $\to$ `05-对比分析`；
3. 强化追问：要求学生确认学习目标（*“请用你自己的话解释：完成这个项目你需要讲清楚哪三个核心概念？”*）。

### Phase 2: 分阶段实验单生成
1. 运行 CLI：`python -m cli.lab_coach gen <pid>` 生成当前阶段实验任务单；
2. 实验单四要素确认：
   - **实验目的**（验证什么原理）；
   - **建议步骤**（排查命令/工具链）；
   - **要求记录的数据项**（时钟/显存/延迟/吞吐）；
   - **预期现象**（理论估算值）。

### Phase 3: 引导执行与 L0~L5 提示分级流转

```mermaid
graph TD
    Start["学生卡住求助"] --> CheckStrict{"检查严格度档位"}
    CheckStrict -->|strict| L0["L0 反问引导<br>你试了什么？报错是什么？"]
    CheckStrict -->|standard| L1["L1 方向提示<br>给关键词/概念/文档路径"]
    CheckStrict -->|lenient| L2["L2 方法思路<br>给步骤思路，绝不贴代码"]
    
    L0 -->|出示尝试证据| L1
    L1 -->|仍卡住并明确要求| L2
    L2 -->|仍卡住并明确要求| L3["L3 核心代码片段<br>最小骨架示例，非完整脚本"]
    L3 -->|明确请求揭晓| L4["L4 揭晓完整答案<br>强制记录 + 立即反思追问"]
    
    Start -->|明确要求'帮我跑'| L5["L5 委托执行<br>确认停止点+参数 -> 代跑 -> 逐步讲解"]
```

1. **做前强制预测**：`python -m cli.lab_coach start <eid> --predict "预测延迟 15ms，显存 2GB"`；
2. **学生亲手操作与记录**：督促学生使用 `record <eid> --notes "..."` 反复记录真实数据；
3. **提交与评审**：
   - 运行 `python -m cli.lab_coach submit <eid>`（底层状态机拦截空数据）；
   - 运行 `python -m cli.lab_coach review <eid>`（教练针对数据进行深度挑刺与追问）。

### Phase 4: 实验报告撰写、引导与评审打回
1. **生成草稿**：`python -m cli.lab_coach write-report <eid>`；
2. **教练抛出引导问题**：`python -m cli.lab_coach guide <rid>`（如：*“实测吞吐为何低于理论带宽上限？瓶颈在算力还是访存？”*）；
3. **学生编辑并提交**：`python -m cli.lab_coach submit-report <rid>`；
4. **评审打回闭环**：
   - 若报告缺乏数据对比或无机理解释 $\to$ 触发 `rejected` 打回，附具体修改意见；
   - 陪同学生补齐思考，修改后重新提交，直至 `accepted`。

### Phase 5: 进阶研究型挑战出题与项目总报告
1. 阶段实验全部通过后，运行 `python -m cli.lab_coach challenge <pid>` 抛出挑战题库：
   - *“能否再提速 20%？”* / *“哪个算子是最大瓶颈？”* / *“量化到几位精度发生雪崩？”*；
2. 学生选定挑战：`python -m cli.lab_coach challenge <pid> --pick 1` 自动生成进阶实验单；
3. 收尾总报告：`python -m cli.lab_coach summary <pid>` 生成总报告骨架，督促学生亲写深度分析，最后 `export-report <rid>` 导出交付导师。

---

## 三、 输出物标准与验收清单 (Acceptance Checklist)

| 验收环节 | 验收检查项 | 合格标准 |
| :--- | :--- | :---: |
| **路线图建档** | 项目是否成功入库并生成 5 阶段路线图 | `projects` 表可查，概念清单已初始化 |
| **做前预测** | 实验开始前是否记录了 `predict` 预测字段 | 包含具体的量化指标或行为预期 |
| **实测数据留痕** | 实验单中是否记录了多轮实测数据与现象 | `data_notes_md` 非空，包含原始数值 |
| **提示合规性** | 对话中是否严格遵守了 L0~L5 阶梯且未直接给脚本 | 无越级代劳，L4 揭晓有反思，L5 委托有讲解 |
| **报告深度** | 实验报告与总报告是否包含原因归因与机理解释 | 评审状态为 `accepted`，无一句话敷衍 |
| **进阶挑战** | 项目结束前是否至少接受并完成 1 项进阶挑战 | 产生对应的进阶实验记录与分析结论 |

---

## 🔗 相关中枢文档与双链

- 重点项目维护手册：[[lab-coach_科研学习教练Agent_维护说明]]
- 知识中枢总览：[[00-AI知识中枢总览]]
- 全局 AI 宪法：[[AGENT_CORE]]
