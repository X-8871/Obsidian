---
type: workflow-sop
domain: agent-quality-validation
project: inkos-mnova
status: active
created: 2026-08-27
updated: 2026-08-27
tags:
  - mNOVA
  - InkOS
  - Validation
  - Anti-Hallucination
  - Gate
  - SOP
---

# mNOVA Agent 能力验证与防幻觉验收 SOP

> [!INFO]
> 本 SOP 对应当前产品基线：**默认简洁爽文模式 + 逐章确定性防幻觉硬校验**。它验证系统是否真实完成，不以模型自述、页面动画或白金评分代替文件和状态证据。

> [!IMPORTANT]
> 原始 API Key 禁止写入命令、截图、日志、测试产物和本文档。更换 provider、base URL、模型、提示词或关键代码提交后，必须新开测试轮次。

---

## 一、输入与前置条件（Inputs）

### 1.1 固定测试基线

- [ ] 记录 Git 提交、分支和工作区状态。
- [ ] 记录 provider、base URL 主机名、模型、temperature 和调用时间，不记录密钥。
- [ ] 准备全新隔离书籍 ID，禁止复用曾出现状态污染或重复伏笔的旧项目。
- [ ] 固定目标章节数、每章目标字数和硬区间。
- [ ] 准备明确创作 brief：主角、题材、爽点、证据来源、未知边界、人物底线和长期结局。
- [ ] 确认模型账户余额和 API 连通性。
- [ ] 确认 `qualityMode` 未显式指定时解析为 `simple`。

### 1.2 Gate 1 推荐固定题材

- 都市规则怪谈，900 章目标，每章目标 2250 字。
- 主角为理性证据调查者，异常只能由时间、温度、监控、门禁和纸面记录等来源展开。
- 未知必须保持未知，猜测不得写成事实。
- 主角不得牺牲无辜者、伪造证据或抹除他人选择。
- 文风要求简洁、直接、节奏快；每章有清楚目标、冲突和即时回报。

### 1.3 预检命令

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\novel-agent\inkos'
git status --short
git log -1 --oneline

pnpm --filter @actalk/inkos-core typecheck
pnpm --filter @actalk/inkos-core build
pnpm --filter @actalk/inkos-studio typecheck
pnpm --filter @actalk/inkos-studio build
```

---

## 二、执行阶段（Execution）

### Phase 1：初始化隔离项目

1. 启动 Studio 并进入 `http://127.0.0.1:4567/#/mnova`。
2. 创建全新的隔离项目，不导入历史书籍记忆。
3. 初始化 mNOVA，不显式传入 `qualityMode`，用来验证系统默认值。
4. 检查：
   - 项目为 `ready`；
   - `validation.valid = true`；
   - `qualityMode = simple`；
   - 真实大纲节点已落盘，不是空壳占位；
   - 不可变契约文件存在。

### Phase 2：冻结契约哈希

```powershell
$book = 'C:\Users\22061\Desktop\Project\novel-agent\books\<隔离书籍ID>'
$contractFiles = @('immutable_truths.yaml','red_lines.yaml','story_promise.yaml')

foreach ($name in $contractFiles) {
    $path = Join-Path $book ('01_contract\' + $name)
    Get-FileHash -Algorithm SHA256 -LiteralPath $path
}
```

把三个 SHA-256 写入本轮 manifest。运行后必须使用同一命令复算，三者逐字一致。

### Phase 3：执行四章简洁模式闭环

1. 提交 `batchChapters = 4`。
2. 监控真实 `runState` 和 `06_runtime/current_run.yaml`，不要只看前端动画。
3. 简洁模式应逐章执行：规划 → 上下文组合 → 正文 → 状态提取 → 状态结算 → 审计/必要修订。
4. 简洁模式不得调用 Platinum Reviewer，不得产生整批白金重写。
5. 等待状态进入明确终态：`completed`、`failed`、`blocked` 或 `cancelled`。

### Phase 4：确定性防幻觉核验

#### 4.1 章节与索引

- [ ] 恰好存在第 1～4 章，无缺章、重章和错号。
- [ ] `chapters/index.json` 与实际文件一一对应。
- [ ] 每章正文均在设定硬区间；2250 字目标对应 2000～2500 字。
- [ ] 没有临时文件、半章或失败后伪造的完成记录。

#### 4.2 状态结算

- [ ] `current_state.json` 已结算到第 4 章。
- [ ] `chapter_summaries.json` 包含第 1～4 章且顺序一致。
- [ ] mNOVA 水位、当前窗口和冻结边界均到第 4 章。
- [ ] `validation.valid = true`，不存在未处理的结构问题。

#### 4.3 伏笔身份与生命周期

```powershell
$hooksPath = Join-Path $book 'story\state\hooks.json'
$hooks = Get-Content -LiteralPath $hooksPath -Raw -Encoding UTF8 | ConvertFrom-Json
$ids = @($hooks.hooks | ForEach-Object { if ($_.hookId) { $_.hookId } else { $_.id } })
$duplicateIds = @($ids | Group-Object | Where-Object Count -gt 1)

[PSCustomObject]@{
    HookCount = $ids.Count
    MissingId = @($ids | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count
    DuplicateIdGroups = $duplicateIds.Count
}
```

通过条件：`MissingId = 0` 且 `DuplicateIdGroups = 0`。

#### 4.4 契约与事实边界

- [ ] 三份不可变契约 SHA-256 与运行前一致。
- [ ] 章节未把“未知/猜测”升级为无来源事实。
- [ ] 新事实可以追溯到正文中的观察、行为、记录或对话。
- [ ] 主角没有违反不可牺牲无辜、不可伪造证据、不可抹除他人选择的底线。
- [ ] 不存在跨项目人物、设定、伏笔或记忆泄漏。

#### 4.5 质量模式证明

- [ ] `studio_control.yaml` 中 `qualityMode: simple`。
- [ ] 本轮 `runState.platinum = null`。
- [ ] `latestPlatinumReview = null`，或没有本轮新增白金报告。
- [ ] `platinum_ledger.yaml` 的本轮报告数为 0。

### Phase 5：失败安全测试

至少保留一条模型失败路径证据：

1. API 返回 402、超时或非法 JSON 时，运行必须进入 `failed`，错误可诊断。
2. 失败发生在正文写入前时，章节数量必须保持 0。
3. 失败后契约哈希必须不变，水位不得前进。
4. 重启 Studio 后，终态任务不得自行复活；仅显式重试才可再次调用模型。
5. pause/cancel 必须在安全边界生效，不得留下重复章节。

> [!NOTE]
> `402 Insufficient Balance` 是有效的失败安全证据，但不能证明真实四章生产通过。充值或更换有余额的同一路由凭据后，仍须重新执行完整 Gate 1。

### Phase 6：证据归档

每轮至少保存：

```text
docs/validation/mnova/<日期>-gate1-<轮次>/
├── manifest.yaml                 # Git、模型、参数、项目 ID、契约哈希
├── checkpoint-0004.json          # 章节、水位、状态、伏笔检查点
├── model-routing-ledger.jsonl    # Agent、主机名、模型、Token、结果；无密钥
├── defects.csv                   # P0/P1/P2 缺陷与复现步骤
└── scorecard.md                  # 硬门槛、结论与下一步
```

---

## 三、输出标准与验收清单（Acceptance Checklist）

### 3.1 Gate 1 简洁模式通过条件

- [ ] 默认质量模式为 `simple`，未发生白金调用或整批重写。
- [ ] 第 1～4 章真实生成并完成结算。
- [ ] 缺章、重章、错号均为 0。
- [ ] 字数硬区间通过率 100%。
- [ ] 契约哈希变化次数为 0。
- [ ] P0 契约、因果和连续性问题为 0。
- [ ] 伏笔缺失 ID 和重复 ID 均为 0。
- [ ] 状态、摘要、窗口、水位和章节索引一致。
- [ ] 未知/猜测没有被伪装为事实。
- [ ] 原始 API Key 出现在产物、日志、Prompt 或 Git 中的次数为 0。
- [ ] 失败路径没有留下半完成却显示成功的状态。
- [ ] 人工快速抽检确认文风简洁、爽点明确、没有明显设定幻觉。

### 3.2 停止条件

出现以下任一情况，立即停止升级 Gate：

- 契约被修改或跨项目记忆污染；
- 缺章、重章、章节编号错乱；
- 重复伏笔 ID 被静默覆盖；
- 模型失败却标记为完成；
- 章节越出硬字数区间仍被接受；
- 原始密钥进入日志、文件或 Git；
- 为了“跑通”而关闭防幻觉硬校验。

### 3.3 Gate 2 交接前置条件

只有 Gate 1 全部打勾后，才可以：

1. 更新 `docs/plans/2026-08-20-mnova-agent-capability-validation.md`，把旧的强制白金口径改为当前默认简洁模式；
2. 生成新的 Gate 1 证据目录和结论；
3. 在 HANDOFF 中写明 Git 提交、项目 ID、模型路由、契约哈希和待执行的 Gate 2 节点；
4. 开始 24～40 章反馈适应测试。

---

## 🔗 相关中枢文档与双链

- 项目维护手册：[[InkOS_mNOVA小说Agent_维护说明]]
- 知识中枢总览：[[00-AI知识中枢总览]]
- 跨 Agent 交接：[[HANDOFF_PROTOCOL]]
- 本机开发环境：[[常用开发环境与工具链]]
