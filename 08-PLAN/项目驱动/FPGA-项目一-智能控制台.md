---
type: project
status: active
level: project
name: FPGA 智能控制台
duration: 3 天
board: AX7035B
requirement: 仅板载资源（LED×4 + 按键×4 + 拨码×4 + UART）
created: 2026-08-24
parent: [[08-PLAN/2026/08-八月/2026-W35/2026-W35-周计划|2026 W35 周计划]]
---

# 🏗️ 项目一：FPGA 智能控制台（3 天）

> 原则：边做边学，卡住再查，不提前学

---

## 🎯 项目目标

做一个能用 **按键 + 拨码 + PC 串口** 三种方式控制的 LED 系统。

**最终能演示什么：**
1. 板子 4 个按键 → 控制 4 个 LED 独立亮灭
2. 4 个拨码开关 → 切换 4 种 LED 模式（流水灯、呼吸灯、二进制计数、全亮全灭）
3. PC 串口发命令（如 `led 1 on`、`mode 2`）→ 控制 LED
4. PC 串口发 `status` → 板子回传当前状态

---

## 📖 你要学到什么

| 学到的技能 | 有什么用 |
|:----------|:---------|
| HLS 模块怎么写、怎么综合、怎么导出 IP | 所有后续项目的基础 |
| Vivado 怎么调用 HLS IP、绑定引脚、烧录 | 整个 FPGA 开发流程 |
| UART 串口怎么在 HLS 里实现 | 板子和 PC 通信的基础 |
| 按键消抖、多模式切换 | 嵌入式开发的通用技巧 |

---

## 🗓️ Day 1（08-24）：按键控制 LED 亮灭

### 最终目标
按板子上的按键 → 对应的 LED 亮/灭。

### 一步一步怎么做

**第 1 步：新建 Vivado HLS 工程**
1. 打开 Vivado HLS
2. 创建工程，取名 `led_control`
3. 器件选 AX7035B 的 `xc7a35tftg256-1`
4. 搜"Vivado HLS 新建工程 教程"（不会的话）

**第 2 步：写按键控制 LED 的 HLS 代码**
- 在 `Source` 里新建文件 `led_control.cpp`
- 写入以下代码：

```c
void led_control(
    bool btn[4],  // 4 个按键输入
    bool led[4]   // 4 个 LED 输出
) {
    for(int i = 0; i < 4; i++) {
        led[i] = !btn[i];  // 按键按下=0 → LED 亮
    }
}
```

**第 3 步：综合（C Synthesis）**
- 点工具栏的绿色三角 ▶
- 看综合报告：Latency、LUT、DSP
- 截图保存

**第 4 步：导出 IP**
- 点 `Export RTL` → 导出为 IP 核
- 会生成一个 `led_control.zip`

**第 5 步：在 Vivado 里调用这个 IP**
1. 打开 Vivado（不是 HLS），新建工程
2. 点 `IP Catalog` → `Add IP` → 找到你导出的 IP
3. 把 IP 拖到 Block Design 里
4. 右键 IP → `Make External` → 自动生成端口

**第 6 步：绑定物理引脚**
- 打开 AX7035B 原理图 PDF（光盘里或官网下载）
- 找到 LED 和按键的引脚号
- 写 XDC 文件：
```
set_property PACKAGE_PIN R2 [get_ports btn_0]  # 举例
set_property IOSTANDARD LVCMOS33 [get_ports btn_0]
```

**第 7 步：生成 bitstream 并烧录**
1. 点 `Generate Bitstream`
2. 连接板子电源、USB-JTAG
3. 点 `Open Hardware Manager` → `Program Device`
4. 选择生成好的 bit 文件

**第 8 步：验证**
- 按按键，看对应的 LED 是否亮灭
- 如果没反应，检查：
  - 引脚号对不对（看原理图）
  - 按键按下是高电平还是低电平（原理图查）
  - 代码里极性写反了没

### 今天产出物
- [ ] Vivado 工程 `led_control` 文件夹
- [ ] 按键按下 → LED 亮
- [ ] 综合报告截图

---

## 🗓️ Day 2（08-25）：UART 串口控制 + 拨码开关模式

### 最终目标
- PC 串口发命令能控制 LED
- 拨码开关切换 4 种模式

### 一步一步怎么做

**第 1 步：找一个现成的 HLS UART 代码**
- 搜 "Vitis HLS UART example" 或 "HLS UART TX RX"
- 建议直接搜 GitHub：`hls_uart` 或 `axi_uart`
- 找到后复制到你的工程里

**第 2 步：理解 UART 代码**
- 不需要看懂每一行，只找三个关键点：
  - 接收函数在哪里（RX）
  - 发送函数在哪里（TX）
  - 波特率在哪设置的（一般是 115200）

**第 3 步：把 UART 集成到工程**
- 新建一个顶层模块，包含：
  - UART 接收 → 解析命令 → 控制 LED
  - 按键读取 → 控制 LED（保留 Day 1 功能）
- 命令格式（自己定，举例）：
  - `led 1 on` → LED1 亮
  - `led 1 off` → LED1 灭
  - `mode 0` → 切换到流水灯模式
  - `status` → 回传状态

**第 4 步：写 PC 端的 Python 串口工具**
- 用 Python 的 `pyserial` 库
- 10 行代码就够：

```python
import serial
ser = serial.Serial('COM3', 115200)  # 端口号自己查
while True:
    cmd = input('> ')
    ser.write(cmd.encode() + b'\n')
    print(ser.readline().decode())
```

**第 5 步：添加拨码开关 4 种模式**
- 读 2 位拨码开关（拨码 1 和 2）
- 4 种模式：
  - 00 → **流水灯**：LED 依次亮灭循环
  - 01 → **呼吸灯**：用 PWM 让 LED 渐亮渐灭
  - 10 → **二进制计数**：4 个 LED 显示 0-15 二进制
  - 11 → **全亮/全灭**：按键切换

**第 6 步：综合 + 烧录 + 测试**
- 重复 Day 1 的综合→导出→Vivado→烧录流程
- 测试：
  - [ ] 串口发命令控制 LED
  - [ ] 拨码切换 4 种模式
  - [ ] Python 工具能收发

### 今天产出物
- [ ] PC 串口能控制板子 LED
- [ ] 拨码开关切换 4 种模式
- [ ] Python 串口工具脚本

---

## 🗓️ Day 3（08-26）：系统整合 + 演示

### 最终目标
所有功能在一个工程里，稳定运行，能演示给别人看。

### 一步一步怎么做

**第 1 步：整合所有功能**
- 把 Day 1 和 Day 2 的代码合并到一个工程
- 确认没有冲突（比如按键和串口同时控制同一个 LED，谁的优先级高？）

**第 2 步：按键消抖（选做）**
- 按键按下瞬间会有抖动（几毫秒内电平跳变多次）
- 简单消抖：检测到按键变化后，等 10ms 再读一次
- HLS 实现：计数 500,000 个时钟周期（50MHz 时钟 × 10ms）

**第 3 步：写 README 文档**
```markdown
# FPGA 智能控制台

## 功能
- 按键控制 LED 亮灭
- 拨码切换 4 种模式
- 串口远程控制

## 使用方法
- 按键：按下对应 LED 亮，松开灭
- 拨码：00=流水灯 01=呼吸灯 10=计数 11=全亮
- 串口：发送 led 1 on / led 1 off / mode 0 / status

## 资源消耗
- LUT: xxx
- DSP: xxx
```

**第 4 步：拍演示视频**
- 手机拍 1 分钟
- 展示：按键控制 → 拨码切换模式 → 串口控制

**第 5 步：跑通全部演示 checklist**
- [ ] 开机默认状态是什么？
- [ ] 每个按键按下，对应 LED 亮灭
- [ ] 拨码切换 4 种模式，每种都正常
- [ ] 串口发命令控制 LED
- [ ] 串口发 status 收状态反馈

### 今天产出物
- [ ] 完整工程，所有功能正常
- [ ] 演示视频（1 分钟）
- [ ] README 文档

---

## 🔧 卡住了怎么办

| 卡住的地方 | 搜什么 |
|:----------|:-------|
| HLS 语法不会 | "Vitis HLS 按键输入 example" |
| 不知道引脚号 | "AX7035B 原理图 LED 引脚" |
| Vivado 不会用 | "Vivado 调用 HLS IP" |
| 烧录不会 | "Vivado bitstream 烧录" |
| UART 代码不会写 | "Vitis HLS UART code" |
| Python 串口不会 | "Python pyserial 简单用法" |
| 综合报错 | 复制错误信息到百度/Google |
| 烧录后没反应 | "AX7035B 按键原理图" 查电平 |

> [!tip] 核心原则
> 遇到问题 → 先搜 → 搜不到再问 → 不要自己死磕超过 30 分钟