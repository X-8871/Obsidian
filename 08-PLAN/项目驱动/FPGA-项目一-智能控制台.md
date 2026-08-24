---
type: project
status: active
level: project
name: FPGA 智能控制台
duration: 3 天
board: AX7035B
requirement: 仅板载资源（LED×4 + 按键×4 + 拨码×4 + UART）
created: 2026-08-18
parent: [[08-PLAN/2026/08-八月/2026-W34/2026-W34-周计划|2026 W34 周计划]]
---

# 🏗️ 项目一：FPGA 智能控制台（3 天）

> 目标：做一个 PC 通过串口控制 + 板子按键/拨码控制的 LED 系统
> 原则：边做边学，不做先学，卡住再查资料

---

## 📦 最终产出

一个能演示的完整系统：
- 板子上的 4 个按键 → 控制 4 个 LED 独立亮灭
- 4 个拨码开关 → 切换 4 种 LED 模式（流水灯、呼吸灯、二进制计数、全亮全灭）
- PC 串口发送命令 → 控制 LED（如 `led 1 on`、`mode 2`）
- PC 串口接收状态反馈 → 显示当前模式和 LED 状态

---

## 🗓️ Day 1：按键控制 LED + HLS 入门

**今天不做任何学习，直接写代码，边写边搜**

### 任务

1. **新建 Vivado HLS 工程**，取名 `led_control`
   - 不会就搜"Vivado HLS 新建工程"
   - 目标器件选 AX7035B 的 Artix-7 XC7A35T

2. **写第一个 HLS 模块**：`按键输入 → LED 输出`
   ```c
   // 不用管语法，直接写大概逻辑：
   // 读 4 位按键输入（按键按下=0 还是 1 先去查板子原理图）
   // 按键按下 → 对应 LED 亮
   // 按键松开 → 对应 LED 灭
   ```
   - 写完后点 **C Synthesis**，看综合报告
   - 重点关注：Latency、DSP 消耗、LUT 消耗

3. **把 HLS 模块导出为 IP**（Export RTL）
   - 搜"Vitis HLS export IP"

4. **在 Vivado 中新建工程**，调用这个 IP
   - 把 IP 的输入输出绑定到板子的物理引脚
   - 打开 AX7035B 的原理图 PDF，找到 LED 和按键的引脚号
   - 写 XDC 约束文件

5. **生成 bitstream，烧录到板子**
   - 按按键，看 LED 有没有反应

### 遇到问题怎么办

| 卡住的地方 | 搜什么 |
|:----------|:-------|
| HLS 语法不会 | "Vitis HLS 按键输入 example" |
| 不知道引脚号 | "AX7035B 原理图 LED 引脚" |
| Vivado 不会用 | "Vivado 调用 HLS IP" |
| 烧录不会 | "Vivado bitstream 烧录" |

### 今天产出物

- [ ] Vivado 工程 `led_control` 文件夹
- [ ] 按键按下 → LED 亮
- [ ] 拍一张 LED 亮的照片

---

## 🗓️ Day 2：UART 串口通信 + 拨码开关模式切换

**不学 UART 协议，直接抄一个 HLS UART 模块改**

### 任务

1. **搜"Vitis HLS UART example"**，找到一个能用的 HLS UART 代码
   - 不要自己写，找一个改
   - 重点：能接收 PC 发的字节，能发送字节回 PC

2. **把 UART 模块集成到昨天的工程里**
   - PC 串口发送 `led 1 on` → 板子解析 → LED1 亮
   - PC 串口发送 `led 1 off` → LED1 灭
   - PC 串口发送 `status` → 板子回传当前 LED 状态

3. **PC 端工具**：用 Python 写一个串口助手
   ```python
   # 不用写复杂，用 pyserial 库，10 行代码搞定
   # 或者直接搜"Python 串口助手 代码"抄一个
   ```

4. **加入拨码开关模式切换**
   - 拨码 00 → 流水灯
   - 拨码 01 → 呼吸灯（PWM 调亮度）
   - 拨码 10 → 4 位二进制计数
   - 拨码 11 → 全亮/全灭

### 今天产出物

- [ ] PC 串口能控制板子 LED
- [ ] 拨码开关切换 4 种模式
- [ ] Python 串口工具脚本

---

## 🗓️ Day 3：系统整合 + 优化 + 演示

### 任务

1. **把所有功能整合到一个 bitstream 里**
   - 按键控制 + 拨码模式 + 串口控制，全部在一个工程里

2. **优化**（选做，有余力再做）
   - 添加消抖处理（按键按下去会有抖动）
   - 添加串口命令缓存（长命令不丢数据）

3. **写一个简单的 README**
   - 项目做什么
   - 怎么用（按键/拨码/串口各怎么操作）
   - 拍了演示视频/照片

4. **演示 checklist**
   - [ ] 开机默认状态是什么
   - [ ] 每个按键按下，对应 LED 亮灭
   - [ ] 拨码切换 4 种模式
   - [ ] 串口发命令控制
   - [ ] 串口收状态反馈

### 今天产出物

- [ ] 完整工程，所有功能正常
- [ ] 演示视频（手机拍，1 分钟）
- [ ] README 文档

---

## 📐 技术提示（卡了再看，别提前看）

<details>
<summary>HLS 按键控制代码模板（卡了再点开）</summary>

```c
#include "hls_stream.h"

void led_control(
    bool btn[4],
    bool led[4]
) {
    #pragma HLS INTERFACE ap_none port=led
    #pragma HLS INTERFACE ap_none port=btn
    #pragma HLS INTERFACE ap_ctrl_none port=return
    
    for(int i = 0; i < 4; i++) {
        #pragma HLS UNROLL
        led[i] = !btn[i];  // 假设按键按下=0
    }
}
```
</details>

<details>
<summary>UART 波特率计算（卡了再点开）</summary>
AX7035B 板载 50MHz 时钟。
115200 波特率 = 50,000,000 / 115200 ≈ 434 个时钟周期采一次。
</details>