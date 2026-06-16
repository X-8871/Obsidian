import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import datasets
from torchvision.transforms import ToTensor

print("="*60)
print(" 练习 1: 召唤采购员和传菜员 (基础复现)")
print("="*60)
# 任务目标：
# 1. 请使用 datasets.FashionMNIST 下载/加载训练集 (赋予变量名 training_data)
#    提示: 需要设置 root="data", train=True, download=True, transform=ToTensor()
# 2. 请为 training_data 配置一个 DataLoader (赋予变量名 train_dataloader)
#    提示: 设置 batch_size=32, shuffle=True

# --- 请在下方写代码 ---
# training_data = ...
# train_dataloader = ...
training_data = datasets.FashionMNIST(

    root="data",
    train=True,
    download=True,
    transform=ToTensor()
)

train_dataloader= DataLoader(training_data,batch_size=32,shuffle=True)

# --- 代码结束 ---


print("\n" + "="*60)
print(" 练习 2: 启动传送带，抽查第一盘菜 (形状验证)")
print("="*60)
# 任务目标：
# 1. 请使用 iter() 和 next() 从刚才创建的 train_dataloader 中端出一盘菜 (一个 Batch)
# 2. 将照片数据赋值给变量 images，标签赋值给变量 labels
# 3. 打印出 images 和 labels 的形状 (shape)
#    预期输出：images 应该是 [32, 1, 28, 28]，labels 应该是 [32]

# --- 请在下方写代码 ---
images, labels =  next(iter(train_dataloader))


print(f"Images shape: {images.shape}")
print(f"Labels shape: {labels.shape}")

# --- 代码结束 ---


print("\n" + "="*60)
print(" 练习 3: 小挑战 - 扮演采购员 (自定义 Dataset)")
print("="*60)
# 任务目标：
# 假设我们有一个超级简单的数据集，里面只有 100 张全黑的图片 (像素全是 0)，标签全是 1。
# 请你补全下面这个自定义 Dataset 类的三大魔法函数。

class DummyDataset(Dataset):
    def __init__(self):
        # 我们假设总共有 100 条数据
        self.total_samples = 100
        
    def __len__(self):
        # --- 请在下方写代码 (告诉外界我们有多少条数据) ---
        return self.total_samples
        
    def __getitem__(self, idx):
        # --- 请在下方写代码 (根据 idx 返回一张全 0 的图片张量，和一个等于 1 的标签) ---
        # 提示1：全 0 张量可以用 torch.zeros(1, 28, 28)
        # 提示2：必须 return 图片, 标签
        
        image = torch.zeros(1, 28, 28)
        label = 1
        return image , label
# 验证挑战是否成功：
# 如果你写对了，下面的代码应该能正常运行并打印出 100 和 [1, 28, 28]
my_dataset = DummyDataset()
print(f"数据集大小: {len(my_dataset)}")
img, label = my_dataset[0]
print(f"第0个数据的图片形状: {img.shape}, 标签: {label}")
