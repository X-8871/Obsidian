# 第 1 天讲义：PS `main.c` 硬件契约段（2026-08-11）

> 本讲义配套 `17_改代码与全流程学习计划_2026-08-11至17.md` 第三节使用。
> 教学 AI 按本讲义逐段讲解；每段讲完让用户复述，复述通过再进下一段。
> 行号基于当前工程版本，若与用户本地略有出入，以内容搜索为准。

**唯一教学文件**：`D:\FPGA\NanoGPT\nanogpt-zynq-backups-main - 副本\ps\src\main.c`（共 898 行）
**辅助查阅**：`NanoGPT_PS+PL_重要参数汇总.md`

---

## 〇、开场总图（讲 5 分钟，先建立位置感）

先给用户画这张图，告诉他：今天不学算法，只学"PS 这台总指挥怎么发号施令"。

```text
电脑串口上位机
   │  USB-UART（115200 8N1）
   ▼
PL 里的 UART 桥（pl_uart_ps_bridge.v）
   │  寄存器：REG_UART_RX_DATA / TX_DATA / STATUS
   ▼
PS main.c ──────────────┐
   │ ① 读串口字符        │ ② 写寄存器下命令（wr32）
   │ ③ 轮询状态（rd32）  │ ④ 从 DDR 读结果
   ▼                     ▼
PL Transformer 流水线 ←── 寄存器组（基地址 0x40000000）
   │
   ▼ 结果写回 DDR
PS 读出 Token ID → 查表变字符 → 串口发回电脑
```

**一句话定位**：`main.c` 是裸机 C 程序，没有操作系统。它手里只有两件武器——`wr32`（往地址写 32 位数）和 `rd32`（从地址读 32 位数）。全文件 898 行，本质上就是在对的时间和地址，用这两件武器收发数据。

**类比**：PS 是餐厅经理，PL 是后厨。经理不下厨，只做三件事：把订单（寄存器）递给厨房、等"出餐"灯亮（状态轮询）、把菜（DDR 里的结果）端给客人（UART）。今天学的是经理手里的**菜单和地址簿**（前 120 行常量区）。

✅ 复述检查点：让用户回答"main.c 控制硬件的两件武器是什么？"——答出 `wr32`/`rd32` 且知道"写哪个地址就是操作哪个硬件"，才继续。

---

## 一、第一段：寄存器定义（约 L4~L37）—— 经理的订单格式

### 讲解要点

```c
#define PL_BASE            0x40000000u
#define REG_CONTROL        0x00u
#define REG_STATUS         0x04u
#define REG_MODE           0x30u
#define REG_FULL_INPUT     0x40u
...
```

1. `PL_BASE = 0x40000000`：PL 寄存器组在 PS 地址空间里的门牌号。Zynq 的 PS 和 PL 通过 AXI（Advanced eXtensible Interface，高级可扩展接口）总线连接，对 C 代码来说，"写硬件寄存器"就是"往 `0x40000000 + 偏移` 这个地址写数"。
2. 每个 `REG_*` 是偏移量。实际地址 = `PL_BASE + 偏移`，例如状态寄存器在 `0x40000004`。
3. 讲三个最关键的：
   - `REG_CONTROL`（0x00）：下单按钮。写 `CTRL_START`（0x01）= 开工；写 `CTRL_CLEAR`（0x02）= 复位清状态。
   - `REG_STATUS`（0x04）：出餐灯。`wait_done()`（L425）就是死循环读它：bit1=忙、bit0=完成、bit2=错误。
   - `REG_MODE`（0x30）：菜品编号。`MODE_ATTN`=做注意力、`MODE_FFN_ONLY`=只做前馈网络、`MODE_LM_HEAD_FAST`=只做最后一层分类头……`run_mode()`（L448）每次开工前先写它。
4. `REG_FULL_INPUT/OUTPUT/WEIGHTS/SCALES`（0x40~0x4C）：告诉 PL"原料在 DDR 哪个地址、做完放哪"。**这是 PS↔PL 协作的核心模式：数据不经过寄存器搬运，只传地址，PL 自己去 DDR 取。**

### 复述提问

- Q：PS 想让 PL 开始算一层注意力，按顺序要写哪几个寄存器？
- 期望答案方向：先 `CTRL_CLEAR` 复位 → 写 `REG_MODE=MODE_ATTN` → 写输入/输出/权重地址 → 最后写 `CTRL_START` → 轮询 `REG_STATUS`。（可对照 `run_attn()` L471~487 验证）

---

## 二、第二段：DDR 地址映射（约 L39~L59）—— 仓库货架编号

### 讲解要点

```c
#define LAYER_A_BASE       0x10000000u
#define LAYER_B_BASE       0x10020000u
#define QBUF_BASE          0x10040000u
...
#define WEIGHTS_BASE       0x11000000u
#define K_CACHE_BASE       0x10200000u
#define MAILBOX_BASE       0x00020000u
```

1. DDR（Double Data Rate，双倍数据速率内存）是 PS 和 PL 共享的大仓库。这里每个宏是一个"货架区的起始编号"。
2. 重点讲四组：
   - `LAYER_A_BASE`/`LAYER_B_BASE`：层与层之间的乒乓缓冲区——第 0 层从 A 读到 B，第 1 层从 B 读到 A（见 `run_layer()` L491~492 的 `layer & 1` 切换），避免来回拷贝。
   - `WEIGHTS_BASE`：所有量化权重的大本营。配合 L79~L85 的层内偏移：`OFF_WQ/WK/WV/WO/W1`，以及层距 `LAYER_STRIDE = 0x1B0000`。**必须让用户现场算一遍**：第 2 层 WQ 地址 = `0x11000000 + 2×0x1B0000 + 0x000000` = `0x11360000`。
   - `K_CACHE_BASE`/`V_CACHE_BASE`：每层的 KV 缓存（KV Cache，键值缓存），生成新 token 时不用重算历史——这是 `generate_greedy` 能逐 token 增量推理的关键。
   - `MAILBOX_BASE = 0x00020000`：邮箱，PS 和电脑调试器（XSDB/JTAG）之间的留言板。`mailbox_write(i, v)`（L236）就是往 `0x20000 + i×4` 写字。调试脚本 `dump_*.tcl` 读的就是这里。
3. 顺带解释 `TOK_EMB_I8_BASE`（0x13000000）：INT8 量化后的 token 嵌入表也在 DDR 里，是 Python 端预生成、烧写进去的。

### 复述提问

- Q：为什么 K/V 要每层各开一块缓存（`KV_CACHE_STRIDE`），而不是共用一块？
- 期望答案方向：每层注意力都有自己历史token的 K/V，6 层各不相同，所以要按层分开存，生成时逐层追加。

---

## 三、第三段：模型维度与命令（约 L61~L98）—— 这家餐厅的基本参数

### 讲解要点

```c
#define BLOCK_SIZE         256u
#define VOCAB_SIZE         65u
#define D_MODEL            384u
#define MAX_NEW_TOKENS     200u
```

1. 三个数必须背下来：`D_MODEL=384`（每个 token 的特征长度）、`VOCAB_SIZE=65`（词表只有 65 个字符）、`BLOCK_SIZE=256`（上下文最长 256 个 token）。让用户回忆第七章：这就是 nanoGPT 莎士比亚小模型的配置。
2. `CMD_*` 命令族（L72~L77）：`CMD_FULL`、`CMD_EMBED_ONLY`、`CMD_FULL6_ONLY`、`CMD_LN1_ONLY`、`CMD_LAYER0_ONLY`——这是**调试梯级**：不一次跑整个模型，而是可以只跑嵌入、只跑第 0 层 LN1……出问题时逐级定位。第 5 天加新 CMD 就是仿照它们。
3. `MAGIC = 0x4E475054`：让用户把这个十六进制拆成 ASCII——`4E='N' 47='G' 50='P' 54='T'`，即 "NGPT"。PS 启动后把它写进 mailbox word 0（L805），调试器读到它就知道"PS 程序活着且版本对"。这是嵌入式里常见的"魔数签名"手法（和第 6 天要加的 debug 寄存器同理）。

### 复述提问

- Q：调试时怀疑 LayerNorm 坏了，用哪个 CMD 能只验证它？
- 期望答案：`CMD_LN1_ONLY`（只跑第 0 层 LN1），配合 mailbox 状态码判断。

---

## 四、第四段：字符表 `g_itos`（约 L100~L106）—— Token 和字符的互译词典

### 讲解要点

```c
static const char g_itos[VOCAB_SIZE] = {
    '\n', ' ', '!', '$', '&', '\'', ',', '-', '.', '3', ':', ';', '?',
    'A', ... 'Z', 'a', ... 'z'
};
```

1. `g_itos[i]` = token ID i 对应的字符（itos = index to string）。反过来由 `encode_char()`（L179~197）完成：字符 → token ID。
2. 联系已知实验事实：**`ROMEO:` 生成的第一个 token 是 ID `0`，查表得 `'\n'`（0x0A 换行符）**——现在用户能从代码层面解释这个实验现象了，这是今天最有成就感的一刻，要点出来。
3. 解释为什么词表是 65：13 个标点/特殊字符 + 26 大写 + 26 小写 = 65。莎士比亚语料里出现频率低的数字大多被丢弃，只留了 `'3'`。
4. 提醒一个以后排错用得上的细节：`uart_console`（L737~739）里数字和冒号是**特许字符**——词表里没有数字，但提示词前缀 `8:ROMEO:` 的"数字+冒号"是协议头，不是给模型吃的。

### 复述提问

- Q：板端返回 token ID 39，屏幕上会显示什么字符？
- 期望答案：`g_itos[39]` = `'a'`（13+26=39，小写字母从 39 开始）。

---

## 五、第五段：shift 表（约 L108~L113）—— 定点量化的"除法器"（今天最难也最重要）

### 讲解要点

```c
static const uint32_t q_shifts[6] = {13u, 12u, 12u, 12u, 12u, 12u};
static const uint32_t k_shifts[6] = {13u, 13u, 13u, 12u, 12u, 12u};
...
```

1. 回忆第七章：FPGA 没有浮点运算，所有数都是整数。量化后用 scale 表示"这个整数要乘多小的数才是真实值"。累加之后数值会变大，需要**右移**把它压回 INT8 范围——右移 n 位 = 除以 2ⁿ。
2. 所以 `q_shifts[0]=13` 的意思是：第 0 层 Q 矩阵乘累加完之后，结果右移 13 位（≈除以 8192）再回到 INT8。
3. 为什么 6 个值不完全相同？因为每层的数值范围是实测出来的，量化时按各层分布定了不同的 scale，shift 跟着 scale 走。**这表不是拍脑袋的常数，是量化链路的产物**——改它 = 改数值精度 = 输出必然变化。这为第 4 天"故意改坏 `q_shifts[0]`"的实验埋下伏笔，但今天不要剧透太多。
4. 算一笔账给用户看：INT8×INT8 累加 384 项，最大量级约 128×128×384 ≈ 2²²·⁶，不压回 8 位必然溢出，所以 shift 不可避免。

### 复述提问

- Q：`q_shifts[3]` 从 12 改成 11，第 3 层的 Q 会怎样？
- 期望答案：少右移 1 位 = 结果放大 2 倍 → INT8 饱和截位 → 该层注意力异常。

---

## 六、函数地图（约 L115~L898）—— 只看职责，不逐行

带用户从 `main`（L785）倒着捋一遍调用链，每个函数只讲一句话：

| 行号 | 函数 | 一句话职责 |
|---|---|---|
| L115~117 | `wr32`/`rd32`/`barrier` | 两件武器 + 内存屏障（保证写真的落到硬件再往下走） |
| L124 | `global_timer_read` | 读 ARM 全局定时器，测性能用 |
| L144~169 | `uart_init/putc/getc/puts` | 串口收发——注意它们是**读写 PL 寄存器**实现的，UART 硬件在 PL 里 |
| L179 | `encode_char` | 字符 → token ID（`g_itos` 的反向） |
| L236~244 | `mailbox_write/read` | 往邮箱第 i 格写/读一个字 |
| L246~308 | `embedding_max_abs`/`build_hidden` | PS 侧算嵌入：查 INT8 嵌入表 + 动态定标 + 打包写入 `LAYER_A_BASE` |
| L348 | `ps_layernorm` | **PS 软件版 LayerNorm**（注意：LN 在 PS 用 C 算，不在 PL！这是本工程的设计分工） |
| L407 | `ps_residual_add` | PS 软件版残差相加（Q30 定点） |
| L425 | `wait_done` | 轮询 `REG_STATUS` 等 PL 完工，超时/报错返回负值 |
| L448 | `run_mode` | 通用下单器：清状态→写 mode 和地址→START→等完工 |
| L471 | `run_attn` | 下一个注意力单 |
| L489 | `run_layer` | **一层的完整编排**：LN→QKV 矩阵乘→注意力→投影→残差→LN→FFN→残差（10 个 profile 计时点） |
| L555~573 | `run_full_model_range/run_full_model` | 6 层循环 |
| L622 | `pl_lm_head_argmax_row` | 最后一步：LN + 分类头 + argmax，吐出下一个 token ID |
| L650 | `generate_greedy` | 生成循环心脏：跑模型→取 token→拼接→增量更新嵌入→再跑 |
| L716 | `uart_console` | 交互模式：打印 `nanoGPT Zynq UART ready`，解析 `数字:提示词` 协议 |
| L785 | `main` | 入口：看 mailbox word 2 决定进串口交互还是 JTAG 命令模式 |

### 必须点透的两个设计细节（用户容易忽略）

1. **LN 和残差在 PS 算，矩阵乘和注意力在 PL 算**。这就是为什么 `run_layer` 里 `ps_layernorm`（C 代码）和 `run_mode`（下硬件单）交替出现——一层 Transformer 是 PS/PL 乒乓协作完成的。
2. **mailbox 状态码**（main 里多处出现）：`0x9001/0x9002/0x9003/0x9005/0x900d` 分别对应各命令成功，`0xdead0000` 是失败。调试脚本靠读这些码判断结果。让用户在 L835/848/861/879/894 找到它们。

✅ 复述检查点：让用户不看代码口述一层 Transformer 在 `run_layer` 里的执行顺序（LN→Q→K→V→ATTN→PROJ→残差→LN→FFN→残差），并指出哪些步在 PS、哪些在 PL。

---

## 七、快问快答题库（10 题，答对 ≥8 过关）

| # | 题目 | 标准答案 |
|---|---|---|
| 1 | `PL_BASE` 是多少？干什么用？ | `0x40000000`；PL 寄存器组在 PS 地址空间的基地址 |
| 2 | 让 PL 开工要写哪个寄存器、写什么值？ | `REG_CONTROL`（0x00）写 `CTRL_START`（0x01） |
| 3 | PS 怎么知道 PL 算完了？ | 轮询 `REG_STATUS`，先见忙（bit1）后见完成（bit0） |
| 4 | 第 1 层（layer=1）的输入从哪个缓冲区读？ | `LAYER_B_BASE`（奇数层从 B 读，乒乓切换） |
| 5 | 第 2 层 WQ 的 DDR 地址怎么算？ | `WEIGHTS_BASE + 2×LAYER_STRIDE + OFF_WQ` = `0x11360000` |
| 6 | mailbox 的基地址？它和谁通信？ | `0x00020000`；PS ↔ 调试器（XSDB/JTAG/脚本） |
| 7 | `MAGIC` 的值和内容含义？ | `0x4E475054`，ASCII 即 "NGPT"，存活性签名 |
| 8 | token ID 0 是什么字符？为什么实验里 `ROMEO:` 首 token 是它？ | `'\n'` 换行；`g_itos[0]='\n'`，模型对 `ROMEO:` 的贪心预测就是换行 |
| 9 | `q_shifts[2]=12` 什么意思？ | 第 2 层 Q 累加结果右移 12 位（÷4096）压回 INT8 |
| 10 | LayerNorm 在 PS 还是 PL 算？从哪个函数看出？ | PS；`run_layer` 里直接调用 C 函数 `ps_layernorm` |

---

## 八、第 1 天验收表（与 17 号文档一致，此处给标准答案）

| # | 验收项 | 标准答案/通过表现 |
|---|---|---|
| 1 | 指出 `PL_BASE` 并口答作用 | "PL 寄存器在 PS 地址空间的基地址，`wr32(PL_BASE+偏移, 值)` 就是写硬件" |
| 2 | 解释 `OFF_WQ` 与 `WEIGHTS_BASE`、`LAYER_STRIDE` 关系 | 现场算出第 N 层 WQ 地址公式并算对第 2 层例子 |
| 3 | 解释 `q_shifts[0]=13` | "第 0 层 Q 右移 13 位 ÷8192 回到 INT8 定点格式" |
| 4 | 画出 main 的一次推理调用链 | `main → generate_greedy → build_hidden → run_full_model → run_layer×6 → pl_lm_head_argmax_row → 拼接 token → 循环` |
| 5 | 快问快答 10 题 | ≥8 题正确；错题当场纠正并记入当天 Word 记录 |

## 九、当天 Word 记录提醒（导师硬指标）

提醒用户记录：今天读了 `main.c` 哪几段、每段用自己的话怎么理解、快问快答错了哪几题及正确理解、画出的一次推理调用链。**不要求格式精美，要求是自己的话。**

## 十、给教学 AI 的注意事项

1. 本讲义只覆盖"看"，不要求用户今天改任何代码——第 4 天之前 `main.c` 保持原样。
2. 第五节（shift 表）是难点，若用户卡住，退回到"右移 1 位 = ÷2"用十进制例子重讲（如 8000 >> 3 = 1000），不要急着推进。
3. 用户答错时先说清因果链错在哪一环，再给提示，禁止直接念答案。
4. 如果用户提前完成且学有余力，可让他用内容搜索在 `main.c` 里找 `0xdead0000` 和 `bkpt`，自行总结调试命令的通用结构——这是第 5 天任务的预习，但不强求。
