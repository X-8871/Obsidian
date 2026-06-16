# 01_CNN基础实现.md

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

print("="*60)
print(" 练习 1: 聘请拥有火眼金睛的大厨 (Conv2d)")
print("="*60)
# 任务目标：
# 请实例化一个二维卷积层大厨。
# 要求：
# 1. 接收一张真实的彩色图片 (提示：in_channels 是几？)
# 2. 我们想让他提取出 6 种不同的特征画面 (out_channels)
# 3. 给他发一个尺寸为 5x5 的方形放大镜 (kernel_size)

# --- 请在下方写代码 ---
# conv_chef = nn.Conv2d(...)
conv_chef = nn.Conv2d(in_channels=3,out_channels=6,kernel_size=5)
# --- 代码结束 ---
# 如果写对了，下一行会正常打印
print(f"大厨招聘成功！他的配置是: {conv_chef}")



print("\n" + "="*60)
print(" 练习 2: 使用极速瘦身法宝 (Max Pooling)")
print("="*60)
# 任务目标：
# 我们用一堆随机假数字，伪造了一张被提取完特征的巨型图片 (大小为 1x6x32x32)。
# 请你使用 F.max_pool2d 把它的宽和高缩小一半！
# 提示：第二个参数是瘦身的网格大小，通常填 (2, 2)

fake_image_features = torch.randn(1, 6, 32, 32)
print(f"瘦身前，图片的形状是: {fake_image_features.shape}")

# --- 请在下方写代码 ---
# shrunken_features = ...
shrunken_features = F.max_pool2d(fake_image_features,(2,2))
# --- 代码结束 ---
# 如果写对了，你会看到 32x32 变成了 16x16
print(f"瘦身后，图片的形状变成了: {shrunken_features.shape}")



print("\n" + "="*60)
print(" 练习 3: 组装你的第一条 AI 视觉流水线！")
print("="*60)
# 任务目标：
# 把上面学到的东西组合起来，写一个极简的 CNN 图纸 (继承 nn.Module)。
# 1. 在 __init__ 里，准备一个卷积层 (同练习1)。
# 2. 在 forward 里，让数据 x 先经过卷积层，再抹上 F.relu 神仙酱料，最后过一遍 F.max_pool2d((2,2)) 瘦身机！

class MiniCNN(nn.Module):
    def __init__(self):
        super().__init__()
        # --- 请在下方写代码 (准备厨师) ---
        self.conv1 = nn.Conv2d(in_channels=3,out_channels=6,kernel_size=5)
       

    def forward(self, x):
        # --- 请在下方写代码 (安排流水线) ---
        x = self.conv1(x)
        x = F.relu(x)
        x = F.max_pool2d(x,(2,2))
        return x

# 检验流水线是否通畅
my_net = MiniCNN()
dummy_x = torch.randn(1, 3, 32, 32) # 一张假的 32x32 彩色图片
output = my_net(dummy_x)
print(f"\n整条流水线跑通了！最终吐出的数据形状是: {output.shape}")

```
