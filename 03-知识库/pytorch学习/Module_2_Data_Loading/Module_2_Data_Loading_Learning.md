# 模块 2：数据集与数据加载器 (Datasets & DataLoaders)

在深度学习中，处理数据往往比编写神经网络还要繁琐。为了让代码更干净、更好维护，PyTorch 提供了两个极其重要的工具：**`Dataset`（数据集）** 和 **`DataLoader`（数据加载器）**。

它们的作用非常明确，我们可以用一个“**餐厅后厨**”的比喻来理解：
1. **`Dataset`（采购员与切菜工）**：负责去菜市场把菜（数据）买回来，并把每一份菜洗好、切好，贴上标签（Label）。
2. **`DataLoader`（传菜员）**：负责端着盘子，一次性端上 N 份菜（Batch），打乱顺序（Shuffle），并源源不断地送到大厨（GPU 神经网络）手里。

---

## 1. 加载官方自带的数据集

为了方便学习，PyTorch 在视觉（TorchVision）、文本（TorchText）和音频（TorchAudio）库中预装了很多著名的数据集。

这里我们以服装图片分类数据集 **Fashion-MNIST** 为例。它包含 60,000 张训练图片和 10,000 张测试图片。每一张图片都是 28x28 像素的灰度图，并且有一个标签（比如“鞋子”、“衣服”）。

```python
import torch
from torch.utils.data import Dataset
from torchvision import datasets
from torchvision.transforms import ToTensor
import matplotlib.pyplot as plt

# 1. 加载训练集 (用来教模型)
training_data = datasets.FashionMNIST(
    root="data",      # 采购员把数据下载到哪里？（保存在当前目录的 data 文件夹里）
    train=True,       # 明确这是训练集
    download=True,    # 如果本地没有，就从网上自动下载
    transform=ToTensor() # 关键：把图片直接转换成 Tensor（张量）
)

# 2. 加载测试集 (用来考模型)
test_data = datasets.FashionMNIST(
    root="data",
    train=False,      # 明确这是测试集（考卷）
    download=True,
    transform=ToTensor()
)
```
*💡 注：首次运行这段代码时，你会看到控制台疯狂跳出下载进度条，这很正常。*

---

## 2. 探究数据集的内部 (Iterating and Visualizing)

`Dataset` 本质上就像是一个超级 Python 列表。你可以直接用索引（比如 `training_data[0]`）来抽出特定位置的一张图片和它的标签。

```python
# 提取第一张图及其对应的标签
img, label = training_data[0]

print(f"图片的形状: {img.shape}") # 比如 [1, 28, 28] (1个颜色通道，28高，28宽)
print(f"图片的标签: {label}")     # 比如 9 (代表靴子)
```

---

## 3. 打造你自己的数据集 (Creating a Custom Dataset)

虽然官方数据集很好用，但在实际工作中，你的图片往往存在你自己的文件夹里，标签写在一个 CSV 表格里。这时候，你就需要自己写一个类（Class），来充当“私人采购员”。

自定义的数据集**必须**继承 `Dataset`，并且**必须**实现三大魔法函数：
1. `__init__`：初始化（采购员上岗时，给他分配任务清单）。
2. `__len__`：返回数据集大小（采购员汇报总共有多少个包裹）。
3. `__getitem__`：通过索引获取一条数据（你报一个编号，采购员立刻把那份菜洗好切好递给你）。

```python
import os
import pandas as pd
from torchvision.io import read_image

# 自己造一个数据集
class CustomImageDataset(Dataset):
    
    # 1. 初始化：设定图片路径和标签文件
    def __init__(self, annotations_file, img_dir, transform=None):
        self.img_labels = pd.read_csv(annotations_file) # 读取含有标签的 CSV 表格
        self.img_dir = img_dir                          # 图片存放的文件夹路径
        self.transform = transform                      # 是否需要变形/转换格式
        
    # 2. 汇报大小：告诉别人这个数据集有几条数据
    def __len__(self):
        return len(self.img_labels)
        
    # 3. 抓取单条数据：当别人通过索引 idx 来要数据时...
    def __getitem__(self, idx):
        # 3.1 拼凑出图片的完整路径
        img_path = os.path.join(self.img_dir, self.img_labels.iloc[idx, 0])
        # 3.2 读取图片数据（转换成张量）
        image = read_image(img_path)
        # 3.3 拿到对应的标签数字
        label = self.img_labels.iloc[idx, 1]
        
        # 3.4 如果有变形要求，就变形一下
        if self.transform:
            image = self.transform(image)
            
        # 3.5 最终把 (菜, 标签) 组合递出去
        return image, label
```

---

## 4. 传菜员：使用 DataLoader 批量上菜

虽然 `Dataset` 帮我们把数据整理好了，但神经网络训练时，大厨 GPU 的饭量很大，它不喜欢一次只拿一张图片（太慢），它喜欢**一次吃一批（Batch）图片**。而且为了防止模型死记硬背顺序，还需要**打乱顺序（Shuffle）**。

这就轮到牛逼的传菜员 **`DataLoader`** 出场了。

```python
from torch.utils.data import DataLoader

# 给 training_data 数据集配一个传菜员
train_dataloader = DataLoader(training_data, batch_size=64, shuffle=True)

# 给 test_data 也配一个（考试的时候不需要打乱顺序）
test_dataloader = DataLoader(test_data, batch_size=64, shuffle=False)
```
只要这么一句简短的代码，`DataLoader` 就自动帮你完成了：把 60000 张单张图片，打包成了近 1000 个装着 64 张图片的大盘子！

---

## 5. 从 DataLoader 中端起盘子 (Iterate through the DataLoader)

在训练循环中，我们怎么从传菜员那里接过盘子呢？

```python
# Display image and label.
# 使用 iter() 和 next() 抽出第一批数据（端出第一个盘子）
train_features, train_labels = next(iter(train_dataloader))

print(f"批量图片的形状 (Feature batch shape): {train_features.size()}")
print(f"批量标签的形状 (Labels batch shape): {train_labels.size()}")

# 输出结果类似于：
# Feature batch shape: torch.Size([64, 1, 28, 28])
# Labels batch shape: torch.Size([64]) 
# （看到没？64 张图片被打包进了一个四维的大张量里！）
```
以后在神经网络的训练循环（for loop）里，你只需要写 `for images, labels in train_dataloader:`，传菜员就会源源不断地把大小为 64 的大盘子端过来。

---

**阅读完毕后，请随时在对话中向我提问关于 Dataset 和 DataLoader 的任何细节！**
（比如为什么要分 Batch？为什么测试集不用 Shuffle？或者语法上有看不懂的地方）。
**如果你觉得已经彻底理解了，请告诉我“完全学会了”，我会生成专属的练习题。**

---

## 6. Q&A 补充精华（基于你的深度提问）

在我们的互动中，你提出了非常多直击深度学习本质的好问题。以下是核心知识点的归档总结：

### 6.1 Python 语法与模块导入
*   **`import` vs `from ... import`**：`import torch` 是走进超市，每次拿工具都要报完整的货架号（如 `torch.utils.data.Dataset`）。而 `from ... import Dataset` 是让跑腿小哥直接把工具摆在你桌面上，以后代码里只写 `Dataset` 即可，极大节省打字时间。
*   **三大管家齐聚**：
    *   `os`：系统管家，用 `os.path.join` 无缝拼接图片路径，无论 Windows 还是 Mac 都能完美运行。
    *   `pandas (pd)`：表格神器，把装有标签的 CSV 文件吃进内存变成超级表格。
    *   `read_image`：影像提取师，顺藤摸瓜去硬盘把图片抓出来并直接切成张量（Tensor）。

### 6.2 名词辨析与概念澄清
*   **`Dataset` (大写单数) vs `datasets` (小写复数)**：
    *   `Dataset`：它是官方颁布的**基础图纸（抽象类）**。里面没有具体图片，是定规矩用的。
    *   `datasets`：它是官方预先下好的**超级大仓库（模块）**。里面装满了 FashionMNIST 等经典现成数据集。
*   **图纸(Class)与实物(Instance)**：`Dataset` 作为类是一张空白图纸；而一旦运行 `training_data = datasets...`，它就根据图纸造出了一个装满数据的庞大实物（像超级列表），你可以对它使用索引和求长度。
*   **验证集去哪了？**：很多经典数据集原版就只有 Train 和 Test。在实战中，我们通常会用 `random_split` 从 Train 训练集中强行撕下一部分作为验证集（模拟考卷），严禁动用 Test 测试集（高考卷）。

### 6.3 探秘底层运作机制
*   **拆包包裹 (`img, label = training_data[0]`)**：数据集给出的第 0 号数据是一个由（图片张量，标签数字）组成的包裹（元组）。这句话就像美工刀，划开包裹，左手拿出图片存入 `img`，右手拿标签存入 `label`。
*   **数数原理 (`__len__`)**：通过给 Pandas 表格套上 `len()`，直接查出表格有多少行，有多少行就意味着有多少张图片。
*   **索引提取 (`__getitem__(self, idx)`)**：`idx` 就是传菜员报出的订单号。`.iloc[idx, 0]` 的意思是：去表格的第 `idx` 行，拿走第 `0` 列的数据（通常是图片的文件名）。
*   **传送带启动 (`next(iter(dataloader))`)**：`iter()` 是按下回转寿司传送带的启动键，`next()` 是命令传送带往前转一格，吐出一盘菜（一个批次 Batch 的数据）。
*   **终极联动（Batch 与神经网络）**：一个 Batch 有 64 张图片（每张784个像素点 X）。这 64 组庞大的数据会**在一瞬间同时**砸向神经网络的第一层。利用 GPU 几千个核心的并行计算能力，这不仅计算极快，而且基于这 64 张图的综合表现来调整参数，能让模型学得更稳（小批量梯度下降法）。
