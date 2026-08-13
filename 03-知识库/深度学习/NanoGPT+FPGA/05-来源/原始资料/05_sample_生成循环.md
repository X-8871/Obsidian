# 第五章：sample.py 生成循环

## 生成数据流

~~~text
Prompt 字符
  ↓ stoi
Token ID 序列
  ↓ 模型前向
logits=(B,T,V)
  ↓ logits[:, -1, :]
最后位置分数=(B,V)
  ↓ temperature / Top-k / 采样
下一个 Token ID
  ↓ 拼接回序列
重复生成
  ↓ itos
字符文本
~~~

## 关键点

- 推理时只关心最后一个位置，因为它代表“根据当前全部上下文预测下一个字符”。
- logits[:, -1, :] 会去掉时间维，形状是 (B,V)。
- logits[:, [-1], :] 保留时间维，形状是 (B,1,V)。
- temperature（温度）改变概率分布的随机程度。
- Top-k 只保留分数最高的 k 个候选字符。
- greedy argmax（贪心取最大分数）每次直接选最高分字符，不使用随机数。
- 随机采样适合文本生成，但不适合直接做硬件逐次对齐。

## 本项目对比实验

统一使用贪心采样比较 20 个 Token 时：

- 一致：19 个。
- 不一致：1 个。
- 匹配率：95%。
- 第 20 个位置出现空格和换行的差异。

实验记录结束后，02_token_console.py 已恢复原来的温度、Top-k、重复惩罚和随机采样模式。

## 真实代码

~~~text
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/python/nanoGPT/sample.py
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/01_VSCode_Python/02_token_console.py
~~~
