# 第七章：量化链路与 FPGA 前置

## 两个主实验

### 实验一：Python 端 W8A8 量化包生成

步骤：

1. 加载真实 ckpt.pt。
2. 对 Linear（线性层）和 Embedding（嵌入层）权重进行 INT8 量化。
3. 保存 INT8 权重、weight scale（权重缩放因子）和激活量化配置。
4. 用 FP32 和 INT8 参考路径比较 PPL。
5. 运行动态 scale 校准。
6. 生成 Q30 硬件参数。

结果：

| 项目 | 结果 |
|---|---:|
| 量化模块数 | 27 |
| FP32 PPL | 4.333494 |
| INT8 PPL | 4.509458 |
| PPL 回退 | 4.0606% |
| 质量判断 | PASS，小于 10% |

### 实验二：FP32 与 Q30 INT8 Token 对齐

步骤：

1. 使用固定 scale 的 Python Q30 参考模型。
2. 保存各阶段 INT8 .bin 数据。
3. Python 重新读取并逐元素比较。
4. 统一使用贪心采样比较 20 个 Token。

结果：

- Python 自一致性：mismatch=0。
- 20 Token 对比：19/20 一致，匹配率 95%。
- 第 20 个位置出现空格和换行差异。
- 以上均为 Python 侧验证，不能说成 FPGA 板级验证通过。

## 量化核心公式

~~~text
q = round(x / scale)
x ≈ q × scale
~~~

- INT8 权重和激活值便于 FPGA 整数乘加。
- scale 保存整数与原浮点数之间的比例。
- Q30 用整数保存定点比例，减少 FPGA 浮点运算。
- LayerNorm（Layer Normalization，层归一化）等部分可能保留更高精度参数。

## 当前版本冲突

当前 Python Q30 参数：

~~~text
weights.bin SHA256 = 0f6b6b...
gelu_scale = 0.0852714851
~~~

Vivado/DDR 历史部署包：

~~~text
weights.bin SHA256 = 60ff6e...
gelu_scale = 0.0694037601
~~~

模型结构相同：6 层、6 头、384 特征、65 字符；但权重、scale 和 Q30 参数不同，不能混用。

## 下一步 FPGA 顺序

~~~text
锁定当前 checkpoint/INT8/scale 版本
  ↓
重新生成同版本 DDR 镜像
  ↓
学习 Vivado PL 数据流
  ↓
编译 Vitis PS（Processing System，处理系统）程序
  ↓
单 Token 板级验证
  ↓
20/200 Token 对比
~~~

板级比较应优先比较 Token ID，再比较 itos（integer-to-string，整数转字符串）后的字符；FPGA 通常使用确定性 argmax（argument maximum，最大值索引），不应直接用随机 Top-k 结果做严格对齐。

## 真实代码和工具

~~~text
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/01_VSCode_Python/01_quantize_int8.py
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/01_VSCode_Python/02_token_console.py
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/python/nanoGPT/tools/simulate_bittrue_dynamic_int8.py
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/python/nanoGPT/tools/export_bittrue_hardware_params.py
~~~
