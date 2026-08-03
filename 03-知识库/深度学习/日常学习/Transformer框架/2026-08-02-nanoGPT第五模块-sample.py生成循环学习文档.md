# nanoGPT 第五模块：sample.py 生成循环

> 学习主题：从提示词到生成文本
>
> 项目范围：只分析本项目真实代码，不引入论文、视频或外部实现。
>
> 代码路径：D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT

## 0. 本模块要解决的问题

训练完成后，模型如何把一段文字继续写下去？核心过程只有一句话：

> 把当前已有的字符编号送进模型，得到下一个字符的概率分布，采样出一个字符，再把它接回输入，循环执行。

本模块学习完成后，应能回答并验证：

1. sample.py 和 train.py 的职责有什么不同？
2. 为什么生成一个字符后，输入序列长度会增加 1？
3. 为什么推理时 logits 是 (B, 1, V)，而不是 (B, T, V)？
4. temperature 和 top_k 怎样改变生成结果？
5. 为什么生成时使用 model.eval() 和 torch.no_grad()？

## 1. 先看全局数据流

~~~mermaid
flowchart LR
    A["提示词字符串 start"] --> B["编码器 encode"]
    B --> C["字符编号 start_ids"]
    C --> D["增加批次维度 x: B×T"]
    E["ckpt.pt 模型检查点"] --> F["恢复 GPT 参数"]
    D --> G["model.generate"]
    F --> G
    G --> H["logits: B×1×V"]
    H --> I["取最后位置: B×V"]
    I --> J["温度缩放"]
    J --> K["Top-K 筛选"]
    K --> L["Softmax 概率"]
    L --> M["随机采样一个编号"]
    M --> N["拼接回 idx"]
    N --> G
    N --> O["decode 解码"]
    O --> P["生成文本"]
~~~

符号说明：

| 符号 | 含义 |
|---|---|
| B | Batch，批次大小；一次并行生成多少条序列 |
| T | Time，序列长度；当前已经有多少个字符位置 |
| C | Channel/Embedding dimension，特征维度；项目中为 n_embd=384 |
| V | Vocabulary size，词表大小；字符模型中通常为 65 |
| H | Head，注意力头数量；项目中为 n_head=6 |
| logits | 模型输出的未归一化分数 |
| checkpoint | 检查点；保存模型参数和配置的文件 |

本模块中最重要的形状变化是：

~~~text
提示词:       字符串
编码后:       (T,)                  例如 [19, 20, ...]
加批次维度:   (1, T)
模型输入:     (B, T)
模型输出:     (B, 1, V)
取最后位置:   (B, V)
采样编号:     (B, 1)
拼接后:       (B, T+1)
~~~

## 2. sample.py 的职责

真实文件：sample.py

sample.py 是推理和文本生成脚本，主要做四件事：

1. 读取命令行参数和生成参数。
2. 读取 ckpt.pt，恢复训练好的模型参数。
3. 把提示词编码成字符编号，调用 model.generate()。
4. 把生成出的编号解码回可读文本。

它不负责：

- 读取训练批次；
- 计算训练损失；
- loss.backward() 反向传播；
- 更新模型参数；
- 调整学习率。

对比记忆：

~~~text
train.py  = 学习和修改模型参数
sample.py = 使用已经学好的模型参数生成文本
~~~

## 3. 文件开头的生成参数

sample.py 中的默认参数如下：

| 参数 | 项目代码中的作用 | 改变它会发生什么 |
|---|---|---|
| init_from | 从 resume 检查点或 GPT-2 预训练模型初始化 | 决定模型参数从哪里来 |
| out_dir | 模型输出目录 | resume 时从这里找 ckpt.pt |
| start | 生成起点，也叫提示词 | 决定模型从什么内容开始续写 |
| num_samples | 生成多少条样本 | 每条都从同一个提示词重新开始 |
| max_new_tokens | 每条样本最多新增多少个字符编号 | 越大，生成文本越长 |
| temperature | 温度参数 | 小于 1 更保守，大于 1 更随机 |
| top_k | 只保留分数最高的 K 个候选 | 越小，候选范围越窄 |
| seed | 随机种子 | 便于复现实验结果 |
| device | 运行设备，例如 cuda 或 cpu | 项目实验使用 GPU 版 venv-gpu |
| dtype | Data Type，数据类型 | 影响计算精度、速度和显存 |
| compile | 是否使用 PyTorch 编译优化 | 可能提高速度，但首次编译需要时间 |

第一次出现的英文缩写：

- GPU：Graphics Processing Unit，图形处理器，负责并行计算。
- CUDA：Compute Unified Device Architecture，统一计算设备架构，使 PyTorch 能调用 NVIDIA GPU。
- GPT：Generative Pre-trained Transformer，生成式预训练变换器。
- ID：Identifier，标识编号；这里指字符在词表中的整数编号。
- dtype：Data Type，数据类型。
- FP16：Floating Point 16，16 位浮点数。
- BF16：Brain Floating Point 16，16 位脑浮点数；代码中写作 bfloat16。

## 4. 运行环境和随机性

代码先设置随机种子：

~~~python
torch.manual_seed(seed)
torch.cuda.manual_seed(seed)
~~~

含义是：让随机采样尽可能可复现。注意“尽可能”而不是“绝对保证”，因为不同硬件、不同 PyTorch 版本或不同并行算法仍可能有差异。

代码还建立了计算上下文 ctx：

~~~python
device_type = 'cuda' if 'cuda' in device else 'cpu'
ptdtype = {'float32': torch.float32,
           'bfloat16': torch.bfloat16,
           'float16': torch.float16}[dtype]
ctx = nullcontext() if device_type == 'cpu' else \
      torch.amp.autocast(device_type=device_type, dtype=ptdtype)
~~~

这里的 autocast 是自动混合精度上下文：允许适合的运算使用低精度类型，从而减少显存占用、提高 GPU 计算速度。它不改变模型的生成逻辑，只改变部分运算使用的数值类型。

## 5. 读取 ckpt.pt 并恢复模型

当 init_from == 'resume' 时，代码执行：

~~~python
ckpt_path = os.path.join(out_dir, 'ckpt.pt')
checkpoint = torch.load(ckpt_path, map_location=device)
gptconf = GPTConfig(**checkpoint['model_args'])
model = GPT(gptconf)
state_dict = checkpoint['model']
model.load_state_dict(state_dict)
~~~

数据流可以理解为：

~~~text
ckpt.pt
  ├── model_args  -> 创建同结构 GPT
  └── model       -> 填入训练好的权重
~~~

其中：

- GPTConfig：GPT Configuration，GPT 配置对象，保存层数、头数、特征维度等结构参数。
- state_dict：状态字典，按参数名保存每一层的权重和偏置。
- load_state_dict：把状态字典中的参数装载回模型。

如果模型曾被 torch.compile() 包装，参数名可能带有 _orig_mod. 前缀。代码会先删除这个前缀，再加载参数。这不是改变权重数值，而是修正参数名字，使名字和当前模型结构对应。

加载后：

~~~python
model.eval()
model.to(device)
~~~

eval 是 evaluation，评估/推理模式。它会让 Dropout 等训练时随机行为关闭。这样同一输入的生成过程更稳定。

model.to(device) 把模型参数移动到指定设备；输入张量也必须在同一个设备上，否则会出现设备不一致错误。

## 6. 字符串如何变成字符编号

本项目是字符级模型。训练数据准备阶段生成了：

~~~text
meta.pkl
  ├── stoi：string to integer，字符 -> 编号
  └── itos：integer to string，编号 -> 字符
~~~

如果找到 meta.pkl，sample.py 使用：

~~~python
stoi, itos = meta['stoi'], meta['itos']
encode = lambda s: [stoi[c] for c in s]
decode = lambda l: ''.join([itos[i] for i in l])
~~~

例子是示意，不代表某个字符的真实编号：

~~~text
stoi['H'] = 20
stoi['i'] = 31
stoi[' '] = 0

encode('Hi ') -> [20, 31, 0]
decode([20, 31, 0]) -> 'Hi '
~~~

注意：模型不直接接收字母 H，而是接收整数编号 20。之后 model.transformer.wte 才把编号查表变成特征向量。

如果没有 meta.pkl，代码退回使用 tiktoken 的 GPT-2 编码方式。对于本项目的 Shakespeare 字符模型，应优先使用数据目录中的 meta.pkl，因为训练时和推理时必须使用同一套词表。

## 7. 提示词张量 x 的形状

~~~python
start_ids = encode(start)
x = torch.tensor(start_ids, dtype=torch.long, device=device)[None, ...]
~~~

假设：

~~~text
start = 'To '
start_ids = [12, 47, 3]
~~~

那么：

~~~text
torch.tensor(start_ids)       -> (T,)   = (3,)
[None, ...]                   -> (B,T)  = (1,3)
~~~

None 是在第 0 维增加一个长度为 1 的维度。这里不是增加字符，而是增加“批次维度”：

~~~text
原来: [12, 47, 3]
现在: [[12, 47, 3]]
       └── 一条样本 ──┘
~~~

所以 x 的形状是 (1,T)：一次生成 1 条序列，序列当前有 T 个字符编号。

## 8. sample.py 的外层生成循环

文件末尾：

~~~python
with torch.no_grad():
    with ctx:
        for k in range(num_samples):
            y = model.generate(x, max_new_tokens,
                               temperature=temperature,
                               top_k=top_k)
            print(decode(y[0].tolist()))
            print('---------------')
~~~

执行顺序：

1. torch.no_grad()：不记录梯度计算图。生成不需要反向传播，因此节省显存和计算量。
2. ctx：使用 CPU 普通精度或 GPU 自动混合精度。
3. for k in range(num_samples)：重复生成多条样本。
4. 每次都把同一个 x 作为起点传给 generate。
5. generate 返回完整序列 y，包含提示词和新增字符。
6. y[0].tolist()：取第 0 条样本，并转为 Python 整数列表。
7. decode：把整数编号还原为字符。

为什么同一个提示词可能生成不同文本？

因为 torch.multinomial 按概率分布随机抽样。固定 seed 时通常可以复现；改变 seed 或采样过程，结果可能不同。

## 9. model.generate() 内层循环：一次新增一个字符

真实代码在 model.py 的 GPT.generate() 中。

### 9.1 限制上下文长度

~~~python
idx_cond = idx if idx.size(1) <= self.config.block_size \
           else idx[:, -self.config.block_size:]
~~~

如果当前序列不超过 block_size，就全部送入模型；如果太长，只保留最后 block_size 个编号。

例如 block_size=256：

~~~text
当前 idx:       (1, 300)
idx_cond:       (1, 256)，只保留最后 256 个位置
~~~

原因是位置嵌入和注意力计算只支持模型配置规定的最大上下文长度。被裁掉的是更早的上下文，模型暂时看不到它们，但正在生成的 idx 完整序列仍会继续保存。

### 9.2 前向计算并取最后位置

~~~python
logits, _ = self(idx_cond)
logits = logits[:, -1, :] / temperature
~~~

推理时没有传入 targets，所以 GPT.forward() 使用：

~~~python
logits = self.lm_head(x[:, [-1], :])
~~~

x 是经过所有 Block 和最后 LayerNorm 的隐藏状态，形状为 (B,T,C)。

x[:, [-1], :] 的含义：

~~~text
第 0 维 : 取所有样本
第 1 维 [-1] : 取最后一个位置，但保留这一维
第 2 维 : 取全部 C 个特征
~~~

因此：

~~~text
x                 : (B,T,C)
x[:, [-1], :]     : (B,1,C)
lm_head           : C -> V
logits            : (B,1,V)
logits[:, -1, :]  : (B,V)
~~~

为什么只取最后一个位置？

当前序列是：

~~~text
[第1个字符, 第2个字符, ..., 第T个字符]
~~~

我们要预测的是第 T+1 个字符。最后位置的隐藏状态已经通过因果注意力读取了前面所有允许读取的内容，所以它对应“下一字符”的预测。前面位置的分数已经在之前生成步骤中用过，不需要再次计算输出层。

这是推理阶段的小优化：Block 仍然处理当前上下文，但 lm_head 只处理最后一个位置。

### 9.3 温度缩放

~~~python
logits = logits / temperature
~~~

温度作用在 Softmax 之前：

~~~text
p_i = Softmax(logits_i / temperature)
~~~

直观类比：温度像“把分数差距的音量旋钮”旋大或旋小。

- temperature < 1：分数差距被放大，最高分更容易胜出，结果更保守。
- temperature = 1：不改变原始分数比例。
- temperature > 1：分数差距被压平，其他候选也更有机会，结果更随机。

示意：原始分数 [4, 2, 1]。

~~~text
temperature=0.5 -> [8, 4, 2]，差距变大
temperature=1.0 -> [4, 2, 1]，不变
temperature=2.0 -> [2, 1, 0.5]，差距变小
~~~

### 9.4 Top-K 筛选

~~~python
v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
logits[logits < v[:, [-1]]] = -float('Inf')
~~~

Top-K 的意思是：只保留分数最高的 K 个候选。

假设词表只有 5 个候选字符，分数为：

~~~text
字符:   A     B     C     D     E
分数:  2.1   5.0   0.7   3.2   1.4
~~~

如果 top_k=2，保留 B=5.0 和 D=3.2，其余分数改成负无穷：

~~~text
[-Inf, 5.0, -Inf, 3.2, -Inf]
~~~

之后进行 Softmax 时，负无穷对应的概率会变成 0。因此 Top-K 不是给前 K 个候选重新打分，而是把其他候选的抽样资格取消。

v[:, [-1]] 取每个样本 Top-K 中的最低分数，作为筛选门槛。[-1] 用列表写法是为了保留形状 (B,1)，便于和 (B,V) 的 logits 广播比较。

### 9.5 Softmax 得到概率

~~~python
probs = F.softmax(logits, dim=-1)
~~~

此时 logits 形状是 (B,V)。dim=-1 表示最后一维，也就是词表候选维度 V。

对每个样本单独归一化：

~~~text
每个样本的 V 个字符分数
          ↓ Softmax(dim=-1)
每个样本的 V 个字符概率，概率和为 1
~~~

### 9.6 按概率抽样一个编号

~~~python
idx_next = torch.multinomial(probs, num_samples=1)
~~~

multinomial 是多项分布抽样函数。这里不是永远选择最大概率，而是按照概率“抽签”。

形状变化：

~~~text
probs:    (B,V)
idx_next: (B,1)
~~~

例如：

~~~text
字符概率: A=0.70, B=0.20, C=0.10
~~~

多次运行时，A 最常被抽到，但 B、C 仍有小概率被抽到。这使生成结果不至于每次都完全一样。

### 9.7 拼接到序列末尾

~~~python
idx = torch.cat((idx, idx_next), dim=1)
~~~

沿着序列维度 dim=1 拼接：

~~~text
旧 idx:    (B,T)
新编号:    (B,1)
新 idx:    (B,T+1)
~~~

然后回到循环开头，用新的完整序列预测下一个字符。

## 10. 一次循环的完整例子

假设：

~~~text
B=1，当前提示词长度 T=3，词表大小 V=65，max_new_tokens=2
~~~

~~~text
第 0 次输入: idx       (1,3)
前向输出:   logits     (1,1,65)
取最后位置: logits     (1,65)
抽样结果:   idx_next   (1,1)
拼接后:     idx         (1,4)

第 1 次输入: idx       (1,4)
前向输出:   logits     (1,1,65)
抽样结果:   idx_next   (1,1)
拼接后:     idx         (1,5)
~~~

最终 y 包含：

~~~text
原来的 3 个提示字符 + 新生成的 2 个字符 = 5 个字符编号
~~~

max_new_tokens 控制新增数量，不是控制最终序列总长度。

## 11. temperature、top_k 的实验理解

两者作用顺序：

~~~text
原始 logits
    ↓ 除以 temperature
温度调整后的 logits
    ↓ top_k 筛选
部分候选变成 -Inf
    ↓ Softmax
概率分布
    ↓ multinomial
抽样下一个字符
~~~

常见组合：

| 设置 | 典型效果 |
|---|---|
| temperature=0.3, top_k=5 | 很保守，重复和确定性更强 |
| temperature=0.8, top_k=20 | 项目常用的折中设置 |
| temperature=1.2, top_k=65 | 更开放、更随机 |
| top_k=1 | 只在最高分候选中选择，接近贪心生成 |

这里的“接近”是因为 torch.multinomial 仍然执行抽样；但当只有一个候选时，结果实际上被固定了。

## 12. sample.py 与 train.py 对比

| 项目 | train.py | sample.py |
|---|---|---|
| 目的 | 学习参数 | 使用参数生成文本 |
| 是否需要 targets | 需要 | 不需要 |
| 是否计算 Loss | 是 | 否 |
| 是否反向传播 | 是 | 否 |
| 是否更新优化器 | 是 | 否 |
| 是否需要梯度 | 需要 | no_grad 关闭 |
| 模式 | model.train() | model.eval() |
| 输出 | 训练损失和参数变化 | 字符编号和文本 |
| 随机来源 | 批次、Dropout 等 | multinomial 抽样、temperature、top_k |

## 13. 动手练习：参数实验

### 练习 A：比较温度

PowerShell 命令必须在项目目录执行：

~~~powershell
Set-Location -LiteralPath "D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT"
& "D:\FPGA\NanoGPT\venv-gpu\Scripts\python.exe" ".\sample.py" --out_dir=".\out-shakespeare-char" --device=cuda --compile=False --start="To " --num_samples=1 --max_new_tokens=30 --temperature=0.3 --top_k=20 --seed=1337
~~~

再运行：

~~~powershell
& "D:\FPGA\NanoGPT\venv-gpu\Scripts\python.exe" ".\sample.py" --out_dir=".\out-shakespeare-char" --device=cuda --compile=False --start="To " --num_samples=1 --max_new_tokens=30 --temperature=1.2 --top_k=20 --seed=1337
~~~

验证问题：

1. 哪一次结果更保守？为什么？
2. 固定 seed 后，两次结果为什么仍可能不同？
3. 把 top_k=20 改成 top_k=1，文本有什么变化？

### 练习 B：加入形状打印

临时编辑真实文件：

D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT\model.py

在 GPT.generate() 中，logits = logits[:, -1, :] / temperature 后加入：

~~~python
print(f"当前序列形状={tuple(idx.shape)}, 最后位置分数形状={tuple(logits.shape)}")
~~~

然后只生成 3 个字符：

~~~powershell
& "D:\FPGA\NanoGPT\venv-gpu\Scripts\python.exe" ".\sample.py" --out_dir=".\out-shakespeare-char" --device=cuda --compile=False --start="To " --num_samples=1 --max_new_tokens=3 --temperature=0.8 --top_k=20 --seed=1337
~~~

预期看到：

~~~text
当前序列形状=(1, 3), 最后位置分数形状=(1, 65)
当前序列形状=(1, 4), 最后位置分数形状=(1, 65)
当前序列形状=(1, 5), 最后位置分数形状=(1, 65)
~~~

验证后删除这行临时打印，避免影响后续实验输出。

## 14. 常见错误与因果关系

### 错误 1：找不到 ckpt.pt

原因：out_dir 指向的目录没有训练检查点，或当前工作目录不对。

验证：检查下面的文件是否存在：

~~~text
D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT\out-shakespeare-char\ckpt.pt
~~~

### 错误 2：模型和输入不在同一设备

原因：模型在 CUDA，输入还在 CPU，或反过来。

验证：代码中 model.to(device) 和创建 x 时的 device=device 必须一致。

### 错误 3：词表不匹配

原因：训练时使用字符词表，推理时却使用了另一套编码器。

结果：编号虽然是整数，但编号代表的字符含义已经错位。

验证：确认 meta.pkl 来自当前数据集，并且训练和推理都使用同一套 stoi/itos。

### 错误 4：temperature 设置为 0

原因：代码执行 logits / temperature，除以 0 没有有效的概率分布。

处理：使用大于 0 的温度，例如 0.3、0.8 或 1.2。

### 错误 5：误以为 max_new_tokens=30 表示最终长度为 30

实际含义：在原提示词后新增 30 个编号；最终长度是“提示词长度 + 30”。

## 15. 费曼复述验收题

请不要照抄代码，用自己的话回答：

1. sample.py 从提示词到最终文本经过哪些步骤？
2. 为什么 x 要从 (T,) 变成 (1,T)？
3. 为什么模型前向结果是 (B,1,V)，而不是 (B,T,V)？
4. logits[:, -1, :] 中的 -1 取到了什么？
5. temperature 为什么放在 Softmax 之前？
6. top_k 是如何把候选字符限制住的？
7. 为什么 torch.multinomial 不总是选择最高概率字符？
8. idx = torch.cat((idx, idx_next), dim=1) 后，哪个维度发生了变化？
9. 为什么生成时使用 model.eval() 和 torch.no_grad()？
10. block_size 太小时，生成很长文本会发生什么？

验收标准：能说明“数据形状变化 + 代码作用 + 这样做的原因”，才算真正掌握。

## 16. 本模块高价值复习卡片

### 卡片 1：生成的核心循环

问：nanoGPT 如何新增一个字符？

答：当前 idx 前向得到最后位置的 logits，经过温度调整、Top-K、Softmax 后按概率抽样 idx_next，再沿 dim=1 拼回 idx。

### 卡片 2：(B,1,V) 的来源

问：为什么推理 logits 保留中间的 1？

答：x[:, [-1], :] 用列表形式选最后位置，保留时间维度，因此隐藏状态为 (B,1,C)，经过 lm_head 后为 (B,1,V)。

### 卡片 3：温度

问：温度小于 1 和大于 1 分别有什么效果？

答：小于 1 放大分数差距，分布更尖锐、更保守；大于 1 压平分数差距，分布更平坦、更随机。

### 卡片 4：上下文裁剪

问：为什么 idx 超过 block_size 时只取最后一段？

答：模型的位置嵌入和注意力上下文有最大长度限制；裁剪保证送入模型的 idx_cond 不超过 block_size。

### 卡片 5：训练与推理

问：sample.py 为什么不需要 targets、Loss、反向传播和优化器？

答：它只使用已经训练好的参数进行前向预测和采样，不再学习参数。

## 17. 学习结果记录

完成练习后补充：

~~~text
运行环境：D:\FPGA\NanoGPT\venv-gpu
使用设备：
提示词：
temperature：
top_k：
max_new_tokens：
seed：

实验现象：

我的解释：

遇到的问题及原因：

结论：
~~~

下一次学习时，我会先检查本页的复述题和实验结果，再进入第六模块“数据准备：prepare.py → train.bin / val.bin / meta.pkl”。本次内容确认后，再把方法、步骤、结果和参考代码整理成 Word 实验记录。

## 18. 参考代码

- D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT\sample.py
- D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT\model.py 中的 GPT.forward() 和 GPT.generate()
- D:\FPGA\NanoGPT\nanogpt-zynq-backups-main\python\nanoGPT\data\shakespeare_char\prepare.py 生成的 meta.pkl

本笔记没有引入外部资料；所有代码解释均对应上述项目文件。

