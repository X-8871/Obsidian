# 模块 1：张量 (Tensors) 详尽学习指南

张量（Tensor）是一种特殊的数据结构，非常类似于数组（arrays）和矩阵（matrices）。在 PyTorch 中，我们使用张量来编码模型的输入、输出，以及模型的参数。

你可以把张量想象成一个多维的表格。如果是一个数字，就是标量（0维）；如果是一列数字，就是向量（1维）；如果是一个表格，就是矩阵（2维）；如果是多个表格叠在一起，就是3维或更高维的张量。

张量和 NumPy 的 `ndarray` 非常相似，但张量有一个超级大招：**它可以运行在 GPU 或其他硬件加速器上！** 此外，张量还专门为“自动求导”进行了高度优化。

---

## 1. 初始化张量 (Initializing a Tensor)

有很多种方法可以创建一个张量，下面是官方文档列出的所有方法：

### 1.1 直接从数据创建 (Directly from data)
你可以直接把 Python 的列表（List）传给 `torch.tensor()`。数据类型会被自动推断出来。
```python
import torch

data = [[1, 2], [3, 4]]
x_data = torch.tensor(data)
print(x_data)
# 输出:
# tensor([[1, 2],
#         [3, 4]])
```

### 1.2 从 NumPy 数组创建 (From a NumPy array)
张量可以由 NumPy 数组无缝生成。并且在 CPU 上，它们会共享同一块内存。
```python
import numpy as np

np_array = np.array(data)
x_np = torch.from_numpy(np_array)
```

### 1.3 从另一个张量创建 (From another tensor)
新的张量会保留原有张量的属性（比如形状 shape 和数据类型 dtype），除非你显式地覆盖它们。
```python
x_ones = torch.ones_like(x_data) # 保留 x_data 的属性，生成全 1
print(x_ones)

x_rand = torch.rand_like(x_data, dtype=torch.float) # 显式覆盖数据类型为浮点数，生成随机数
print(x_rand)
```

### 1.4 指定形状生成 (With random or constant values)
你可以用一个元组（tuple）来定义张量的形状。这是在初始化神经网络权重时最常用的方法。
```python
shape = (2, 3,) # 代表 2 行 3 列
rand_tensor = torch.rand(shape)   # [0, 1) 之间的均匀分布随机数
ones_tensor = torch.ones(shape)   # 全 1
zeros_tensor = torch.zeros(shape) # 全 0
```

---

## 2. 张量的属性 (Attributes of a Tensor)

张量的属性描述了它的“体检报告”：长什么样、是什么类型、在哪工作。
当你以后写代码报错时，90% 的问题都出在这三个属性没对齐上！

```python
tensor = torch.rand(3, 4)

print(f"张量的形状 (Shape): {tensor.shape}")     # 比如 torch.Size([3, 4])
print(f"张量的数据类型 (Datatype): {tensor.dtype}") # 比如 torch.float32
print(f"张量所在的设备 (Device): {tensor.device}")  # 比如 cpu 或者 cuda:0
```

---

## 3. 张量的操作 (Operations on Tensors)

PyTorch 提供了上百个张量操作。默认情况下，张量是在 CPU 上创建的。

### 3.1 搬家：移动到 GPU (Moving to accelerator)
如果想利用显卡加速，我们需要手动把张量搬过去。
```python
if torch.cuda.is_available():
    tensor = tensor.to("cuda")
```

### 3.2 索引和切片 (Standard numpy-like indexing and slicing)
和 Python 列表的操作一模一样。
```python
tensor = torch.ones(4, 4)
print(f"获取第一行: {tensor[0]}")
print(f"获取第一列: {tensor[:, 0]}")

# 修改第二列的值为 0 (索引从 0 开始)
tensor[:, 1] = 0
```

### 3.3 拼接张量 (Joining tensors)
使用 `torch.cat` 沿着指定的维度（dim）将一系列张量拼接起来。
*   `dim=0`: 纵向（上下）拼接，行数增加。
*   `dim=1`: 横向（左右）拼接，列数增加。
```python
t1 = torch.cat([tensor, tensor, tensor], dim=1)
```

### 3.4 算术运算 (Arithmetic operations)
在深度学习中，最常用的就是**矩阵乘法**和**逐元素乘法**。

**矩阵乘法 (Matrix Multiplication)**: (行列相乘累加)
```python
# 以下三种写法完全等价：
y1 = tensor @ tensor.T       # .T 返回张量的转置
y2 = tensor.matmul(tensor.T)
y3 = torch.rand_like(y1)
torch.matmul(tensor, tensor.T, out=y3) # 将结果直接写入 y3
```

**逐元素乘法 (Element-wise Multiplication)**: (对应位置各自相乘)
```python
z1 = tensor * tensor
z2 = tensor.mul(tensor)
```

### 3.5 单元素提取 (Single-element tensors)
如果你对张量进行了聚合操作（比如求和），得到了一个**只包含一个值**的张量，你可以用 `.item()` 把它变成标准的 Python 数值。
```python
agg = tensor.sum() 
agg_item = agg.item()  # 提取出干净的数值
print(agg_item, type(agg_item)) # 输出: 12.0 <class 'float'>
```

### 3.6 就地操作 (In-place operations)
凡是带有下划线 `_` 后缀的操作，都会**直接修改原始张量**，不会产生新的内存。
```python
tensor.add_(5) # 直接给 tensor 里的每个元素加上 5
```
> ⚠️ **注意**: 虽然就地操作能节省内存，但它会丢失历史记录，在计算导数（Autograd）时可能会带来问题，因此在训练网络时一般不推荐使用。

---

## 4. 与 NumPy 的桥梁 (Bridge with NumPy)

CPU 上的张量和 NumPy 数组共享底层内存。**改变其中一个，另一个也会跟着变！**

### 4.1 Tensor 转 NumPy
```python
t = torch.ones(5)
n = t.numpy()

t.add_(1) # 修改 tensor
print(t) # tensor([2., 2., 2., 2., 2.])
print(n) # [2. 2. 2. 2. 2.] (NumPy 也变了！)
```

### 4.2 NumPy 转 Tensor
```python
n = np.ones(5)
t = torch.from_numpy(n)

np.add(n, 1, out=n) # 修改 NumPy
print(t) # tensor([2., 2., 2., 2., 2.], dtype=torch.float64) (Tensor也变了！)
```

---
**阅读完毕后，如果有任何不理解的概念或代码，请随时在对话中向我提问！我会为你解答。**
**如果你觉得已经完全掌握了，请告诉我“完全学会了”，我再来给你出练习题！**

---

## 5. Q&A 补充精华（基于你的提问整理）

在我们的互动答疑中，你提出了许多极其敏锐的好问题！这里将最核心的盲点和细节整理归档，方便你随时复习：

### 5.1 概念对比：List、NumPy 与 Tensor
*   **Python 列表 (List `[]`)**：像一个通用的纸箱子，什么都能装，可以随时修改（可变），但计算极其缓慢。
*   **元组 (Tuple `()`)**：像刻了字的石碑，一旦创建就**绝对不允许修改**（不可变）。在定义严谨的张量“形状 (shape)”时，必须使用元组（如 `(4, 4)`）。
*   **NumPy `ndarray`**：N 维数组，像是一个每个格子里都装着同类数据（主要是数字）的精密药盒，计算飞快。
*   **PyTorch 张量 (Tensor)**：NumPy 数组的“超级进化版”。长得一样，但在 CPU 上能互通内存，而且最大的绝活是能被发射到 **GPU** 上加速，还能自动算导数。

### 5.2 语法与符号大揭秘
*   **`@` vs `*`**：
    *   `@`：这是**矩阵乘法**的专属简写符号，等价于 `.matmul()`，遵循线性代数的行乘列规则。
    *   `*`：这是**逐元素乘法**，两个重叠的表格“你乘你的，我乘我的”。
*   **切片冒号 `:`**：在 `tensor[:, 0]` 中，冒号的意思是**“全都要”**。这句代码的含义是：“针对行的维度我全都要，针对列的维度我只要第 1 列（索引0）”——最终剥离出整个第一列。
*   **后缀下划线 `_` (就地操作)**：凡是名字带下划线的，如 `add_`、`zero_`、`fill_`，都会**直接修改原始张量**本身。虽然省内存，但可能破坏后续网络训练的求导，慎用！

### 5.3 细枝末节的“坑”
*   **为什么输出带 `tensor(...)` 的壳子？** 这是 PyTorch 故意给你挂的“身份铭牌”，防止你把它和普通的 List 搞混。如果想脱去外壳拿到纯净的数字，对于单个数字的张量，使用 **`.item()`** 提取。
*   **形状 vs 内容**：在 `torch.ones(4, 4)` 中，`(4, 4)` 仅仅决定了“外壳大小（Shape）”，前缀 `ones` 才决定了里面填满什么数据。
*   **带 `_like` 的模具**：`torch.ones_like(x)` 意味着拿 `x` 当模具。它只抄袭 `x` 的形状和类型，然后把里面的数据**全部倒掉，重新填满 1**。
*   **设备名称极其严格**：转移设备时（如 `to("cuda")`），名称必须是系统认识的固定小写单词。哪怕写成 `"CUDA"` 或错拼为 `"CUDE"`，程序都会当场崩溃报错。
*   **动宾逻辑**：`tensor.matmul(x)` 是“主角 tensor 对 x 释放技能”，而 `torch.matmul(tensor, x)` 是“用 torch 工具箱把两个东西放进机器加工”，两者完全等价。

### 5.4 练习中发现的高频易错点 (实战避坑指南)
1. **点号与逗号的惨案**：
   * ❌ 错误：`torch.rand(5.3)` 会被机器当成你要一个长宽是“五点三”的张量，报错 `must be tuple of ints`。
   * ✅ 正确：`torch.rand(5, 3)` 逗号才能分隔出“5行”和“3列”。
2. **“塞数据”还是“给形状”**：
   * ❌ 错误：`torch.tensor(3, 3)`。`tensor()` 这个机器只收**现成的数据**（比如列表），不收形状，不造数据。
   * ✅ 正确：想凭空捏造形状，要找专业的造壳机器，如 `torch.zeros(3, 3)` 或 `torch.rand(3, 3)`。
3. **`type()` 与 `dtype` 的混淆**：
   * ❌ 错误：用 `dtype(x)` 去测类型会报错 `name 'dtype' is not defined`。
   * ✅ 正确：`dtype` 是 PyTorch 张量的内部属性（写法是 `tensor.dtype`，不加括号）；而要测试普通的 Python 变量类型，必须用 Python 祖传的照妖镜函数：**`type(x)`**。
