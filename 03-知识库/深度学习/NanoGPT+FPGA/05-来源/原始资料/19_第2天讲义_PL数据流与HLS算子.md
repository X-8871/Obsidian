# 第 2 天讲义：PL 数据流与 HLS 算子（2026-08-11）

> 本讲义配套 `17_改代码与全流程学习计划_2026-08-11至17.md` 第四节使用。
> 教学 AI 按本讲义逐段讲解；每段讲完让用户复述，复述通过再进下一段。
> 行号基于当前工程版本，若与用户本地略有出入，以内容搜索为准。

**第 1 天反馈复盘（教学 AI 必读）**：
- 用户第 1 天 5 项验收全部通过，快问快答 9/10，无需补课。
- **遗留盲区 1**：十六进制手算进位对齐易错（第 1 层 WK 地址第一次算错）。本讲义在第五节安插了 3 道 hex 小练习，必须让用户动手算，不要跳过。
- **遗留盲区 2**：曾以为"定点溢出会导致程序卡死/崩溃"，已纠正为"截位失真导致输出乱码"。本讲义第三节讲 `clamp_signed` 时务必再巩固一次这个因果。
- 用户对数据流、乒乓缓冲、PS/PL 异构分工理解优异，今天节奏可以正常偏快，但 Verilog 是零基础，**语法解释不能省**。

**今日教学文件**（工作区根目录 = `<ROOT>`）：
```text
<ROOT>\hls\source\common\hls_common.hpp          （18 行，全讲）
<ROOT>\hls\source\tiled_matmul\tiled_matmul.hpp  （11 行，全讲）
<ROOT>\hls\source\tiled_matmul\tiled_matmul.cpp  （38 行，全讲）
<ROOT>\hls\source\mha_kernel\mha_kernel.hpp      （6 行，全讲）
<ROOT>\hls\source\mha_kernel\mha_kernel.cpp      （31 行，全讲）
<ROOT>\hls\source\layernorm_kernel\layernorm_kernel.cpp （32 行，全讲）
<ROOT>\hls\source\gelu_embed_kernel\gelu_embed_kernel.cpp （17 行，全讲）
<ROOT>\fpga\rtl\hls_kernel_chain_axis_wrapper.v  （207 行，看结构）
<ROOT>\fpga\rtl\hls_kernel_chain_axis_top.v      （1750 行，只看关键段）
<ROOT>\fpga\rtl\pl_uart_ps_bridge.v              （213 行，看结构）
```

---

## 〇、开场总图（讲 5 分钟）：昨天学"菜单"，今天进"后厨"

先接续第 1 天的餐厅类比：

```text
第 1 天：PS 是经理，会写订单（寄存器）、会看地址簿（DDR 映射）
第 2 天：进后厨——PL 收到订单后，菜是怎么炒出来的
```

今天的主图（PL 侧全景）：

```text
                 PS（main.c，昨天已学）
                   │  AXI-Lite 写寄存器/下命令（s_axi_*）
                   ▼
┌─────────────────────────────────────────────────┐
│  hls_kernel_chain_axis_top.v（手写顶层，1750 行） │
│                                                  │
│   ┌──────────┐   ┌──────────┐   ┌───────────┐   │
│   │ 矩阵乘    │ → │ 注意力    │ → │ LayerNorm │ → │  ← 4 个 HLS 算子
│   │ tiled_   │   │ mha_     │   │ layernorm │   │    （今天的源码主角）
│   │ matmul   │   │ kernel   │   │ _kernel   │   │
│   └──────────┘   └──────────┘   └───────────┘   │
│   ┌──────────┐                                   │
│   │ GELU+嵌入 │   ← gelu_embed_kernel            │
│   └──────────┘                                   │
│                                                  │
│   状态机（45 个 ST_* 状态）＋ BRAM 缓冲             │
└─────────────────────────────────────────────────┘
        │ m_axi_ddr_*（64 位主接口，自己搬数据）      │ uart_rx/uart_tx
        ▼                                            ▼
      DDR（权重/输入/输出）                    pl_uart_ps_bridge.v
                                             （UART 桥，213 行）
                                                   │ 引脚
                                                   ▼
                                              USB 串口线 → 电脑
```

**一句话定位**：昨天 `main.c` 写的每一个寄存器，都是写进这张图的左上角；PL 干完活，结果从右下角和 DDR 两条路回去。今天把这张图里面每一块"是什么、吃什么、吐什么"讲清楚。

✅ 复述检查点：让用户回答"PS 下的命令从图的哪里进来？算力部分和数据搬运部分分别是谁？"——答出 s_axi 进、4 个算子是算力、状态机+AXI Master 是搬运，才继续。

---

## 一、三层楼模型（讲 15 分钟）：PL 代码的"食材、菜谱、厨房"

这是今天最重要的认知框架，直接决定第 5、6 天改代码改哪个文件。

```text
第 1 层（菜谱·人写的）   hls/source/*.cpp        ← 想改算法，改这里
        │  Vitis HLS 综合（C++ → Verilog，自动）
        ▼
第 2 层（半成品·机器写的） fpga/ip_repo/*/hdl/*.v  ← 只看不改！重新综合会被覆盖
        │  Vivado 例化、连线
        ▼
第 3 层（厨房布局·人写的） fpga/rtl/*.v           ← 想改结构/寄存器，改这里
```

逐层讲解要点：

1. **第 1 层 `hls/source/`**：HLS（High Level Synthesis，高层次综合）源码。用 C++ 写算法，加 `#pragma HLS` 告诉综合器怎么变成硬件。每个算子三件套：`xxx.hpp`（接口+参数）、`xxx.cpp`（算法本体）、`tb_xxx.cpp`（testbench，测试台——纯 C 仿真，不上板就能验证）。
2. **第 2 层 `fpga/ip_repo/`**：打开任意一个算子目录（如 `ip_repo/layernorm_kernel/hdl/verilog/`）给用户看——里面十几个 `.v` 文件全是机器生成，名字又臭又长（`layernorm_kernel_mul_72s_24s_72_5_1.v`）。**强调铁律：这层只读不改**。改它两个后果：重新综合被覆盖、改了也没法追踪。
3. **第 3 层 `fpga/rtl/`**：人手写的 Verilog，分两类——
   - `*_hls_wrapper.v`（4 个，每个约 87~207 行）：把 HLS 算子包一层，接上统一的 `start/done/result_byte` 接口，方便顶层调用；
   - `hls_kernel_chain_axis_top.v` / `..._full_only_core_ffn64_qp16_pipe100_qkt8.v`：真正的顶层，把算子串成完整 Transformer 层，外加寄存器译码、DDR 搬运、状态机。
4. **文件名本身就是配置**：带用户读 `hls_kernel_chain_axis_full_only_core_ffn64_qp16_pipe100_qkt8.v` 这个文件名——`ffn64`=FFN 并行度 64、`qp16`=Q/Projection 16、`pipe100`=100 MHz 流水、`qkt8`=QK 转置 8。这就是 README 里"QKT8、Q/K/V/Projection16、FFN64"指标的出处。

✅ 复述检查点：用户能不看笔记画出三层楼，并说清"改算法改第 1 层、改结构改第 3 层、第 2 层永远不手改"。

---

## 二、公共类型 `hls_common.hpp`（讲 10 分钟）：硬件世界的"整数"

文件全文仅 18 行，逐行可讲：

```cpp
typedef ap_int<8>  int8_t_hls;    // 8 位有符号整数（硬件里是 8 根线）
typedef ap_int<16> int16_t_hls;
typedef ap_int<32> int32_t_hls;
...
template <typename T>
static T clamp_signed(T v, T lo, T hi) {   // 饱和钳位：超出范围就卡在边界
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}
```

讲解要点：

1. `ap_int<8>`（Arbitrary Precision Integer，任意精度整数）和普通 C `int` 的区别：普通 `int` 固定 32 位，`ap_int<8>` 综合后**就是 8 根导线、8 个触发器**。FPGA 上每一位都是真金白银的资源，所以位宽按需定制。
2. `clamp_signed`：就是第 1 天 `main.c` 里 `clamp_i8`（L199~204）的硬件版。**在这里巩固盲区 2**：硬件里数值超出范围不会"崩溃报错"，而是被钳到 -128/127（或回绕）——**程序照常跑，数据悄悄坏**。这就是为什么板级验证必须看 mismatch 而不是看"程序跑没跑完"。
3. 提问：为什么 `round_embedding_ratio`（main.c L218）里商超过 127 要压回 127？——同一个道理的两端：PS 软件版和 PL 硬件版做的是同一件事。

✅ 复述检查点：用户能答出"`ap_int<8>` 和普通 int 的区别"和"clamp 为什么必需"。

---

## 三、四个 HLS 算子（每个 10~15 分钟）：吃什么、吐什么、怎么算

教学顺序按数据流顺序。**每个算子固定三问：输入是什么形状？输出是什么形状？最内层循环在算什么？**

### 3.1 矩阵乘 `tiled_matmul`（38 行，重点讲）

先读 `tiled_matmul.hpp`（11 行）：

```cpp
const int TM_ROWS = 16;   // A 是 16×16
const int TM_COLS = 16;   // B 是 16×16
const int TM_K = 16;
const int TM_TILE = 4;    // 每次算 4×4 的小块
```

再读 `tiled_matmul.cpp` 的核心结构（让用户自己找到三个循环层次）：

```cpp
tile_i: for (ii = 0; ii < 16; ii += 4)        // 外层：按 4×4 块遍历
  tile_j: for (jj = 0; jj < 16; jj += 4)
      int32_t_hls acc[4][4];                   // 小块累加器（32 位，防溢出！）
      dot: for (k = 0; k < 16; ++k) {
#pragma HLS PIPELINE II=1                      // 每个时钟周期喂一组新数据
          for (i...) for (j...)
#pragma HLS UNROLL                             // 16 个乘法器同时算
              acc[i][j] += A[ii+i][k] * B[k][jj+j];
      }
```

必讲的三个 HLS pragma（第一次出现，给全称）：

| pragma | 含义 | 生活类比 |
|---|---|---|
| `PIPELINE II=1` | 流水线，启动间隔 1：每个时钟周期吞一个新输入，像工厂传送带 | 洗菜、切菜、炒菜三道工序三个人并行 |
| `UNROLL` | 循环展开：4×4=16 次乘法变成 16 个物理乘法器同时算 | 一个人炒 16 盘菜 → 16 个灶同时炒 |
| `ARRAY_PARTITION` | 数组分块：把大数组拆成多个小存储块，让同一周期能读多个数 | 一个冰箱只有一个门 → 分成 16 个小冰箱同时开门拿 |

**INT8×INT8 累加进 int32**（`acc` 是 `int32_t_hls`）正好呼应第 1 天的 shift 表：累加完了要右移压回去。让用户亲口说出这个呼应。

✅ 复述提问：Q：为什么 `acc` 用 32 位而输入是 8 位？期望答案：8×8 位乘积最多 16 位，16 个累加最多再大 4~5 位，32 位累加器保证不溢出，最后靠 shift 压回 8 位——和第 1 天 `q_shifts` 是同一条链路的下游。

### 3.2 注意力 `mha_kernel`（31 行）

读 `mha_kernel.hpp`：`MHA_SEQ=16, MHA_DIM=16, MHA_HEADS=4, MHA_HDIM=4`——4 头，每头 4 维，16 个位置。

读 `mha_kernel.cpp` 三段结构：

```cpp
proj:   // 第一段：X 乘 WQ/WK/WV 得到 Q、K、V（昨天 main.c 里 OFF_WQ/WK/WV 的硬件对应物）
heads:  // 第二段：每个头内部
    score[j] = (j>i) ? -32768 : (s>>2);   // ← 因果掩码！未来位置打负无穷
    weight[j] = (j>i) ? 0 : lut_weight(score[j]-max_score, softmax_lut);  // ← softmax 用查表做！
    OUT[i][z] = a/denom;                   // 加权平均 V
```

必讲两个亮点：

1. **因果掩码的硬件写法**：`j>i` 的位置 score 直接赋 `-32768`（int16 最小值），相当于软件里的 `-inf`。让用户回忆第二章 Self-Attention 的 mask——同一个概念，硬件里就是一个条件赋值。
2. **softmax 用 LUT**（Look-Up Table，查找表）：FPGA 算 `exp()` 太贵，于是预先算好 16 个值存表，`lut_weight` 按输入索引直接查。这是 FPGA 实现超越函数的标准套路，GELU 也一样。

✅ 复述提问：Q：硬件怎么做 softmax？期望答案：不算真 exp，而是把 (score-max) 量化后查 16 项 LUT 得权重，再除以权重和做归一。

### 3.3 LayerNorm `layernorm_kernel`（32 行）

```cpp
ap_fixed<24,12> sum=0, sq_sum=0;     // 定点小数：24 位总长，12 位整数
accum: 累加 sum 和平方和
mean = sum/LN_DIM;  var = ...;
if (var < 0.5) var=0.5; if (var > 8.0) var=8.0;   // ← 方差钳位，防除零防爆炸
inv = rsqrt_newton(var);             // ← 牛顿迭代求 1/√var，只迭代 2 次！
norm: Y[i]=clamp_signed<int16_t_hls>(q,-128,127);  // 钳回 INT8
```

必讲亮点：

1. `ap_fixed<24,12>`（Arbitrary Precision Fixed-point，任意精度定点数）：24 位里 12 位整数 12 位小数——**这就是 Q 格式在 HLS 里的写法**，直接呼应第 1 天学的 Q30/shift 概念。
2. **牛顿迭代求平方根倒数**：硬件没有开方指令，用 `y = y*(1.5-0.5*x*y*y)` 迭代逼近，只迭代 2 次换速度。这是"精度换资源"的典型工程权衡。
3. 回忆第 1 天结论："LN 在 PS 算"（`ps_layernorm`）——而这里又有一个 PL 版 LN 核。引导用户思考：**两个版本并存，PS 版是当前签核链路用的，PL 版是质量监控/验证用的**（顶层里实例名叫 `u_quality_ln`，可留悬念，第五节揭晓）。

### 3.4 GELU+嵌入 `gelu_embed_kernel`（17 行，最快）

```cpp
gelu:  gelu_out[i]=gelu_lut[(uint8_t_hls)X[i]];        // 纯查表，一个周期一个
embed: embed_out[i]=embed_lut[token_ids[i]%EMB_VOCAB][i];  // 也是查表
```

一句话：两个功能都是 LUT——GELU 激活查 256 项表，嵌入查 `embed_lut[token][dim]` 表。**最能体现 FPGA"用存储换计算"思想的一个算子**。

✅ 四算子复述检查：用户不看代码，按"吃什么→吐什么→核心技巧"三句式说完四个算子：
- 矩阵乘：吃 A、B 两个 INT8 矩阵→吐 int32 结果→分块+流水线+展开
- 注意力：吃 X 和三个权重→吐加权特征→掩码赋最小值、softmax 查 LUT
- LayerNorm：吃 INT8 向量→吐归一化 INT8→定点牛顿迭代求 1/√var
- GELU/嵌入：吃数值/token ID→吐查表结果→全程 LUT

---

## 四、UART 桥 `pl_uart_ps_bridge.v`（讲 15 分钟）：逐比特收发

用户 Verilog 零基础，这个文件是最好的入门样本（213 行，结构工整）。

先讲三句 Verilog 生存语法（对照文件实物讲）：

```verilog
always_ff @(posedge clk) begin ... end   // 每个时钟上升沿执行一次 = 寄存器逻辑
wire   = 一根导线（组合逻辑）
logic [7:0] = 8 位信号
typedef enum logic [1:0] {RX_IDLE, RX_START, RX_DATA, RX_STOP}  // 状态机定义
```

然后带用户找四个状态机/结构：

1. **RX 状态机**（约 L82~117）：`RX_IDLE → RX_START → RX_DATA → RX_STOP`。串口线上没有时钟，靠 `CLKS_PER_BIT`（L27：时钟频率÷波特率）数拍子，在每比特中点采样。这就是"115200 8N1"在硬件里的样子。
2. **双触发器同步器**（L60~68）：`uart_rx_meta → uart_rx_sync`，外部异步信号进芯片先打两拍防亚稳态。只需讲"外部信号不能直接信，要缓冲两拍"，不展开亚稳态理论。
3. **RX/TX FIFO**（L33~36，各 16 字节）：收发的缓冲队列，`rx_count/tx_count` 记录存量。
4. **和第 1 天的连接**：`main.c` 里 `uart_getc` 读 `REG_UART_RX_DATA`、`uart_putc` 写 `REG_UART_TX_DATA`——那些寄存器的另一头就是这个模块的 `rx_data/rx_pop` 和 `tx_data/tx_push` 信号。**让用户亲口说出"PS 的串口函数最终操作的是这个 .v 文件里的 FIFO"**。

✅ 复述检查点：用户能按状态名口述 RX 一个字节的过程（空闲等下降沿→起始位中点确认→8 个数据位逐位移入→停止位校验→压入 FIFO）。

---

## 五、顶层 `hls_kernel_chain_axis_top.v`（讲 20 分钟）：把珍珠串成项链

这个文件 1750 行，**不逐行读，只带用户找五个锚点**：

1. **端口三类总线**（L9~128，对照注释扫一遍即可）：
   - `s_axi_*`：AXI-Lite 从接口——PS 写寄存器的门（昨天所有 `wr32(PL_BASE+偏移)` 落到这里）；
   - `m_axi_ddr_*`：64 位 AXI Master——PL 自己主动去 DDR 搬权重和数据的接口；
   - `s_axis/m_axis`：AXI-Stream——算子之间的数据流管道。
   缩写：AXI = Advanced eXtensible Interface；Lite=轻量寄存器版；Stream=流式数据版；Master=主动方，Slave=被动方。
2. **地址默认值**（L148~152）：
   ```verilog
   localparam logic [31:0] DEFAULT_WEIGHTS_BASE = 32'h1100_0000;
   ```
   **让用户对比第 1 天 `main.c` 的 `WEIGHTS_BASE 0x11000000u`**——同一个地址，PS 和 PL 两边各写一份。这就是"三处同步"问题的源头，为第 6 天埋伏笔。
3. **四个算子的例化**（L628~631）：`u_tm`、`u_mha`、`u_ln`、`u_ge`，统一 `start/done/result_byte` 接口——wrapper 的作用在这里看得见。
4. **签名寄存器**（L362、L851）：
   ```verilog
   hls_signature <= {tm_result_byte, mha_result_byte, ln_result_byte, ge_result_byte};
   ```
   四个算子各吐一个字节的自检结果，拼成 32 位签名——第 1 天 mailbox word 7 的 `REG_HLS_SIGNATURE` 就是它。
5. **状态机**（L169~219）：45 个 `ST_*` 状态。只需讲：软件里是 `for` 循环一行行跑，硬件里是一个大状态机一拍一拍跳转，`ST_Q_MAC`（乘加）、`ST_EMIT`（输出）、`ST_FULL_*`（全模型流程）这些名字能猜出意思即可。

**hex 小练习（针对盲区 1，必须动手算，3 道题）**：

| # | 题目 | 答案 |
|---|---|---|
| 1 | `DEFAULT_WEIGHTS_BASE=32'h1100_0000`，第 0 层 `OFF_WK=0x024000`，WK 绝对地址？ | `0x11024000` |
| 2 | 第 3 层（LAYER_STRIDE=0x1B0000）WO（OFF_WO=0x06C000）地址？ | `0x11000000+3×0x1B0000+0x6C000` = `0x1157C000` |
| 3 | `DEFAULT_FULL_DEBUG_BASE=32'h12E0_0000` 与 `WEIGHTS_BASE` 相差多少字节？ | `0x12E00000-0x11000000 = 0x1E00000`（31,457,280 字节） |

教学提示：让用户用"按位对齐、从右往左、逢 16 进 1"的口诀在纸上列竖式；算错不批评，让他用计算器验证后自己找错在哪一位。

✅ 复述检查点：用户能画出完整 PL 数据通路图（这是今天验收 #1 的预演）。

---

## 六、收尾对照（讲 5 分钟）：代码 ↔ 报告

打开 `NanoGPT_PS+PL_重要参数汇总.md`，让用户找三个对应：

1. 报告里的 "QKT8、FFN64" ↔ 顶层文件名 `..._ffn64_qp16_pipe100_qkt8.v`
2. 报告里的 "100 MHz" ↔ 约束文件 `fpga/constraints/timing_100mhz.xdc`
3. 报告里的 WNS `+0.181 ns` ↔ `artifacts/` 里的时序报告（`.rpt`）

目的：建立"报告上的每个数字都能在工程里找到出处"的意识——以后改代码动了参数，报告就要跟着变。

---

## 七、快问快答题库（10 题，答对 ≥8 过关）

| # | 题目 | 标准答案 |
|---|---|---|
| 1 | 想改矩阵乘算法，改哪个目录？ | `hls/source/tiled_matmul/`，改完重新综合导出 IP |
| 2 | `fpga/ip_repo/` 里的 .v 为什么不能手改？ | HLS 生成物，重新综合会被覆盖，改动丢失且无法追踪 |
| 3 | `ap_int<8>` 和普通 C `int` 的区别？ | 位宽定制：综合后就是 8 根线；普通 int 固定 32 位浪费资源 |
| 4 | `PIPELINE II=1` 是什么意思？ | 流水线启动间隔为 1，每个时钟周期吞一组新输入 |
| 5 | `UNROLL` 的作用？ | 循环展开成多个物理计算单元并行执行 |
| 6 | 硬件怎么做 softmax / GELU？ | 查表（LUT）：预先算好离散值存 ROM，按输入索引取 |
| 7 | 注意力里 `j>i` 时 score 赋什么？为什么？ | `-32768`（int16 最小值），充当因果掩码的负无穷 |
| 8 | `clamp_signed` 存在说明硬件溢出会怎样？ | 不报错不崩溃，数值被钳/回绕，数据悄悄失真——所以要看 mismatch |
| 9 | PS 的 `uart_getc` 最终读的是哪个文件里的什么？ | `pl_uart_ps_bridge.v` 里的 RX FIFO（经寄存器映射） |
| 10 | 顶层里 PS 写寄存器走哪个接口？PL 搬 DDR 数据走哪个？ | `s_axi`（AXI-Lite Slave）；`m_axi_ddr`（AXI Master） |

---

## 八、第 2 天验收表（与 17 号文档一致，此处给标准答案）

| # | 验收项 | 标准答案/通过表现 |
|---|---|---|
| 1 | 画出 PL 数据通路图 | 含：PS→s_axi 寄存器口、4 算子链、状态机、m_axi_ddr→DDR、UART 桥→引脚，五个要素齐全 |
| 2 | 解释三层楼关系 | "hls/source=菜谱（改这）、ip_repo=半成品（不改）、fpga/rtl=厨房布局（改这）"，并说出第 2 层不可改的原因 |
| 3 | 指出 `ap_int<8>` 并解释 | "8 位有符号定制整数，综合后 8 根线/8 个触发器，硬件资源按位定制" |
| 4 | 说清 `tb_*.cpp` 的作用 | "纯 C 仿真测试台，不上板验证算子正确性——改 HLS 代码后先过 tb 再综合"（能打开 `tb_layernorm_kernel.cpp` 指出 6 行全文） |
| 5 | 在顶层找到 FFN 对应段 | 在 `hls_kernel_chain_axis_top.v` 或 full_only_core 中指出 `ST_FULL_*` 状态段或 FFN 相关状态/例化，能说出它前后连接 |

**hex 三题另计**：3 题全对才算盲区 1 关闭；有错的记入 Word 记录，第 3 天空跑前再抽 2 题复测。

## 九、当天 Word 记录提醒（导师硬指标）

提醒用户记录：三层楼模型图、四算子"吃吐技巧"三句式、UART RX 状态机流程、hex 三题的计算过程（含错误复盘）、快问快答错题。

## 十、给教学 AI 的注意事项

1. 今天依然**只看不改**——任何"要不要顺手改一下试试"的提议都拒绝，第 4 天才开始改。
2. 用户 Verilog 零基础，第四节的三句生存语法必须先讲再找结构，不要假设他看得懂 `always_ff`。
3. `hls_kernel_chain_axis_top.v` 有 1750 行，严禁逐行讲，只按第五节的五个锚点跳着讲。
4. 第三节 3.1 的三个 pragma 是 HLS 的灵魂，用户第 5 天要改 HLS 代码，这里务必让他复述清楚。
5. hex 练习算错时，引导他自己用计算器/纸笔定位错在哪一位，不要直接给正确答案。
6. 若时间不够，3.4 和第六节可压缩，但四算子复述检查和验收 #1（画数据通路图）不可省。
