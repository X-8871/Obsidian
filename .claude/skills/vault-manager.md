---
name: vault-manager
description: >
  Obsidian vault management — TRIGGER when user says: 修改知识库, 优化数据库, 增减笔记,
  打开vault, 总结知识库, 整理笔记, 数据库操作, 知识库管理, vault, obsidian, 笔记,
  模板, 目录结构, 索引, 链接. This skill covers all vault read/write operations,
  template management, directory navigation, knowledge base summaries, and note
  organization within C:/Users/22061/Documents/Obsidian Vault.
---

# Obsidian Vault Manager

## Vault Identity

- **Root**: `C:/Users/22061/Documents/Obsidian Vault`
- **Total notes**: ~67 `.md` files across 10 directories
- **Type**: 嵌入式/AI 学习 + 项目管理 + 个人系统

## Directory Map

```
00-索引/          MOC 入口页、类型规范、结构说明
01-Daily/         日记（Daily/子目录）、周报（Weekly/子目录）
02-项目/          嵌赛项目 Older-alert、赛题分析、开发标准
03-知识库/        AI与工作流 + 嵌入式（学习路线/PCB/WiFi/沁恒） + 深度学习
04-课程/          专业课（数电）
05-代码/          WiFi配网源码分析
06-个人/          规划、健身、单词、个人信息
99-模板/          预留模板整理区（当前空）
Temptlaters/      Templater/QuickAdd 模板（Daily.md, note.md, 日报.md, 周报.md, Weekly.md）
```

## Plugins & Templates

| 插件 | 快捷键 | 作用 |
|------|--------|------|
| Templater | `Alt+T` | 插入模板（`Temptlaters/` 目录） |
| QuickAdd | `Ctrl+H` | 创建日报 → `01-Daily/Daily/` |
| QuickAdd | `Ctrl+Shift+H` | 创建周报 → `01-Daily/Weekly/`（弹窗命名） |

**模板清单**:
- `Temptlaters/Daily.md` — 日记模板（Templater 格式，Daily Notes 自动套用）
- `Temptlaters/日报.md` — 日报模板（QuickAdd 格式，`Ctrl+H` 触发）
- `Temptlaters/Weekly.md` — 周报模板（Templater 格式，含 Mon-Sun 结构）
- `Temptlaters/周报.md` — 周报模板（QuickAdd 格式，`Ctrl+Shift+H` 触发）
- `Temptlaters/note.md` — 通用笔记模板（`Alt+T` 触发）

## Rules — 修改

1. **写入必须确认**：任何新建/编辑/删除操作，先说明计划，等用户同意
2. **范围锁定**：只改用户指定的，不趁机扩展
3. **不改正文**：已有笔记的正文内容不动，除非用户明确指向它
4. **不改 frontmatter**：现有 frontmatter（含 mimo 残留的 `type/domain/status`）不主动增删
5. **不改 .obsidian**：插件和主题配置属于禁飞区，除非用户点名

## Rules — 优化

1. **建议先行**：先输出问题和方案，用户点头再执行
2. **不破坏链接**：移动/重命名文件时必须考虑 `[[wikilink]]` 反向链接
3. **对齐分类**：新增内容放入匹配的 `0X-` 目录，不随意建新目录
4. **模板优先**：新建笔记时检查是否有对应模板（Daily/Weekly/note）

## Rules — 禁止

- 禁止在 vault 内创建 AI 残留文件（脚本、`.codex-db`、`.claude/memory` 等）
- 禁止用 `cat -n` / 行号输出覆盖文件
- 禁止注入 `type:/domain:/status:` 等非标准 frontmatter
- 禁止批量重命名

## Operations Reference

### 打开/浏览
- 读 `00-索引/00-总索引.md` 了解全貌
- 读对应 `索引.md` 定位具体领域
- 用 Glob/Grep 搜文件名或内容

### 新建笔记
- 确认目标目录、是否有模板
- 创建后用对应模板填充
- 更新相关索引页的链接

### 总结
- 先扫描目标范围（单文件/单目录/全库）
- 按主题归纳，保留原有 `[[wikilink]]`
- 不确定的地方标注"待确认"

### 整理/优化
- 先扫描，输出现状 + 问题列表
- 每个问题配一个建议方案
- 用户选择后逐条执行
