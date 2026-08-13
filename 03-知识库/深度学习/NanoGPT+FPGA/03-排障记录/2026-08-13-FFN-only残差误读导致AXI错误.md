---
date: 2026-08-13
domain: 深度学习
course_or_project: NanoGPT+FPGA
status: 已解决
tags: [AXI, FFN, RTL, 状态机, 排障]
---

# FFN-only 残差误读导致 AXI 错误

## 故障现象

首次完整板级推理返回：

```text
mailbox state = 0xDEAD0000
return code   = -2
PL status     = 0x0000000D
AXI errors    = 0x00000900
```

## 环境与上下文

- Zynq-7020
- Vivado/Vitis 2026.1
- 当前 PS/PL 六层推理链
- PS 在 FFN-only 模式下负责残差相加

## 假设与证据链

| 假设 | 为什么相关 | 验证 | 结果 | 结论 |
|---|---|---|---|---|
| PS 邮箱错误 | PS 返回失败状态 | XSDB 绕过 PS 高层，直接写 PL 寄存器 | AXI 错误仍出现 | 排除单纯邮箱问题 |
| MMU 地址不可达 | 读 PL 寄存器曾出现 translation fault | 停核/复位后 `mrd -force` | 寄存器可读 | 属于调试上下文，不是主根因 |
| 每层每特征发生一次错误访问 | `0x900=2304=6×384` | 对照模型层数与特征维 | 完全吻合 | 锁定 FFN 每层输出路径 |
| FFN-only 仍读取残差 | 首次错误地址为 `0x0`，PS 在该模式把 debug/residual base 设 0 | 检查 RTL 状态跳转 | W2 后无条件进入 `ST_FFN_RES_REQ` | 根因确认 |

## 根因

`MODE_FFN_ONLY` 中 PL 只应输出 `FFN(x)`，残差由 PS 完成。但旧 RTL 在 W2 量化后无条件进入残差读取状态：

```verilog
state <= ST_FFN_RES_REQ;
```

即使最终不使用残差值，AXI 读取请求已经向地址 `0x00000000` 发出，每层 384 次，共 6 层，形成 `0x900` 次错误。

## 修复

```verilog
state <= mode_reg[6] ? ST_FFN_RES_REQ : ST_FFN_WRITE_ADDR;
```

- bit6 为 1：PL 内融合残差，允许读取残差。
- bit6 为 0：FFN-only，跳过残差读取，直接写输出。

同时在 `ST_FFN_RES_REQ` 内增加防御判断，并加入构建标记：

```text
0x40000094 = 0x46584632  // FXF2
```

## 修复验证

重新综合、实现和生成 Bitstream 后，读取到 FXF2 标记。真实板级 `ROMEO:` 单 Token 推理结果：返回码 0、Token ID 0、PL 完成、AXI 错误 0。

## 预防与关联知识

- 模式位不仅控制最终数据选择，也必须控制前置 AXI 请求是否产生。
- 错误计数 `6×384` 将外部现象直接连接到模型结构，是高价值定位证据。
- Bitstream 加固定构建标记，避免“代码已修但板上仍运行旧构建”。
- 排障时先隔离 PS 与 PL，再缩小到状态机和地址路径，避免盲目修改量化参数。

## 来源

- `05-来源/原始资料/15_Vivado至FPGA单Token板级实验记录_2026-08-09.md`
