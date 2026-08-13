# 学习状态总结与一周 FPGA 部署学习计划

## 一、报告目的

本报告根据前七章学习过程、代码实验、终端日志和当前项目文件，回答四个问题：

1. 我目前已经掌握了什么？
2. 为什么感觉七章知识是零散的？
3. 接下来应该先补框架、学 Python，还是继续实验？
4. 一周内怎样以最高优先级推进到 FPGA 部署验证？

## 二、当前学习画像

### 1. 学习偏好

从你的提问和实验反馈来看，你更适合以下方式：

- **先看整体数据流，再看局部代码**：如果直接进入某一行代码，你容易暂时理解它，却不知道它在整个模型中的位置。
- **代码必须绑定真实输出**：你对 shape（张量形状）、Token ID、scale、mismatch 和终端日志的理解明显比纯理论更牢固。
- **喜欢逐步拆解**：一次讲一个模块，马上通过复述和小实验确认，而不是一次学习整份文件。
- **需要类比和图示**：Attention、QKV、残差、量化和 Q30 这类抽象内容，需要配数据流图、形状变化和生活类比。
- **适合“我讲你评”**：你愿意先回答，即使回答“不知道”，也能根据纠错继续建立概念。
- **偏好可执行命令**：PowerShell 命令、运行结果和验证标准会让学习目标变得明确。
- **需要英文缩写记忆辅助**：以后出现缩写时，必须同时给出英文全称、中文含义和本项目中的作用。

### 2. 已有基础

- 学过神经网络、CNN（Convolutional Neural Network，卷积神经网络）。
- 学过 PyTorch（深度学习框架）基本使用。
- 学过 C 语言，具备变量、函数、数组、指针和编译执行的基础思维。
- 已经完成 nanoGPT 七章主线学习：模型骨架、Transformer Block、Attention、训练、生成、数据准备和量化链路。
- 已经实际运行过 CUDA（Compute Unified Device Architecture，统一计算设备架构）版 PyTorch、INT8 量化脚本和 Q30 Python 参考流程。

### 3. 已经形成的能力

你目前已经能够解释：

- `B`、`T`、`C` 和 `V` 分别表示批次、序列长度、特征维度和词表大小。
- Token Embedding 和 Position Embedding 如何相加并进入 Transformer Block。
- Attention 如何通过 Q、K、V 计算位置之间的关联和加权信息。
- MLP 只对每个位置独立进行特征变换，并将维度从 384 扩展到 1536 再压回 384。
- 训练分支如何计算 loss、反向传播和更新参数。
- 推理分支为什么只取最后一个位置的 logits。
- `train.bin`、`val.bin`、`meta.pkl` 的作用。
- INT8 权重、激活值和 scale 的关系，以及 Q30 为什么适合 FPGA 的整数计算。
- `mismatch=0` 只能证明 Python 参考流程自一致，不能直接证明 FPGA 已经一致。

## 三、当前主要问题诊断

### 问题一：知识点已经学过，但没有形成一条主线

你不是完全不懂 Transformer，而是缺少下面这条完整因果链：

```text
字符文本
  ↓ stoi
Token ID
  ↓ wte + wpe
(B,T,C) 浮点输入
  ↓ 6 层 Transformer Block
上下文特征
  ↓ LayerNorm
最后位置特征
  ↓ lm_head
(B,1,V) logits
  ↓ argmax 或采样
下一个 Token ID
  ↓ itos
字符文本
```

量化和 FPGA 只是在这条链上改变了“内部数字格式和执行位置”：

```text
FP32 浮点模型
  ↓ 量化
INT8 权重 + INT8 激活 + scale
  ↓ Q30 定点换算
FPGA 整数乘加
  ↓ PS 解码
Token ID 和字符
```

### 问题二：Python 基础不是完全不会，而是没有结合项目代码

目前最影响你阅读代码的不是复杂算法，而是以下 Python 代码结构：

- 函数参数、返回值和元组解包。
- 类、对象、成员变量和继承。
- `dict`、`list`、`tuple`、文件路径和 JSON/Pickle 文件。
- `x[:, -1, :]` 等切片。
- `torch.Tensor`、NumPy 数组和 `.shape`、`.dtype`、`.view()`、`.reshape()`。
- `if targets is not None` 这类分支。
- 命令行参数和配置覆盖。

这些内容不适合单独脱离项目学很久，而应该在阅读 `model.py`、`train.py`、`sample.py` 和 `tools/` 时逐个补齐。

### 问题三：代码浏览范围太大，容易产生认知负担

项目中同时存在：

- Python 模型和训练代码。
- INT8/Q30 参考脚本。
- Vivado 工程、RTL 和 IP。
- Vitis PS 程序。
- DDR 镜像、LUT、权重和串口工具。

这些文件不是同一层级的问题。当前应先建立“文件属于哪一层”的地图，再决定是否打开具体文件。

### 问题四：当前模型版本与 FPGA 历史参数存在风险

已检查到：

- 当前 Python Q30 参数权重指纹：`0f6b...5ab7`。
- Vivado 旧硬件参数权重指纹：`60ff...0bb9`。

这表示不能直接把当前 Python 的结果和旧 FPGA 参数混在一起进行最终验收。部署前必须重新确认 checkpoint、INT8 权重、scale、DDR 镜像和硬件工程是否属于同一版本。

## 四、我的建议：接下来不单独学习完整 Python 课程

### 结论

你的下一步不是继续盲目进入新章节，也不是先花一周从头学习 Python。最合适的路线是：

```text
先用半天补齐总框架
  ↓
在真实项目文件中补最小 Python 能力
  ↓
锁定当前模型和硬件参数版本
  ↓
学习 Vivado PL 数据流
  ↓
编译 Vitis PS
  ↓
连接开发板做单 Token 验证
  ↓
再做 20/200 Token 对齐
```

原因是：

- 只继续学理论，会继续增加“概念孤岛”。
- 只学习 Python 语法，会脱离一周内 FPGA 部署目标。
- 直接烧 FPGA，会因为版本不一致和数据链路不清楚而难以排错。
- “框架复盘 + 最小 Python + 实验推进”能同时补理解和项目进度。

## 五、接下来采用的教学方式

每次学习控制在一个小模块内，固定采用以下闭环：

```text
1. 本模块在总系统中的位置
2. 真实文件和函数
3. 输入、输出和形状
4. 生活类比或数据流图
5. 逐行解释关键代码
6. 你用自己的话复述
7. 我逐点评价：对 / 错 / 补充
8. 一个最小改代码或运行实验
9. 查看结果并记录
```

教学规则：

- 每次只讲一个模块，不一次讲完整 Vivado、Vitis 和 FPGA 部署。
- 先给框架图，再进入细节。
- 只基于当前项目真实文件讲解。
- 代码中的英文缩写第一次出现时，说明英文全称、中文含义和代码作用。
- 你能复述且实验通过后，才进入下一模块。
- 出现错误理解时，先纠正因果关系，再继续。
- 重要修改前提醒打包工程，尤其是 `ckpt.pt`、INT8 权重、scale 和 Vivado 输出目录。

## 六、2026-08-09 最新部署状态

### 6.1 已经真实完成

以下结论来自当前开发板现场实验，不再只是 Python 或历史报告：

1. 当前模型权重、scale、Embedding、Q30 参数已经统一，权重 SHA256 为 `0f6b6bf5376041c66704377b90fb0937e9c4774d8a139f4853b843063baa5ab7`。
2. Vivado 2026.1 已完成 Synthesis（综合）、Implementation（实现）和 Bitstream（配置比特流）生成。
3. Vitis 2026.1 已读取当前 XSA，Platform 和 `ps_mailbox_runner.elf` 均构建成功。
4. 已定位并修复 FFN-only 条件下错误读取残差数据的问题，并用 `FXF2 = 0x46584632` 标记修复后的硬件版本。
5. 已通过 JTAG（Joint Test Action Group，联合测试行动组）和 XSDB（Xilinx System Debugger，赛灵思系统调试器）在真实 Zynq-7020 开发板完成单 Token 推理。
6. 输入 `ROMEO:`，板端生成 Token ID `0`，对应字符 `0x0A`（换行符），PS 返回码为 `0`，PL 状态为完成，AXI 错误计数为 `0`。
7. 已生成包含 FSBL、FXF2 Bitstream 和 PS ELF 的独立启动文件：

```text
D:/FPGA/NanoGPT/deploy_current_20260808/boot/BOOT_fx2_standalone_20260809.bin
```

完整证据见：`15_Vivado至FPGA单Token板级实验记录_2026-08-09.md`。

### 6.2 尚未完成，禁止提前写成通过

- SD 卡断电脱机启动。
- UART（Universal Asynchronous Receiver/Transmitter，通用异步收发器）提示词输入和字符输出。
- 8、20、200 Token 的单板连续生成。
- 多 Token 板端序列与 Python Q30 序列逐 Token 对齐。
- 连续三次稳定性、单 Token 延时、总耗时和吞吐率测试。
- 不使用 PowerShell、从打开 Vivado 开始的纯 GUI 部署复现。

## 七、2026-08-10 明日任务与执行计划

### 7.1 总目标

优先完成剩余板级验收，形成下面的完整闭环：

```text
SD卡 BOOT.bin 脱机启动
  → UART 连接与提示词输入
  → 1 Token 基线复验
  → 8 Token 冒烟测试
  → 20 Token 对齐
  → 200 Token 长序列
  → 连续三次稳定性与性能
  → 日志、截图和部署包归档
```

只有以上主线完成后，才进行“从 Vivado 开始、不使用 PowerShell”的 GUI 全流程复现。

### 7.2 P0：SD 卡脱机启动验收

| 项目 | 内容 |
|---|---|
| 目的 | 证明开发板断电后无需 JTAG、XSDB 或电脑命令行即可加载 PL 和 PS 程序 |
| 输入 | FAT32 SD 卡、`BOOT_fx2_standalone_20260809.bin`、读卡器、开发板 Boot 模式开关 |
| 操作 | 将目标文件复制到 SD 卡根目录并重命名为唯一的 `BOOT.bin`；安全弹出；板卡断电；设置 SD Boot；插卡后重新上电 |
| 输出 | 开发板完成 FSBL → Bitstream → ELF 启动 |
| 成功判据 | 不连接 JTAG/XSDB 也能启动；UART 出现 `nanoGPT Zynq UART ready` 或项目定义的就绪信息 |
| 常见失败 | SD 卡非 FAT32、文件不在根目录、存在多个 BOOT 文件、启动拨码错误、启动包仍引用旧 Bitstream/ELF |

### 7.3 P0：UART 与单 Token 脱机复验

| 项目 | 内容 |
|---|---|
| 目的 | 证明电脑能够通过串口向脱机运行的板卡发送提示词并收到字符 |
| 输入 | USB-UART 连接、115200 baud、8N1、ASCII 提示词 `1:ROMEO:` |
| 操作 | 先用串口终端确认启动信息，再运行 `host_tools/nanogpt_uart_gui/dist/KeChuangNanoGPT.exe` 发送请求 |
| 输出 | 板端返回一个生成字符和下一次输入提示符 |
| 成功判据 | 生成 Token ID 仍为 `0`，字符为 `0x0A`；无 PL 错误或程序卡死 |
| 常见失败 | 选错 COM 口、TX/RX 接反、缺少共地、波特率错误、发送协议缺少 `输出数:` 前缀 |

### 7.4 P0：多 Token 单板离线生成

按由短到长的顺序执行，任何一级失败都先保留现场，不直接跳到 200 Token：

| 阶段 | 输入 | 目的 | 成功判据 |
|---|---|---|---|
| 基线 | `1:ROMEO:` | 确认脱机环境仍与 JTAG 单 Token 基线一致 | 生成 1 个 Token，Token ID 为 `0` |
| 冒烟 | `8:ROMEO:` | 检查多轮“生成 → 拼接 → 再推理”循环 | 完整返回 8 个字符，无超时、无复位 |
| 对齐 | `20:ROMEO:` | 与 Python Q30 做逐 Token 比较 | 记录 20 个 Token ID、首个分歧位置和上下文 |
| 长序列 | `200:ROMEO:` 或仓库既定 200 Token 提示词 | 检查上下文增长、缓存、稳定性和性能 | 完整生成目标长度，程序无卡死，日志可导出 |

多 Token 验收必须记录：提示词、生成数量、板端 Token ID 序列、字符序列、Python Q30 序列、首个 mismatch、总耗时和错误状态。字符看起来相同不能代替 Token ID 对齐。

### 7.5 P0：重复运行、性能和最终归档

1. 对同一提示词连续运行三次。
2. 比较三次 Token ID 序列是否完全一致。
3. 记录首 Token 延时、平均单 Token 延时、总耗时和 Token/s。
4. 保存 UART 日志、关键截图、当前 Bitstream、XSA、ELF、`BOOT.bin`、manifest 和 SHA256。
5. 更新实验记录，严格区分“JTAG 通过”“SD 脱机通过”“UART 通过”“多 Token 对齐通过”。

成功判据：三次输出确定一致；无 AXI 错误、无超时、无异常复位；最终部署包中的权重指纹仍为 `0f6b6b...5ab7`。

### 7.6 P1：有剩余时间时，纯 GUI 重新部署一次

此任务不影响 P0 验收，只有 P0 全部完成后再做。目标是在不使用 PowerShell 的情况下，从打开 Vivado 开始独立完成一次部署：

```text
Vivado 打开 nano_gpt.xpr
  → 检查 IP Status 与 Block Design
  → Run Synthesis
  → Run Implementation
  → Generate Bitstream
  → Export Hardware Platform（包含 Bitstream）
  → Vitis Switch / re-read XSA
  → Generate Platform
  → Build ps_mailbox_runner
  → 使用 Vitis 图形调试界面下载并运行
  → UART 验收
```

限制说明：不使用 PowerShell，不等于完全不使用任何调试后端；Vitis 图形调试仍会在后台使用 hw_server/TCF。若 GUI 无法完成模型二进制装载，应如实记录为工具能力边界，不要为了满足形式要求隐瞒必要步骤。

## 八、历史一周学习与部署路线（已执行，保留用于复盘）

### 第 1 天：重新拼接总框架

目标：能用 3 分钟回答“Transformer 是什么”。

学习内容：

- 从字符输入到 Token ID。
- `model.py` 的完整数据流。
- 6 个 Transformer Block 的作用。
- 从最后一个位置到下一个 Token 的生成过程。
- FP32、INT8、Q30 在同一条数据流中的位置。

验收标准：能够画出并口述：

```text
文本 → Token ID → Embedding → 6×Block → LayerNorm → lm_head → Token ID → 文本
```

### 第 2 天：补最小 Python 阅读能力并回看主文件

目标：能顺着代码找到数据如何变化，而不是逐字理解所有 Python 语法。

只补这些内容：

- 函数和返回值。
- 类和成员变量。
- 列表、字典和元组解包。
- 切片和张量维度。
- `view`、`reshape`、`transpose`、`split`。
- 文件路径、JSON 和 Pickle。

实践文件：

```text
python\nanoGPT\model.py
python\nanoGPT\train.py
python\nanoGPT\sample.py
```

验收标准：能指出 `x` 在关键位置的形状，并能解释每个分支为什么存在。

### 第 3 天：锁定当前 Python 量化版本

目标：生成一套可以交给 FPGA 的“版本一致”数据包。

检查内容：

- `ckpt.pt` 的模型配置和权重指纹。
- INT8 状态字典。
- 当前激活 scale。
- Q30 乘法参数。
- 权重、scale、LUT 和 DDR 镜像的来源。

验收标准：所有 manifest（清单文件）中的模型配置、权重指纹和 scale 来源一致；旧版本文件不直接混用。

### 第 4 天：学习 FPGA 侧 Transformer 数据流

目标：看懂 Vivado 工程中 PS、DDR、DMA 和 Transformer 核之间如何连接。

重点文件：

```text
vivado_project\nano_gpt.xpr
vivado_project\rtl\system_wrapper.v
vivado_project\rtl\hls_kernel_chain_axis_top.v
02_Vivado_PL\README.md
artifacts\VALIDATION.md
```

重点术语：

- PS（Processing System，处理系统）。
- PL（Programmable Logic，可编程逻辑）。
- DDR（Double Data Rate，双倍数据速率存储器）。
- DMA（Direct Memory Access，直接存储器访问）。
- AXI（Advanced eXtensible Interface，高级可扩展接口）。

验收标准：能指出 Token、权重和中间数据分别经过哪条路径。

### 第 5 天：编译 Vitis PS 程序

目标：让 PS 软件具备控制 PL、读写 DDR、接收 Token 和输出字符的能力。

重点文件：

```text
vitis\README.md
vitis\workspace_sources\ps_mailbox_runner\src\main.c
ps\src\main.c
```

验收标准：Vitis GUI（图形用户界面）Build All 错误数为 0，并生成 ELF（Executable and Linkable Format，可执行与可链接格式）文件。

### 第 6 天：单 Token 板级验证

目标：完成电脑 Prompt 到 FPGA 返回一个字符的闭环。

数据流：

```text
电脑 Prompt
  → UART（串口）
  → PS Tokenizer（分词器）
  → DDR
  → PL Transformer
  → Argmax Token
  → PS 解码
  → UART 返回字符
```

验收标准：同一 Prompt 下，Python Q30 和 FPGA 的首个 Token ID 一致。

排错顺序：

1. 先确认串口连接和波特率。
2. 再确认 PS 能读到 Prompt。
3. 再确认 Token ID 和 DDR 地址正确。
4. 再比较 PL 最终 logits/argmax。
5. 最后才排查具体 Transformer 层。

### 第 7 天：多 Token、记录和打包

目标：完成 20 Token 或 200 Token 的稳定性验证，并留下可复现记录。

验证内容：

- Python Q30 与 FPGA Token ID 序列。
- 各层中间数据 mismatch。
- 连续运行三次是否一致。
- 单 Token 延迟、总耗时和生成速度。
- 将当前工程、参数清单、日志和实验记录打包备份。

注意：如果开发板、JTAG 或 UART 尚未就绪，第 6、7 天只能完成软件和仿真准备，不能把结果写成板级部署通过。

## 九、每次学习的最小验收标准

每个模块至少完成以下三项：

1. **能说**：不用照抄术语，用自己的话解释模块作用。
2. **能看**：能在真实文件中找到对应代码和输入输出。
3. **能跑**：改一个小参数或增加一个打印，运行后能解释结果。

对于 FPGA 部署，再增加两项：

4. **能对齐**：知道比较的是 Token ID、阶段 INT8 数据还是字符。
5. **能排错**：能区分版本、文件、串口、PS、PL 和算法问题。

## 十、最终学习目标

一周结束时，不要求你记住项目中的每一行代码，但要达到以下状态：

- 能用自己的话说明 Transformer 的输入、核心计算和输出。
- 能看懂 `model.py` 的主干，知道每个张量的形状变化。
- 能看懂量化包、scale、Q30 参数和 DDR 镜像分别做什么。
- 能解释 Python、Vivado、Vitis、PS、PL 和 FPGA 之间的关系。
- 能运行并验证一条完整的 Token 生成链路。
- 遇到输出不一致时，能按照证据链定位问题，而不是盲目修改参数。

历史阶段的优先讲解曾是 Transformer 总图和 Vivado PL 工程架构；这些内容现已完成，不再作为下一个窗口的起点。

## 十一、历史接手信息（已被第十二节最新交接替代）

本文件和 `AI交接包_前七章学习资料` 文件夹用于直接交接，不需要让用户重新从第一章开始学习。

### 用户不是零基础

用户已经连续学习 nanoGPT 七天，能够解释 B、T、C、V、QKV、Attention、MLP、残差、LayerNorm、交叉熵、反向传播、INT8、scale 和 Q30。当前主要缺口是：

- 七章知识还没有拼成一条完整数据流。
- Python 代码阅读能力不足，尤其是类、函数、字典、切片和张量操作。
- 尚未系统阅读 Vivado PL、Vitis PS 和板级 Token 数据流。

### 不要重复做的事情

- 不要把 Transformer 七章内容一次性重新讲一遍。
- 不要脱离项目开一门完整 Python 课程。
- 不要把 Python 自一致性 mismatch=0 说成 FPGA 验证通过。
- 不要直接使用历史 DDR 镜像做当前模型验收。

### 接手后的第一轮

1. 让用户用自己的话复述“字符 → Token → Embedding → 6×Block → lm_head → Token”的总数据流。
2. 只补复述中暴露出的 Python 语法缺口。
3. 检查当前 checkpoint、INT8 权重、scale、Q30 参数和旧 FPGA DDR 镜像的版本指纹。
4. 进入 `vivado_project/nano_gpt.xpr` 和 `02_Vivado_PL/README.md`，讲解 PS、DDR、DMA、PL 和 Transformer 核的连接。
5. 再进入 Vitis PS 编译和单 Token 板级验证。

### 交付目标

目标是在 2026 年 8 月 10 日左右完成 FPGA 部署与初步验证。必须根据开发板、JTAG、UART、Vivado 和 Vitis 的实际状态汇报；如果硬件条件未满足，只能报告软件准备或仿真完成，不能写成板级通过。

## 十二、给下一个窗口的最新接手要求

1. 不要重新教学前七章，也不要重新做已经通过的 JTAG 单 Token 实验，除非新的结果与基线冲突。
2. 第一优先级是 SD 卡脱机启动、UART、8/20/200 Token、三次稳定性和性能记录。
3. 每次只推进当前最有信息增益的一步；失败时说明正在验证的假设、预期结果、实际结果和下一分支。
4. 用户希望由 AI 一步一步引导操作；一次只给当前步骤，收到结果后再继续。
5. 主线完成后，如有时间，再指导用户从打开 Vivado 开始，通过 Vivado/Vitis GUI 重做部署，尽量不使用 PowerShell。
6. 所有结论必须注明属于 Python、JTAG、SD 脱机、UART 还是多 Token 层级，禁止跨层级推断。
