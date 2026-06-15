import torch

print("============================================================")
print(" 练习 1: 基础复现 (掌握形状和属性)")
print("============================================================")
# 任务目标：
# 1. 创建一个形状为 (5, 3) 的随机张量，命名为 my_tensor。
# 2. 打印出它的 形状(shape)、数据类型(dtype) 和 所在设备(device)。

# 在这里写下你的代码：

my_tensor=torch.rand(5,3)

print(f"形状：{my_tensor.shape}")
print(f"类型：{my_tensor.dtype}")
print(f"设备：{my_tensor.device}")

print("\n============================================================")
print(" 练习 2: 小变通 (掌握设备和类型)")
print("============================================================")
# 任务目标：
# 1. 创建一个包含整数的张量：[1, 2, 3]，命名为 int_tensor。
# 2. 使用 torch.rand_like() 基于它创建一个新的随机张量，要求新的张量全是浮点数(float)，命名为 float_rand_tensor。
# 3. 分别打印这两个张量看看效果。

# 在这里写下你的代码：
date=[1,2,3]
int_tensor=torch.tensor(date)
float_rand_tensor=torch.rand_like(int_tensor,dtype=torch.float)
print(int_tensor)
print(float_rand_tensor)


print("\n============================================================")
print(" 练习 3: 小挑战 (就地操作与单元素提取)")
print("============================================================")
# 任务目标：
# 1. 创建一个形状为 (3, 3) 的全 0 张量。
# 2. 用“就地加法” add_() 给它里面的每个元素都加上 10。
# 3. 用 .sum() 求出里面所有数字的总和，并用 .item() 提取出最终的 Python 数字并打印。

# 在这里写下你的代码：

tensor=torch.zeros(3,3)
tensor.add_(10)
agg=tensor.sum()
agg_item=agg.item()
print(agg_item,type(agg_item))


