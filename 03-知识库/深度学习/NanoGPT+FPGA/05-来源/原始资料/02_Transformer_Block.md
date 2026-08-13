# 第二章：单个 Transformer Block

## 数据流

```text
x
 ↓ ln_1
Attention
 ↓ 加残差
x + Attention(x)
 ↓ ln_2
MLP
 ↓ 加残差
输出
```

本项目使用 Pre-LN（Pre-Layer Normalization，前置层归一化）结构。Attention 和 MLP 内部会改变特征数值，但输入输出形状都保持 `(B,T,C)`。

## 两个核心功能

- Attention：融合不同位置的信息，让当前位置参考前面的字符。
- MLP（Multi-Layer Perceptron，多层感知机）：只处理单个位置，把该位置的特征进行更深的非线性变换。

## 残差连接

残差像“保留原稿并叠加修改稿”，使原始信息可以跨过子模块继续传播，也有利于梯度传播。

## 实验结果

使用 batch_size=2、block_size=4、n_embd=384 运行后，每个 Block 打印：

```text
in=(2,4,384)
ln1=(2,4,384)
attn=(2,4,384)
res1=(2,4,384)
ln2=(2,4,384)
mlp=(2,4,384)
out=(2,4,384)
res1_changed=True
res2_changed=True
```

结论：形状没有变化，但数值在 Attention 和 MLP 后发生了变化。

