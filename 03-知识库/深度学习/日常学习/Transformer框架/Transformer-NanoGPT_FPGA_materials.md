**Transformer 权威学习资料**

以 Decoder-only GPT 为主线，结合 NanoGPT Zynq FPGA 项目

|                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 资料定位：本文以原始 Transformer 论文、Hugging Face 官方课程、PyTorch 官方文档及 Karpathy 的 nanoGPT 源码为基础整理。所有外部内容均为中文解释与概括；本地项目相关内容来自 D:/FPGA/NanoGPT/nanogpt-zynq-backups-main。 |

# **1. 总览：Transformer 是什么**

Transformer 是一种处理序列的神经网络架构。序列可以是文字、图像块、语音片段或 DNA；它的核心能力是让序列中的每个位置，根据当前任务动态参考其他位置的信息。2017 年论文《Attention Is All You Need》首先提出了用 Attention 作为主要计算机制的 Transformer。

对语言模型来说，它要做的不是“理解一句话后给一个标签”，而是持续预测下一个 token。例如输入 “hel”，模型输出词表中每个候选 token 的分数；若 o 的分数最高，就得到 “helo” 的下一个位置。生成的 o 会再回到输入，继续预测下一步。

|                                                                |
| -------------------------------------------------------------- |
| 一句话：Transformer 用 Attention 决定“当前应该从上下文的哪里取信息”，再用前馈网络把信息进一步加工。 |

|                                 |                                        |              |                          |
| ------------------------------- | -------------------------------------- | ------------ | ------------------------ |
| **架构**                          | **输入可见范围**                             | **典型用途**     | **与本项目关系**               |
| Encoder-only（BERT 类）            | 通常可双向看完整输入                             | 分类、检索、表征     | 不是本项目使用的形式               |
| Encoder-Decoder（原始 Transformer） | Encoder 看源句；Decoder 看已生成部分和 Encoder 输出 | 机器翻译、摘要      | 用于理解完整 Transformer 的历史来源 |
| Decoder-only（GPT 类）             | 每个位置只能看左侧与自己                           | 文本续写、对话、代码生成 | NanoGPT 和本项目实际采用的形式      |

## **为什么 NanoGPT 是 Decoder-only**

GPT 的目标是按顺序预测下一个 token。若当前位置能看见右边未来 token，训练时会“偷看答案”，部署生成时又看不到未来，训练与推理就不一致。因此 GPT 使用因果遮罩（causal mask）：第 i 个位置只允许关注 0 到 i 的位置。

本地 `python/nanoGPT/model.py` 的类名就是 `CausalSelfAttention`。其中 `is\_causal=True` 或下三角 mask 表示这种规则。它不是额外可选功能，而是 GPT 能逐 token 生成的根本条件。

本节来源：Attention Is All You Need；Hugging Face Course “How do Transformers work?”；本地 `python/nanoGPT/model.py`。

# **2. 从字符到向量：模型的输入**

## **2.1 Token 与字符级词表**

自然语言字符串不能直接送进矩阵乘。第一步是 tokenizer：把字符串变成整数序列。现代大模型常用 BPE，把常见字词片段编码成一个 token；而 NanoGPT Shakespeare 示例与本项目为了简单和可验证性采用字符级词表，一个字符通常就是一个 token。

“编号”本身没有语义。例如 ASCII 97 和 98 的距离为 1，不代表 a 与 b 的语义距离比 a 与 z 更近。token ID 只是查表地址，真正可学习的表示来自 Embedding。

## **2.2 Token Embedding 与位置 Embedding**

设词表大小为 V、隐藏维度为 C。Token Embedding 是一个 V×C 的表 E。token ID 为 t 时，模型取 E 的第 t 行，得到长度为 C 的向量。位置 Embedding 同理：位置 p 取位置表 P 的第 p 行。GPT 的输入向量为 x₀ = E[token] + P[position]。

为什么要加位置？Attention 本身只看向量集合；若没有位置，交换两个相同集合中的 token，模型缺少直接的顺序信号。位置 Embedding 把“第几个 token”写入每个向量。原始论文使用正弦/余弦位置编码；GPT-2/nanoGPT 使用可学习的位置 Embedding。

|  |  |  |
| --- | --- | --- |
| **对象** | **形状示意** | **含义** |
| 输入 token IDs | [B, T] | B 是批大小，T 是序列长度；元素是整数编号 |
| token Embedding 后 | [B, T, C] | 每个 token 变成 C 维向量 |
| 位置 Embedding | [T, C] | 每个位置一个 C 维向量，可广播到 batch |
| 相加后 x | [B, T, C] | 送入第一个 Transformer Block 的输入 |

## **2.3 本项目对应**

在本地 `model.py` 中，`wte = nn.Embedding(vocab\_size, n\_embd)` 是 token Embedding，`wpe = nn.Embedding(block\_size, n\_embd)` 是位置 Embedding；forward 中的 `tok\_emb + pos\_emb` 正好对应上式。

在 `ps/src/main.c` 中，`VOCAB\_SIZE=65`、`D\_MODEL=384`、`BLOCK\_SIZE=256` 描述了项目模型的关键尺寸；`TOK\_EMB\_I8\_BASE` 与 `POS\_EMB\_I8\_BASE` 是量化 Embedding 数据在 DDR 中的基地址。软件/硬件不是重新训练 Embedding，而是在推理时从 DDR 读取已训练并量化的表。

|  |
| --- |
| 项目连接：Embedding 是“查表 + 相加”，但表很大，适合放 DDR；输出的向量会进入 PL，成为后续 LayerNorm、Q/K/V 和 FFN 的输入。 |

本节来源：The Illustrated Transformer；Karpathy nanoGPT `model.py`；本地 `ps/src/main.c`。

# **3. Attention 核心：Q、K、V 到输出**

## **3.1 三组投影从哪里来**

输入 X 的形状为 [B,T,C]。Attention 不是直接用 X 比较，而是用三组可学习权重投影：Q=XWQ，K=XWK，V=XWV。WQ、WK、WV 都是 C×C（多头实现中可理解为先合并、再切分）的矩阵。三者来自同一个 X，却服务于不同任务。

|  |  |  |
| --- | --- | --- |
| **符号** | **直觉解释** | **实际作用** |
| Q（Query） | 当前 token 想找什么 | 与所有 K 比较，提出检索需求 |
| K（Key） | 每个 token 可被怎样匹配 | 给其他 token 提供可检索标签 |
| V（Value） | 每个 token 真正携带的内容 | 按注意力权重加权汇总，成为输出 |

## **3.2 缩放点积 Attention 的完整计算**

第一步计算分数 S=QKᵀ/√dₖ。QKᵀ 会让每个 query 与每个 key 做点积，得到 [B,头数,T,T] 的分数矩阵。除以 √dₖ 是为了避免维度较大时点积数值过大，使 softmax 过于尖锐、训练不稳定。

第二步对每一行做 softmax：A=softmax(S)。A 的每一行都非负且和为 1，可理解为当前 token 对所有可见位置的关注比例。

第三步计算 O=AV：每个位置按 A 的比例混合不同位置的 V，形成新的上下文相关向量。

|  |
| --- |
| 公式：Attention(Q,K,V)=softmax(QKᵀ/√dₖ + mask) V。mask 把不允许看的位置变成极小值，softmax 后它们的权重接近 0。 |

## **3.3 一个可手算的例子**

假设当前 query 对两个历史 key 的缩放后分数是 [2, 0]。softmax 约为 [0.88, 0.12]。若 V₁=[1,0]、V₂=[0,1]，输出就是 0.88×V₁+0.12×V₂=[0.88,0.12]。Attention 不是硬选一个位置，而是按比例混合；权重大的位置影响更大。

若第二个位置在未来，因果 mask 会把它屏蔽，权重变成 [1,0]。这就是 GPT 在训练时一次并行处理完整序列、在逻辑上仍保持“只能看左边”的方法。

## **3.4 多头注意力**

多头注意力把 C 维特征拆成 h 个头，每头维度 dₖ=C/h。每个头独立计算 Attention，随后把输出拼接并经过输出投影 WO。不同头可以学习不同关系：一个头偏重相邻字符，一个头可能偏重标点或较远的重复模式。

在 nanoGPT 中，`c\_attn` 一次线性层产生 3C 个数，再切成 q、k、v；代码随后 reshape 为多头并转置。这种“合并 QKV 投影”的写法对 GPU 和硬件都更友好，因为它减少了独立访存和层调用。

## **3.5 本项目对应：QKT8、K/V Cache**

本项目的 Q/K/V Projection 是 INT8 矩阵乘。QKT8 指 Q·Kᵀ 的点积阶段每轮处理 8 个 INT8 乘积，是提高吞吐量的硬件并行度设计；它改变的是计算组织方式，不改变 Attention 的数学意义。

历史 K、V 存在 DDR 的 K/V Cache 区域。生成新 token 时，不必重算历史 token 的 K、V，只计算新 token 的 Q/K/V，再让新 Q 与缓存 K 比较、按权重读取缓存 V。这是自回归推理的关键优化。

本节来源：Attention Is All You Need；PyTorch `scaled\_dot\_product\_attention` 文档；Karpathy nanoGPT `CausalSelfAttention`；本地 HLS/RTL 与 `ps/src/main.c`。

# **4. 一个 GPT Block：Attention 之外还有什么**

## **4.1 Pre-LayerNorm 与残差连接**

nanoGPT 的每个 Block 采用 Pre-LN 结构：先做 LayerNorm，再进入 Attention 或 MLP，最后加回残差。代码可写成 x = x + Attention(LN1(x))，再写成 x = x + MLP(LN2(x))。

LayerNorm 对每个 token 的 C 个特征求均值 μ 和方差 σ²，再计算 y=γ·(x-μ)/√(σ²+ε)+β。γ、β 是可学习参数。它让不同层的数值范围更稳定；在硬件中需要处理均值、方差、倒数平方根近似、缩放与饱和。

残差连接 x+f(x) 的意义是保留信息直通路径。模块只需要学习“该在已有表示上补充什么”，深层堆叠时梯度和特征更容易传递。

## **4.2 FFN 与 GELU**

Attention 负责 token 与 token 之间的信息交换；FFN（也常叫 MLP）对每个 token 位置独立地加工特征。典型 GPT-2 形式为 C→4C→C：先线性扩维、经过 GELU 非线性、再线性压回。

GELU 让网络不只是线性矩阵相乘的叠加。完整 GELU 需要误差函数，部署时常使用查表或近似公式；本项目存在独立的 `gelu\_embed\_kernel`，正是把这类操作放入可综合硬件的入口。

## **4.3 LM Head、logits 与 argmax**

经过 N 个 Block 和最终 LayerNorm 后，隐藏状态通过 LM Head 从 C 维投影到 V 维，得到每个词表 token 的 logits。训练时 logits 与真实下一个 token 算交叉熵损失；推理时可取 argmax，也可按 softmax 概率采样。

本项目为了可重复验证，重点使用 argmax：同样的输入、权重、定点规则应得到同样的最高分 token。PS 会把该 token 映射回字符，经 UART 输出。

|                  |               |                                       |
| ---------------- | ------------- | ------------------------------------- |
| **GPT Block 步骤** | **Python 对应** | **硬件对应**                              |
| LayerNorm 1      | ln\_1         | layernorm\_kernel / 定点 LayerNorm 路径   |
| QKV、Attention、投影 | attn          | Q/K/V Projection、QKT、Projection       |
| Residual 1       | x + ...       | 定点加法与饱和裁剪                             |
| LayerNorm 2      | ln\_2         | LayerNorm 路径                          |
| FFN + GELU       | mlp           | tiled\_matmul、gelu\_embed\_kernel、FFN |
| Residual 2       | x + ...       | 定点加法与中间缓冲                             |

本节来源：Karpathy nanoGPT `Block`、`MLP`、`GPT` 类；Hugging Face GPT-2 实现；本地 `hls/source`。

# **5. 从 Python GPT 到 Zynq FPGA 推理**

## **5.1 软件参考与定点部署不是两套算法**

Python nanoGPT 是模型语义的参考：它清楚定义了层顺序、权重含义和输出。FPGA 部署并不是另发明一套模型，而是把相同计算改写为定点格式、分块矩阵乘、状态机和数据搬运。正确性要求是：在规定的量化语义下，两者逐层或逐 token 一致。

W8A8 INT8 表示权重和激活主要使用 8 位整数。真实数 x 通常近似为 x≈scale×integer；乘法后位宽会增长，必须按约定做缩放、移位、舍入和饱和裁剪。Q30 是用 30 个小数位表达比例系数的一种定点约定，便于 Python 与硬件严格对齐。

|  |
| --- |
| 最常见的硬件误差不是“乘法器坏了”，而是 scale、符号扩展、右移、舍入或饱和规则与参考模型不一致。 |

## **5.2 PS、PL、DDR、AXI 的职责**

|  |  |  |
| --- | --- | --- |
| **部分** | **像什么** | **项目中的工作** |
| PS / ARM | 调度员 | 接收串口 prompt，字符转 token，配置地址与寄存器，启动 PL，等待结果，输出字符。 |
| PL / FPGA | 并行计算工厂 | 执行 INT8 LayerNorm、矩阵乘、Attention、FFN、LM Head 等密集计算。 |
| DDR | 大仓库 | 存权重、scale、Embedding、K/V Cache、输入输出与 golden 数据。 |
| AXI | 芯片内运输通道 | 让 PS 配置 PL，并让 PL/DMA 访问 DDR。 |

Zynq 将 ARM 处理系统（PS）和 FPGA 可编程逻辑（PL）放在同一芯片中。PS 的 C 程序通过内存映射寄存器控制 PL；PL 侧以更高并行度处理矩阵运算。两者合作而不是互相替代。

## **5.3 一次生成一个字符的真实数据流**

1. PS 从 UART 或上位机收到 prompt，把字符转换成 token IDs，并放入输入缓冲。
2. PS 设置 PL 控制寄存器与 DDR 基地址，例如权重、scale、K/V Cache、输入和输出地址。
3. PL 按层执行：Embedding/位置编码、Block 0 到 Block 5、最终 LayerNorm、LM Head。
4. PL 将 logits 或 argmax 结果写入约定位置；PS 轮询状态寄存器确认完成。
5. PS 读取最高分 token，将其转为字符输出，并把它追加到上下文。
6. 下一轮生成时，PL 读取此前保留的 K/V Cache，只增加新 token 的计算。

## **5.4 怎样读项目报告中的指标**

|  |  |  |
| --- | --- | --- |
| **指标** | **含义** | **本项目中应怎样理解** |
| mismatch=0 | 与参考结果不一致的数量为零 | 说明板端与 Python Q30 在该验证范围内对齐。 |
| WNS/TNS | 建立时间裕量/总违例 | WNS 为正、TNS 为零，表示给定时钟约束下时序通过。 |
| LUT/FF/BRAM/DSP | FPGA 的逻辑、寄存器、片上 RAM、乘法资源 | 决定还能否提高并行度；BRAM 和 DSP 往往是重要约束。 |
| ms/token | 生成一个 token 的端到端耗时 | 字符级模型中大致就是每个字符的生成间隔。 |

本项目 README 给出 100 MHz、六层 hidden 校验和 200 token 板端/Python 对齐等记录。这些结果说明工程关注的不只是“看起来能生成文字”，还包括数值一致性、时序和资源可实现性。

本节来源：本地 README、PERFORMANCE\_RESOURCES.md、NanoGPT\_PS+PL\_重要参数汇总.md、`ps/src/main.c`、HLS 源码与验证资料。

# **6. 常见误解与必须说清的话**

|  |  |
| --- | --- |
| **误解** | **正确理解** |
| “权重放 DDR 等于模型部署在 DDR。” | DDR 存数据；计算电路由 bitstream 配置在 PL；PS 运行控制软件。 |
| “Attention 就是挑一个最相关 token。” | 通常是对多个 V 的加权组合，权重来自 QK 匹配后的 softmax。 |
| “K/V Cache 保存整层最终输出。” | 它保存 Attention 所需的历史 K 和 V，目的是避免重复计算历史。 |
| “INT8 只是把浮点截断成整数。” | 还需要 scale、量化/反量化、位宽增长、移位、舍入和饱和规则。 |
| “CNN 与 Transformer 完全无关。” | 两者都大量使用乘加与特征变换；主要区别是 CNN 固定局部窗口，Attention 动态全局关联。 |

# **7. 知识自测**

**1.** 为什么 GPT 需要因果遮罩？

|  |
| --- |
| 答案：防止训练时看到未来 token，保证训练和逐 token 推理的可见信息一致。 |

**2.** Q、K、V 分别做什么？

|  |
| --- |
| 答案：Q 提出需求，K 用于匹配，V 是按权重被汇总的内容。 |

**3.** Attention 中 √dₖ 的作用是什么？

|  |
| --- |
| 答案：缩放点积，避免维度大时分数过大、softmax 过于尖锐。 |

**4.** 为什么要有位置 Embedding？

|  |
| --- |
| 答案：Attention 不天然携带顺序；位置 Embedding 告诉模型 token 的位置。 |

**5.** 残差连接的计算形式是什么？

|  |
| --- |
| 答案：x+f(x)，让原始信息和梯度有直通路径。 |

**6.** K/V Cache 为什么能加速生成？

|  |
| --- |
| 答案：历史 token 的 K/V 已经计算过，新 token 无需重新计算它们。 |

**7.** PS 与 PL 如何分工？

|  |
| --- |
| 答案：PS 做控制、token 和通信；PL 做大规模并行定点计算。 |

**8.** 为什么要验证 mismatch=0？

|  |
| --- |
| 答案：证明硬件在规定定点语义下与参考实现逐项对齐，而不只是输出看起来相似。 |

# **8. 术语表**

|  |  |
| --- | --- |
| **术语** | **简明定义** |
| Token | 模型处理的离散单位；本项目主要是字符。 |
| Embedding | 把 token ID 映射为可学习向量的查找表。 |
| Hidden state | Transformer 层之间流动的 C 维特征向量。 |
| Logits | 词表中每个 token 的原始分数。 |
| Softmax | 把一组分数变成非负且和为 1 的权重。 |
| Causal mask | 遮住未来位置的规则。 |
| KV Cache | 保存历史 key/value 的推理缓存。 |
| Quantization | 用有限位宽数值近似浮点数。 |
| AXI | PS、PL、DDR 之间常用的片上互连协议。 |

# **9. 权威资料与源码入口**

以下资料是本文的外部参考入口。建议阅读顺序：先看图解教程建立直觉，再看 nanoGPT 源码把概念落到代码，最后回看论文中的公式和结构。

* Vaswani 等，《Attention Is All You Need》：https://arxiv.org/abs/1706.03762
* Jay Alammar，《The Illustrated Transformer》：https://jalammar.github.io/illustrated-transformer/
* Hugging Face Course，How do Transformers work?：https://huggingface.co/docs/course/chapter1/4
* PyTorch，scaled\_dot\_product\_attention：https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled\_dot\_product\_attention.html
* Karpathy，nanoGPT 源码：https://github.com/karpathy/nanoGPT
* Karpathy，Neural Networks: Zero to Hero：https://github.com/karpathy/nn-zero-to-hero
* Hugging Face，GPT-2 实现：https://github.com/huggingface/transformers/blob/main/src/transformers/models/gpt2/modeling\_gpt2.py

本地工程优先入口：`D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/README.md`、`python/nanoGPT/model.py`、`hls/README.md`、`ps/src/main.c`、`NanoGPT\_PS+PL\_重要参数汇总.md`。

# **附录：学习过程中的初学者问答**

本附录根据学习本资料时提出的问题补充。目标是把术语翻译成人能直接理解的话，而不是增加新的复杂公式。

## **Tokenizer 是什么？**

Tokenizer 是文字和模型数字之间的翻译器。它把字符串变成 token 编号，也把模型输出的 token 编号还原成文字。本项目是字符级 tokenizer，例如 hello 会拆成 h、e、l、l、o，再分别查出编号。

## **BPE 是什么？**

BPE 是常见的分词方法。它会把经常一起出现的字符合并成一个 token，例如 hello 可能成为一个 token 或被切成 he 与 llo。真实 GPT-2 常用 BPE；本项目为降低复杂度，基本是一个字符一个 token。

## **Token Embedding 与 Position Embedding 是什么？**

Token Embedding 表示“这是什么字符”：每个 token 编号查一张表，得到一串特征数字。Position Embedding 表示“它在第几个位置”：位置 0、1、2 也各有一串数字。两者相加后，模型看到的是“这个字符，并且它位于这个位置”。

## **[B,T,C] 表格是什么意思？**

B 是一次同时处理多少句话，叫批大小；T 是每句话有多少个 token；C 是每个 token 用多少个数字表示，叫特征维度。本项目中 C=384。输入编号是 [B,T]；查 Token Embedding 后是 [B,T,C]；位置 Embedding 是 [T,C]；相加后仍是 [B,T,C]。

## **LayerNorm 是什么？**

LayerNorm 是层归一化，不是残差。它把一个 token 的一整组特征数字整理到较稳定的范围：先算平均值和波动大小，再缩放和调整。这样 Attention 与 FFN 不容易因为数值忽大忽小而不稳定。

## **Q=XWQ、K=XWK、V=XWV 是什么？**

同一份输入 X 分别乘三套不同权重 WQ、WK、WV，变成 Q、K、V。Q 表示当前想找什么，K 表示每个位置可被怎样匹配，V 是每个位置真正提供的内容。这里的乘号是矩阵乘法。

## **多头注意力是什么？**

多头注意力是让多个小 Attention 同时从不同角度看同一段文本。每个头各自计算 Q、K、V 和 Attention，最后把结果拼接起来。不同头可能分别擅长关注相邻字符、较远字符或标点等关系。

## **Q/K/V Projection 是什么？**

Projection 就是投影或变换。Q/K/V Projection 指把输入向量 X 分别做三次矩阵乘法，生成 Q、K、V。在本项目中，PL 读取 WQ、WK、WV 的 INT8 权重并完成这些矩阵乘法。

## **GPT 与 ChatGPT、Block 是什么关系？**

GPT 是生成式预训练 Transformer 的模型家族；ChatGPT 是建立在 GPT 类模型之上的聊天产品。Block 是 GPT 内重复堆叠的一层积木。本项目有 6 个 GPT Block，每个 Block 含 Attention、FFN 和两次残差连接。

## **MLP、FFN、GELU 是什么？**

MLP 是多层感知机，GPT 中也常称 FFN。它先把 384 维特征扩展到更高维度，再经过 GELU，最后压回 384 维。GELU 是平滑激活函数：大的正数大多保留，负数大多压小，让网络能够学习非线性关系。

## **Residual 是什么？**

Residual 是残差连接。计算形式是输出=原输入+模块计算结果。例如 x 经过 Attention 得到 f(x)，输出是 x+f(x)。它像在原稿上增加修改，而不是把原稿全部重写。

## **Hidden State 是什么？**

Hidden State 是模型内部的中间表示。人看它是一串数字，但模型用它保存“到目前为止从上下文理解到什么”。本项目每个 token 的 Hidden State 是 384 维，经过 6 个 Block 后送入 LM Head。

## **LM Head、C、V、Logits、Argmax 是什么？**

最终 Hidden State 的维度 C=384。LM Head 是最后一层矩阵乘法，把 384 个特征变成 V=65 个字符分数。每个分数叫 logit。Argmax 选择最高分所在的字符编号，再由 PS 还原成字符输出。

## **INT8 与 W8A8 是什么？**

INT8 是 8 位有符号整数，范围为 -128 到 127。W8A8 表示权重和激活值都主要用 INT8 保存和计算。真实数通过 scale 与整数对应，这能节省 DDR 带宽、存储和 FPGA 计算资源。

## **mismatch=0 只在训练时有用吗？**

不是。mismatch=0 主要用于部署后的验证。它把 Python Q30 参考结果与 FPGA 板端结果逐项比较；不一致的数量为 0，说明量化、移位、饱和等硬件计算语义与参考一致。

## **一次生成一个字符的完整流程**

1. 1. 输入文字 hello。
2. 2. PS/ARM（处理系统）把字符转成 Token（编号）。
3. 3. DDR（外部内存）读取 Token Embedding（字符特征向量）和 Position Embedding（位置特征向量）。
4. 4. 两类 Embedding 相加，得到初始 Hidden State（隐藏状态）。
5. 5. 数据进入 GPT Block（GPT 模块），本项目共 6 层。每层依次经过 LayerNorm（层归一化）、Q/K/V Projection（Q/K/V 投影）、Attention（注意力计算）、Residual（残差连接）、LayerNorm（层归一化）、FFN/MLP（前馈神经网络）、GELU（激活函数）、Residual（残差连接）。
6. 6. 经过 Final LayerNorm（最终层归一化）后，LM Head（语言模型输出层）将 384 个特征变成 65 个 Logits（原始分数）。
7. 7. Argmax（取最高分）得到下一个 Token。PS/ARM 将它还原为字符并输出。
8. 8. 新字符加入输入。K/V Cache（K/V 缓存）保留历史 K、V，随后重复下一次生成。