# 实验记录：AX7020 上板启动与 Token 生成验证 记录人员：王昊

## 时间：2026/8/17 下午 3.-6.

## 一、实验环境

操作系统：Windows。

开发工具：Vivado/Vitis 2026.1。

开发板：ALINX AX7020，Xilinx Zynq-7000 XC7Z020，CLG400 封装。

启动介质：板载 Winbond 256Mbit QSPI Flash；最终使用 QSPI 启动。

串口：板载 USB UART，COM4，115200 baud，8 数据位，1 停止位，无校验。

连接方式：板载 USB 数据线连接电脑，同时提供 JTAG 调试和 UART 串口。

部署文件名：BOOT\_day3\_practice\_qspi\_v4\_ps\_uart.bin。

部署目录：D:\FPGA\NanoGPT\deploy\_current\_20260808\boot。

部署文件大小：14,950,404 字节；SHA-256：BACF8A4E4D8357F13E535E142E5DAC4D3F07F5ABE9521688EA09EC2FB5844F35。

## 二、两个主实验的划分

| 主实验 | 包含的子步骤 | 主要目标 |
| --- | --- | --- |
| 实验一：AX7020 QSPI 启动与应用交接 | QSPI 启动；FPGA 配置；PS 应用加载；UART 就绪 | 确认 BOOT 文件能够完整启动并运行应用 |
| 实验二：单/多 Token 输入与输出 | 1 个输入 Token；多输入 Token；一次和多次生成 | 确认串口命令、Token 编码、推理循环和输出数量 |

## 三、实验方法

本次按照“启动链路—串口命令—Token 解码—生成循环”的顺序验证：

BOOT.bin
 ↓
QSPI Flash 读取 FSBL
 ↓
下载 FPGA bitstream
 ↓
加载 PS 应用与模型数据
 ↓
UART 输出 nanoGPT Zynq UART ready
 ↓
输入 N:提示词
 ↓
贪心 argmax 生成 N 个新 Token

串口命令格式：数字加冒号表示生成数量，例如 1:A 表示输入 A 并生成 1 个新 Token；8:Hello 表示输入 Hello 并生成 8 个新 Token。

当前板端使用字符级词表。词表中 Token 0 对应换行符，Token 1 对应空格，A、H、e、l、o 等普通字符各占一个 Token。

## 四、实验一：AX7020 QSPI 启动与应用交接

### 1.1 启动模式和硬件状态

将板卡启动跳线设置为 QSPI，插入 BOOT 文件后上电。串口首先显示 Boot mode is QSPI、WINBOND 256M Bits、QSPI Init Done，随后显示 FPGA Done。

### 1.2 FSBL 分区加载和应用交接

FSBL 共识别 10 个分区，其中第一个为 bitstream，后续为 PS 应用和模型数据。应用分区的 Load Addr 与 Exec Addr 均为 0x00100000，最终显示 Handoff Address: 0x00100000 和 SUCCESSFUL\_HANDOFF。

### 1.3 板端启动结果

| 检查项目 | 结果 |
| --- | --- |
| PWR 指示灯 | 亮 |
| QSPI 启动识别 | Boot mode is QSPI，PASS |
| QSPI Flash | WINBOND 256M Bits，4-bit mode，PASS |
| FPGA 配置 | FPGA Done!，PASS |
| PS 应用交接 | SUCCESSFUL\_HANDOFF，FSBL Status = 0x1，PASS |
| UART 初始化 | nanoGPT Zynq UART ready，PASS |
| 实验一结论 | QSPI 启动链路完整通过 |

## 五、实验二：单 Token 与多 Token 输出验证

### 2.1 单 Token 输入、单 Token 输出

发送 1:A 并补充回车。板端回显命令，随后显示 output:，再重新出现 >。生成结果在界面上为空白，是因为生成的 Token 0 为换行符。

### 2.2 多 Token 输入、单 Token 输出

发送 1:Hello 和 1:Hell。Hello 含 5 个字符 Token，Hell 含 4 个字符 Token；两次均完成 1 个新 Token 的推理并返回提示符。

### 2.3 多 Token 输出

发送 8:Hello。板端在 output: 后产生 8 个空白行，然后返回 >。这说明生成次数控制确实执行了 8 次，而不是串口无响应。

| 测试命令 | 观测结果 |
| --- | --- |
| 1:A | 输入 1 个 Token；生成 1 个 Token；结果为 Token 0（换行）；PASS |
| 1:Hello | 输入 5 个 Token；生成 1 个 Token；结果为 Token 0（换行）；PASS |
| 1:Hell | 输入 4 个 Token；生成 1 个 Token；结果为 Token 0（换行）；PASS |
| 8:Hello | 输入 5 个 Token；生成 8 个 Token；8 个结果均为 Token 0（换行）；PASS |
| 实验二结论 | 串口命令解析、字符编码、生成次数和回显流程均正常 |

## 六、实验结果分析

### 3.1 “output:” 后为空白的原因

这不是串口没有收到结果。程序会把生成字符直接发送到 UART，再补充换行。如果生成字符本身就是换行符，屏幕上就表现为 output: 后多出一行空白。

### 3.2 为什么连续生成多个换行

板端的 generate\_greedy 使用贪心 argmax：每一步只选择分数最高的 Token。当前输入下第 0 号 Token 的分数最高，程序把它追加回上下文后，下一步仍选择第 0 号 Token，因此形成连续换行。

### 3.3 目前实验能证明什么

已证明：QSPI 启动、bitstream 下载、PS 应用交接、UART 通信、字符级 Token 编码和生成数量控制均正常。

暂不能证明：板端贪心生成已经具备良好的文本生成质量。当前输出更像是推理链路和接口验收结果。

项目记录中的基线 1:ROMEO: 首个 Token 为 0，与本次 Token 0 对应换行的现象一致。

## 七、实验资料

BOOT 文件和构建资料：

D:\FPGA\NanoGPT\deploy\_current\_20260808\boot\
BOOT\_day3\_practice\_qspi\_v4\_ps\_uart.bin
BOOT\_day3\_practice\_qspi\_v3.bif

PS 应用和链接脚本：

D:\FPGA\workspace\_manual\_2026\_1\ps\_mailbox\_runner\
main.c
lscript.ld

板卡资料：

D:\FPGA\AX7Z020\AX7Z020\course\_s1\course\_s1\
led\_qspi\_sd\led\_qspi\_sd.sdk\fsbl\Debug\
fsbl.elf

## 八、实验问题与排障记录

### 问题一：SD 启动无反应

现象：SD 模式下 DONE 不亮，串口没有应用输出。排查后确认 SD 卡检测或启动链路不稳定，因此改用板载 QSPI Flash 验证，最终 QSPI 启动成功。

### 问题二：应用运行但 USB UART 无输出

原因：原应用使用 PL 自定义 UART 引脚，和 AX7020 板载 USB UART 的 PS UART MIO48/MIO49 不一致。修正 main.c，改用 PS UART 基地址 0xE0001000 后，串口显示 nanoGPT Zynq UART ready。

### 问题三：串口助手发送后没有立即推理

原因：串口助手的文本发送没有附带回车结束符，程序一直等待当前行结束。切换为 HEX 模式发送 0D，结束积累的输入后恢复正常；之后按命令发送时使用命令末尾的回车字节。

### 问题四：应用没有正确交接

原因：应用链接地址和 BIF 分区顺序曾导致 Handoff Address 为 0。将应用链接到 DDR 0x00100000，并把应用分区放到 bitstream 后、模型数据前，最终出现 SUCCESSFUL\_HANDOFF。

## 九、实验结论

本次 AX7020 上板验证完成。QSPI 启动、FPGA 配置、PS 应用加载、UART 通信以及单 Token/多 Token 输入与输出数量控制均已通过。当前板端输出连续换行属于贪心 argmax 对 Token 0 的重复选择；若要生成可见文本，后续需要继续验证模型参数一致性，或加入采样/Top-K 解码。