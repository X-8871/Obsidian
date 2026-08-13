# Vivado 至 FPGA 单 Token 板级实验记录

## 一、记录信息

| 项目 | 内容 |
|---|---|
| 实验名称 | nanoGPT Zynq INT8/Q30 单 Token 板级推理实验 |
| 实验人员 | Wong |
| 实验时间 | 分多次进行，详见下方“分时实验记录”（UTC+8） |
| 当前结论 | JTAG 板级单 Token 推理已通过；SD 卡脱机启动与 UART 交互待验证 |
| 输入提示词 | `ROMEO:` |
| 生成数量 | 1 Token |
| 输出结果 | Token ID `0`，字符 `0x0A`（换行符 `\n`） |
| FPGA 器件 | Zynq-7000 `xc7z020clg484-2` |

本记录从打开 Vivado 工程开始，记录硬件升级、综合、实现、Bitstream、XSA、Vitis 平台和 PS 应用构建、JTAG 加载、真实板级排障、单 Token 验收以及独立启动包制作全过程。

### 1.1 分时实验记录

本实验并非在一个连续时间段内一次完成。各阶段按实际操作日期和时间分开记录如下：

| 序号 | 日期 | 开始时间 | 结束时间 | 实验阶段 | 时间依据 |
|---|---|---:|---:|---|---|
| 1 | 2026-08-08 | 16:57 | 18:07 | Vivado 工程升级、IP 输出产品生成、综合、实现、Bitstream 生成及首次 XSA 导出 | Vivado 截图时间、构建日志及当前 XSA 生成时间 |
| 2 | 2026-08-09 | 14:11 | 14:25 | Vitis 重新读取当前 XSA、生成 Platform、重新构建 PS 应用并制作第一版启动镜像 | Vitis 截图与日志时间、ELF 和 `BOOT.bin` 文件时间 |
| 3 | 2026-08-09 | 14:26 | 16:16 | XSDB/JTAG 板级加载、完整推理失败排查、FFN-only 定位、残差读取问题修复及 FXF2 Bitstream 重新生成 | XSDB 调试记录、Vivado 截图及修复后 Bitstream 文件时间 |
| 4 | 2026-08-09 | 16:19 | 16:38 | 冷启动条件下重新加载权重和参数、执行完整单 Token 推理验收、自动化复测及独立启动包制作 | 板级验收日志、自动化脚本输出及独立 `BOOT.bin` 文件时间 |

> 时间说明：以上均为南京时间（UTC+8）。开始和结束时间依据现有截图、工具日志和产物修改时间整理；相邻阶段之间存在暂停、重新上电、重新打开工具或重新构建，不应理解为一次连续运行。

## 二、实验目标与验收边界

### 2.1 实验目标

完成以下闭环：

```text
当前模型权重与量化参数
  ↓
Vivado构建PL硬件
  ↓
Vitis构建PS软件
  ↓
JTAG加载Bitstream、模型数据和ELF
  ↓
PS/PL协同执行6层Transformer推理
  ↓
LM Head与Argmax生成1个Token
  ↓
通过邮箱读取并验证Token ID
```

### 2.2 本次成功标准

必须同时满足：

1. Vivado Synthesis、Implementation 和 Bitstream 均成功。
2. Vitis Platform 和 PS Application 构建成功。
3. FPGA 中运行的是修复后的 FXF2 Bitstream。
4. 当前权重、scale、Embedding 和 Q30/Q24 参数均加载到预定地址。
5. 输入 `ROMEO:` 后生成 1 个 Token。
6. PS 返回码为 0。
7. PL 状态为完成状态。
8. AXI 错误计数为 0。

### 2.3 结论边界

本次已经证明：

- 真实 Zynq 板卡上的 PS/PL 协同推理可以完成。
- 当前 FXF2 RTL、当前模型权重和当前量化参数可以执行单 Token 推理。
- 当前验收输入下，AXI 访问错误为 0。

本次尚未证明：

- SD 卡 `BOOT.bin` 可以在断电后自动启动。
- UART 可以正确接收提示词并显示生成字符。
- Python Q30 与 FPGA 的完整 logits 或多 Token 序列完全一致。
- 20/200 Token 连续运行稳定性与性能指标。

## 三、实验环境

### 3.1 主机环境

| 项目 | 内容 |
|---|---|
| 操作系统 | Windows，简体中文环境 |
| 命令行 | Windows PowerShell |
| 工程根目录 | `D:\FPGA\NanoGPT\nanogpt-zynq-backups-main` |
| Vitis 工作区 | `D:\FPGA\workspace_manual_2026_1` |
| 部署暂存目录 | `D:\FPGA\NanoGPT\deploy_current_20260808` |

### 3.2 AMD/Xilinx 工具

| 工具 | 版本/用途 |
|---|---|
| Vivado Unified IDE | 2026.1；IP 升级、综合、实现、Bitstream、XSA |
| Vitis Unified IDE | 2026.1；Platform、BSP、FSBL、PS Application、ELF |
| XSDB | 2026.1；JTAG 目标控制、内存和寄存器读写、数据下载 |
| hw_server | 2026.1；连接 JTAG 调试器与开发板 |
| Bootgen | 2026.1；根据 BIF 生成 `BOOT.bin` |

Vitis 2026.1 已禁用传统 XSCT，脚本化板级调试使用 XSDB；Vitis GUI 调试仍通过 TCF/hw_server 完成目标控制。

### 3.3 模型配置

```text
n_layer    = 6
n_head     = 6
n_embd     = 384
block_size = 256
vocab_size = 65
bias       = False
dropout    = 0.2
```

## 四、实验资料与关键文件

### 4.1 学习和部署资料

- `AI交接包_前七章学习资料/10_部署路线与验收清单.md`
- `AI交接包_前七章学习资料/11_Vivado_PL说明.md`
- `AI交接包_前七章学习资料/12_Vitis_PS说明.md`
- `AI交接包_前七章学习资料/13_历史硬件验证报告.md`
- `AI交接包_前七章学习资料/14_学习状态总结与一周FPGA部署学习计划.md`

### 4.2 Vivado 与 RTL

- Vivado 工程：`vivado_project/nano_gpt.xpr`
- 顶层：`vivado_project/rtl/system_wrapper.v`
- Transformer 核：`vivado_project/rtl/hls_kernel_chain_axis_full_only_core_ffn64_qp16_pipe100_qkt8.v`
- 最终 Bitstream：`vivado_project/nano_gpt.runs/impl_1/system_wrapper.bit`
- 时序报告：`vivado_project/nano_gpt.runs/impl_1/system_wrapper_timing_summary_routed.rpt`
- 资源报告：`vivado_project/nano_gpt.runs/impl_1/system_wrapper_utilization_placed.rpt`

### 4.3 Vitis 与 PS 软件

- PS 源码：`D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\main.c`
- Linker Script：`D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\lscript.ld`
- Vitis 调试配置：`D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\_ide\launch.json`
- PS 初始化脚本：`D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\_ide\psinit\ps7_init.tcl`
- 最终 ELF：`D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\build\ps_mailbox_runner.elf`

### 4.4 当前模型数据

- 权重：`D:\FPGA\NanoGPT\deploy_current_20260808\ddr_image_current\weights.bin`
- Scale：`D:\FPGA\NanoGPT\deploy_current_20260808\ddr_image_current\scales.bin`
- Embedding：`reference/ps_ddr_embedding_tables/`
- Q24/Q30 参数：`reference/int8_alignment/hardware_params/`
- 当前参数头：`ps_bittrue_params.h`

### 4.5 自动化与启动文件

- 冷启动 JTAG 脚本：`D:\FPGA\NanoGPT\deploy_current_20260808\deploy_fx2_cold_jtag.tcl`
- PowerShell 入口：`D:\FPGA\NanoGPT\deploy_current_20260808\run_fx2_cold_jtag.ps1`
- Bootgen 清单：`D:\FPGA\NanoGPT\deploy_current_20260808\boot\BOOT_fx2_standalone_20260809.bif`
- 独立启动包：`D:\FPGA\NanoGPT\deploy_current_20260808\boot\BOOT_fx2_standalone_20260809.bin`

## 五、实验方法

### 5.1 版本指纹法

使用 SHA256 判断不同目录中的 `weights.bin` 是否为同一份权重，避免把当前 Python 模型与历史 FPGA 参数混用。

当前权重指纹：

```text
0F6B6BF5376041C66704377B90FB0937E9C4774D8A139F4853B843063BAA5AB7
```

当前 `scales.bin` 指纹：

```text
297D48D788A22BDA267C02388C9340C0955686223CAC42CEBBCDDD8F4AB2AED8
```

### 5.2 分层构建法

构建按以下顺序进行，前一层通过后再进入下一层：

```text
IP状态与Block Design
  ↓
Synthesis
  ↓
Implementation
  ↓
Bitstream
  ↓
XSA
  ↓
Vitis Platform/BSP
  ↓
PS ELF
```

### 5.3 分层运行验收法

运行时不直接把最终字符作为唯一证据，而是逐层确认：

1. JTAG 目标是否完整。
2. PS 和 DDR 是否初始化。
3. PL 构建标记是否正确。
4. 权重和参数首字是否正确。
5. ELF 是否下载且 PC 是否指向入口。
6. 邮箱状态、返回码和生成数量是否正确。
7. PL 状态和 AXI 错误计数是否正确。

### 5.4 PS/PL 隔离法

当完整软件流程失败时，绕过 PS 高层调度，直接通过 XSDB 写 PL 控制寄存器，判断错误属于：

- PS 邮箱和软件控制；或
- PL RTL 状态机和 AXI 访存。

### 5.5 错误计数反推结构法

观察到 `ddr_error_count = 0x900`：

```text
0x900 = 2304 = 6层 × 384特征
```

该数值与模型结构完全吻合，因此把排查范围缩小到“每层、每个 FFN 输出特征都会发生一次的错误访问”。

### 5.6 固定构建标记法

在 RTL 中加入：

```text
FXF2 = 0x46584632
```

上板后读取 `0x40000094`，只有得到 `0x46584632` 才继续验收，防止误用旧 Bitstream。

## 六、详细实验步骤与结果

### 6.1 锁定当前模型与量化版本

执行内容：

1. 对当前 `weights.bin` 计算 SHA256。
2. 检查 `manifest.json` 中的 `weights_sha256` 和 `gelu_scale`。
3. 将当前硬件参数同步到 reference、Vivado generated 和 Vitis PS 头文件目录。
4. 比较 Token/Position Embedding 及其 Q30 scale 指纹。
5. 保留历史参数和历史 DDR 镜像备份。

结果：

- 三处当前 `weights.bin` 指纹一致。
- 当前权重指纹为 `0f6b...5ab7`。
- `gelu_scale = 0.08527148514986038`。
- Token/Position Embedding 及对应 scale 指纹一致。

### 6.2 打开 Vivado 并升级 IP

打开 `vivado_project/nano_gpt.xpr` 后，Vivado 2026.1 报告 IP revision changes。

涉及 IP：

- AXI Interconnect
- AXI SmartConnect
- AXI Direct Memory Access
- ZYNQ7 Processing System

操作：

1. 打开 `Reports → Report IP Status`。
2. 确认四个 IP 的推荐修订版本。
3. 执行 Upgrade IP。
4. 重新生成 Output Products，选择 Global Synthesis。

结果：IP 输出文件与 Vivado 2026.1 工具版本重新匹配。

### 6.3 重新综合 Synthesis

综合作用：把 RTL 转换为 LUT、寄存器、DSP、BRAM 等逻辑网表。

工程曾显示 Synthesis/Implementation Out-of-date，因此对 `synth_1` Reset 后重新运行，确保使用当前 IP、当前 RTL 和当前生成文件。

结果：Synthesis 完成，无综合错误，并生成 `system_wrapper.dcp`。

### 6.4 实现 Implementation

实现作用：完成逻辑优化、布局、布线和时序检查。

最终实现报告：

| 指标 | 结果 |
|---|---:|
| WNS | `0.168 ns` |
| TNS | `0.000 ns` |
| WHS | `0.014 ns` |
| THS | `0.000 ns` |
| 时序结论 | `All user specified timing constraints are met.` |

资源使用：

| 资源 | 使用量 | 器件总量 | 利用率 |
|---|---:|---:|---:|
| Slice LUTs | 27145 | 53200 | 51.02% |
| Slice Registers | 29585 | 106400 | 27.81% |
| Block RAM Tile | 74.5 | 140 | 53.21% |
| DSP | 112 | 220 | 50.91% |

### 6.5 生成 Bitstream

执行 `Generate Bitstream`，最终生成：

```text
vivado_project/nano_gpt.runs/impl_1/system_wrapper.bit
```

最终 Bitstream：

```text
大小   = 4,045,769 字节
SHA256 = 952B6ECCB652FDD0D833A7B738CDEBFF396A64D5D1E4B35177A19DCC6A14B217
```

### 6.6 导出含 Bitstream 的 XSA

选择：

```text
Export Hardware Platform
  → Include bitstream/binary
  → Include bitstream
```

生成：

```text
vitis/hardware/nanogpt_qkt8_100mhz_current_20260808.xsa
```

结果：

```text
大小   = 1,323,540 字节
SHA256 = 672E78F81B92A521B0A84414D3B5AD57DCC4DF3A29954F5756029A3C06FDA1ED
```

### 6.7 Vitis 更新 Platform 与 BSP

在 Vitis 2026.1 中：

1. 创建/打开 `nanogpt_qkt8_platform`。
2. 选择新的 XSA，执行 `Switch / re-read XSA`。
3. 使用 `standalone_ps7_cortexa9_0` Domain。
4. 重新生成 Platform、BSP、FSBL 和启动组件。

结果：Platform 生成成功。

### 6.8 构建 PS Application

应用：`ps_mailbox_runner`。

初次构建报错：

```text
undefined reference to __bss_start__
```

根因：应用未正确使用项目中的 `lscript.ld`，导致启动代码所需的链接符号未定义。

修复：在 `UserConfig.cmake` 中指定正确的 Linker Script。

结果：

```text
Build Finished successfully
```

最终 ELF：

```text
大小   = 56,720 字节
SHA256 = 5035B7A3B9999181A97E05C6970A2E2BA629223D8B56E190D03B77BFBE1FF673
```

### 6.9 XSDB 连接与基础初始化

目标检测结果：

```text
APU
├── ARM Cortex-A9 MPCore #0
├── ARM Cortex-A9 MPCore #1
└── xc7z020
```

执行顺序：

```text
connect
  ↓
rst -system
  ↓
source ps7_init.tcl
  ↓
ps7_init
  ↓
ps7_post_config
  ↓
fpga -file system_wrapper.bit
```

### 6.10 加载模型数据到 DDR

| 数据 | 加载地址 |
|---|---:|
| `weights.bin` | `0x11000000` |
| `scales.bin` | `0x11C00000` |
| Token Embedding INT8 | `0x13000000` |
| Position Embedding INT8 | `0x13010000` |
| Token Embedding Q30 Scale | `0x13028000` |
| Position Embedding Q30 Scale | `0x13028400` |
| LayerNorm Q24 参数 | `0x13200000` |
| LM Head Q30 比例 | `0x13205000` |

加载后读取首字：

```text
0x11000000 = E11B06E4
0x11C00000 = 0000000D
0x13000000 = F91227F7
0x13200000 = 1BF3B695
```

结果：数据加载与预期一致。

### 6.11 下载 ELF 与准备邮箱

下载：

```text
D:\FPGA\workspace_manual_2026_1\ps_mailbox_runner\build\ps_mailbox_runner.elf
```

在 OCM 邮箱中设置：

- Magic：`0x4E475054`
- 输入长度：6
- 最大新 Token 数：1
- 输入字符：`R O M E O :`

然后执行 `con` 启动 Cortex-A9。

### 6.12 第一次完整推理失败

初始结果：

```text
mailbox state = 0xDEAD0000
return code   = 0xFFFFFFFE（-2）
PL status     = 0x0000000D
AXI errors    = 0x00000900
```

这说明：

- PS 程序已经运行，并主动报告失败。
- 模型数据已加载，但 PL 执行过程中发生 AXI 错误。
- 不能把 CPU 停在 `bkpt` 误认为程序崩溃；程序会在写完邮箱后主动执行断点，必须以邮箱和寄存器结果判断成功与否。

### 6.13 MMU 访问问题

读取 PL 寄存器时曾出现：

```text
MMU section translation fault
```

原因：Cortex-A9 当时处于旧运行上下文，MMU 状态影响 XSDB 地址访问。

处理：停核或复位处理器后使用 `mrd -force` 重新读取。

结果：PL 寄存器可正常访问，因此该问题属于调试访问环境，而不是 PL 地址不存在。

### 6.14 直接寄存器控制隔离 PS 与 PL

通过 XSDB 直接设置：

- PL Mode
- 输入、输出和权重地址
- Active Rows
- Row Start
- Start/Clear

绕过 PS 高层流程后错误仍存在，因此根因位于 PL RTL 状态机或 AXI 地址路径，而不是单纯的邮箱逻辑。

### 6.15 定位 FFN-only 残差误读

PS 对每层执行：

```text
PS LayerNorm2
  ↓
PL FFN-only
  ↓
PS残差相加
```

模式定义：

```text
MODE_FFN_ONLY  = 0x20 → mode_reg[5]=1，mode_reg[6]=0
MODE_FFN_FINAL = 0x40 → mode_reg[6]=1
```

FFN-only 模式下，PL 只应计算 `FFN(x)`；残差 `x + FFN(x)` 由 PS 完成。

旧 RTL 在 W2 量化后无条件执行：

```verilog
state <= ST_FFN_RES_REQ;
```

即使最终 `ffn_add_residual=0`、输出不使用残差值，AXI 残差读取已经发生。PS 在 FFN-only 调用中把 `full_debug_base_reg` 设为 0，因此首次错误读取地址为 `0x00000000`。

错误数满足：

```text
每层384次 × 6层 = 2304次 = 0x900
```

注意诊断寄存器解释：

```text
0x40000088 = 0x900       → AXI错误总数
0x4000008C = 0x00000000  → 首次错误地址
0x40000090 = 0x40000080  → 错误类型/响应/状态编码，不是错误地址
```

### 6.16 修复 RTL

修复后的主跳转：

```verilog
state <= mode_reg[6] ? ST_FFN_RES_REQ : ST_FFN_WRITE_ADDR;
```

含义：

- `mode_reg[6]=1`：PL 内融合残差，读取残差数据。
- `mode_reg[6]=0`：FFN-only，跳过残差读取，直接写 FFN 输出。

并在 `ST_FFN_RES_REQ` 内增加防御判断：即使状态机意外进入该状态，只要 bit6 为 0，也取消 AXI 读取并转到写输出状态。

同时加入构建标记：

```text
0x40000094 = 0x46584632（FXF2）
```

### 6.17 重新构建并确认 FXF2

RTL 修改后重新执行：

```text
Reset synth_1
  ↓
Synthesis
  ↓
Implementation
  ↓
Generate Bitstream
```

下载新 Bitstream 后读取：

```text
build_marker = 0x46584632
```

结果：确认板卡中运行的是修复后的 FXF2 版本，而不是旧 Bitstream。

### 6.18 最终真实 FPGA 单 Token 推理

执行完整冷启动式 JTAG 流程：

```text
系统复位
  ↓
PS与DDR初始化
  ↓
下载FXF2 Bitstream
  ↓
加载全部模型数据
  ↓
下载PS ELF
  ↓
写入ROMEO:
  ↓
生成1个Token
```

最终结果：

```text
state        = 0x0000900D
rc           = 0x00000000
generated    = 1
total_length = 7
token        = 0
char         = 0x0A
pl_status    = 0x00000009
axi_errors   = 0
```

验收结论：真实板卡上的 JTAG 单 Token 推理通过。

## 七、自动化复验

### 7.1 一键 JTAG Tcl 脚本

`deploy_fx2_cold_jtag.tcl` 自动执行：

1. 检查 Bitstream、ELF、模型文件和加载脚本是否存在。
2. 连接开发板并复位系统。
3. 初始化 PS 和 DDR。
4. 下载 FXF2 Bitstream。
5. 检查构建标记。
6. 加载当前权重和全部量化参数。
7. 检查关键数据首字。
8. 下载 ELF。
9. 写入 `ROMEO:` 并生成 1 Token。
10. 轮询状态并检查验收条件。

成功标志：

```text
DEPLOY_PASS fx2_cold_jtag_romEO_single_token
```

### 7.2 PowerShell 启动方式

```powershell
& 'D:\FPGA\NanoGPT\deploy_current_20260808\run_fx2_cold_jtag.ps1'
```

PowerShell 只负责调用 XSDB；真正的板级操作由 Tcl 中的 XSDB 命令完成。

## 八、独立启动包制作

### 8.1 BIF 分区顺序

```text
FSBL
  ↓
FXF2 Bitstream
  ↓
weights/scales
  ↓
Embedding
  ↓
LayerNorm与LM Head参数
  ↓
PS ELF
```

使用 `[load=地址]` 指定模型数据在启动时写入的 DDR 地址，ELF 放在最后，保证应用启动前模型数据已经加载完成。

### 8.2 Bootgen 命令

```powershell
& 'D:\Xilinx\2026.1\Vitis\bin\bootgen.bat' `
  -arch zynq `
  -image 'D:\FPGA\NanoGPT\deploy_current_20260808\boot\BOOT_fx2_standalone_20260809.bif' `
  -o 'D:\FPGA\NanoGPT\deploy_current_20260808\boot\BOOT_fx2_standalone_20260809.bin' `
  -w on
```

结果：

```text
Bootimage generated successfully
大小   = 14,923,256 字节
SHA256 = 409C742A40A303E62F77E7916EDA356A84570099168F74A5449E8016122601F5
```

Bootgen Partition Header Table 已确认所有数据分区的加载地址正确。

## 九、问题、证据、根因与处理汇总

| 问题 | 关键证据 | 根因 | 处理与结果 |
|---|---|---|---|
| Vivado IP revision change | 4 个 AMD IP 显示推荐修订版 | 工程版本早于 Vivado 2026.1 | Upgrade IP 并重新生成 Output Products |
| Synthesis/Implementation Out-of-date | Vivado 顶部提示 Out-of-date | IP/RTL/输出文件发生变化 | Reset Runs 后重新综合实现 |
| Vitis 链接失败 | `undefined reference to __bss_start__` | 未正确使用 `lscript.ld` | 设置 Linker Script，ELF 构建成功 |
| MMU translation fault | XSDB 无法读取 `0x40000054` | ARM 旧运行上下文/MMU 状态 | 停核或复位后读取成功 |
| 第一次推理失败 | `DEAD0000`、`rc=-2` | PL 报告运行错误 | 继续读取 PL/AXI 诊断寄存器 |
| AXI 错误 0x900 | `2304=6×384` | 每层 FFN 每个特征多读一次残差 | 定位 FFN-only 状态机路径 |
| FFN-only 错误读取 | 首次错误地址 `0x0` | 旧 RTL 无条件进入 `ST_FFN_RES_REQ` | 由 `mode_reg[6]` 控制是否读取残差 |
| 旧/新 Bitstream 难区分 | 旧寄存器签名无法证明修复版 | 板上可能仍是旧构建 | 新增 `FXF2=0x46584632` 标记 |
| HW Target shutdown | `Labtoolstcl 44-513` | 旧 JTAG/hw_server 会话关闭 | 重启 hw_server 并重新连接 |
| DAP/APB 锁死 | `DAP status 0xF0000021` | XSDB 被强制中断或连续复位后调试端口异常 | 板卡物理断电约 10 秒后恢复 |
| PowerShell 中文脚本解析错误 | 无 BOM UTF-8 在 Windows PowerShell 5 中解析异常 | PowerShell 5 默认编码行为 | 入口脚本改为纯 ASCII 文本 |
| PowerShell 误报失败 | 输出已经包含 `DEPLOY_PASS` 仍抛异常 | 对多行数组逐行执行 `-notmatch` | 合并为单个字符串后再检查 |
| SD 卡电脑不可见 | Windows 只有 C:/D: 和一块 NVMe | SD 卡插在 FPGA 板上，不是电脑读卡器 | 待读卡器到达后写入 SD 卡 |

## 十、最终产物与指纹

| 产物 | 大小 | SHA256 |
|---|---:|---|
| `system_wrapper.bit` | 4,045,769 | `952B6ECCB652FDD0D833A7B738CDEBFF396A64D5D1E4B35177A19DCC6A14B217` |
| 当前 XSA | 1,323,540 | `672E78F81B92A521B0A84414D3B5AD57DCC4DF3A29954F5756029A3C06FDA1ED` |
| `ps_mailbox_runner.elf` | 56,720 | `5035B7A3B9999181A97E05C6970A2E2BA629223D8B56E190D03B77BFBE1FF673` |
| `weights.bin` | 10,641,792 | `0F6B6BF5376041C66704377B90FB0937E9C4774D8A139F4853B843063BAA5AB7` |
| `scales.bin` | 144 | `297D48D788A22BDA267C02388C9340C0955686223CAC42CEBBCDDD8F4AB2AED8` |
| 完整独立启动包 | 14,923,256 | `409C742A40A303E62F77E7916EDA356A84570099168F74A5449E8016122601F5` |

## 十一、当前实验结论

### 11.1 已完成

```text
当前权重与参数版本对齐
Vivado综合/实现/Bitstream通过
Vitis Platform与ELF构建通过
真实板卡JTAG加载通过
PS/PL协同6层推理通过
单Token生成通过
AXI错误数为0
完整BOOT.bin生成并通过分区表检查
```

正式表述：

> 当前 nanoGPT INT8/Q30 模型已在 Zynq-7020 FPGA 板上通过 JTAG 完成单 Token 板级推理。输入提示词为 `ROMEO:`，生成 Token ID 为 `0`，字符为换行符，PS 返回码为 0，PL 状态为完成，AXI 错误计数为 0。

### 11.2 待完成

1. 使用读卡器将完整启动包复制到 FAT32 SD 卡根目录并命名为 `BOOT.bin`。
2. 设置开发板 SD Boot 模式。
3. 完全断电后重新上电，验证无 JTAG/XSDB 独立启动。
4. 通过 UART 看到 `nanoGPT Zynq UART ready`。
5. 通过 UART 输入 `1:ROMEO:` 并确认返回一个生成字符。
6. 再进行多 Token、重复运行、延迟与 Python Q30 对齐实验。

## 十二、下一次实验建议顺序

```text
确认SD卡盘符和FAT32
  ↓
备份旧BOOT.bin
  ↓
复制完整启动包并重命名为BOOT.bin
  ↓
安全弹出SD卡
  ↓
板卡断电插卡并设置SD Boot
  ↓
连接UART终端
  ↓
重新上电并观察启动信息
  ↓
输入1:ROMEO:
  ↓
记录Token、字符、耗时和异常
```

只有 SD 启动和 UART 验收实际通过后，才能把项目结论更新为“脱机单板单 Token 输出实验完成”。
