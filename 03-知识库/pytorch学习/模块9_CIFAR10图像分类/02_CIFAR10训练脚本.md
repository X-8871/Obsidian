# 02_CIFAR10训练脚本.md

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms

print("="*60)
print(" 终极决战：训练 CIFAR-10 图像识别 AI")
print("="*60)

# ==========================================
# 1. 探寻微波炉 (GPU) 与数据加载
# ==========================================
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"🌟 当前炼丹炉状态: {device} 🌟\n")

# CIFAR10 的数据预处理 (转为张量并标准化颜色)
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
])

print("正在下载/加载 CIFAR-10 数据集 (大概需要十几秒)...")
trainset = torchvision.datasets.CIFAR10(root='./data', train=True, download=True, transform=transform)
trainloader = torch.utils.data.DataLoader(trainset, batch_size=64, shuffle=True)

testset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True, transform=transform)
testloader = torch.utils.data.DataLoader(testset, batch_size=64, shuffle=False)

# ==========================================
# 2. 定义深层卷积神经网络 (大厨图纸)
# ==========================================
class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 6, 5)   # 第一个放大镜
        self.pool = nn.MaxPool2d(2, 2)    # 瘦身机
        self.conv2 = nn.Conv2d(6, 16, 5)  # 第二个放大镜
        self.fc1 = nn.Linear(16 * 5 * 5, 120) # 压扁后的苦力1
        self.fc2 = nn.Linear(120, 84)         # 苦力2
        self.fc3 = nn.Linear(84, 10)          # 最终打分 (10个类别)

    def forward(self, x):
        # 典型的 CNN 流水线：卷积 -> 酱料 -> 池化瘦身
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1) # 把图片彻底压扁成面条
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = self.fc3(x)         # 最后一层不要加 ReLU！直接输出生打分(Logits)
        return x

# ==========================================
# 3. 聘请大厨和主管，并塞进微波炉！
# ==========================================
net = Net()
net.to(device) # 把大厨强行塞进 GPU

criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(net.parameters(), lr=0.001, momentum=0.9) # 加强版教练

# ==========================================
# 4. 后厨训练车间 (需要你补全 5 步曲)
# ==========================================
def train_loop(dataloader, model, loss_fn, optimizer):
    model.train() # 开启训练特训模式
    size = len(dataloader.dataset)
    
    for batch, (X, y) in enumerate(dataloader):
        # 【重要！】把传菜员端上来的菜，也扔进微波炉里！
        X, y = X.to(device), y.to(device)
        
        # ----------------------------------
        # 👇 请在这里默写极其神圣的 5 步曲口诀 👇
        # ----------------------------------
        # 1. 做菜
        pred = model(X)
        
        # 2. 算分
        loss = loss_fn(pred,y)
        
        # 3. 撕旧账本 (极其重要，千万别漏了括号)
        optimizer.zero_grad()
        
        # 4. 追责 (反向传播)
        loss.backward()
        
        # 5. 改脑子 (执行修改)
        optimizer.step()
        pass # 删掉这行，补全上面的 5 步
        # ----------------------------------

        # 打印进度条
        if batch % 100 == 0:
            loss, current = loss.item(), batch * 64 + len(X)
            print(f"进度: Loss: {loss:>7f}  [{current:>5d}/{size:>5d}]")

# ==========================================
# 5. 营业大堂 (代码已写好)
# ==========================================
def test_loop(dataloader, model, loss_fn):
    model.eval() # 开启营业模式
    size = len(dataloader.dataset)
    num_batches = len(dataloader)
    test_loss, correct = 0, 0

    with torch.no_grad(): # 关掉追责探头
        for X, y in dataloader:
            X, y = X.to(device), y.to(device) # 菜也得进微波炉
            pred = model(X)
            test_loss += loss_fn(pred, y).item()
            correct += (pred.argmax(1) == y).type(torch.float).sum().item()

    test_loss /= num_batches
    correct /= size
    print(f"\n晚间营业战报: \n好评准确率: {(100*correct):>0.1f}%, 平均 Loss: {test_loss:>8f} \n")

# ==========================================
# 6. 拉下总闸！开始闭环！
# ==========================================
if __name__ == '__main__':
    # 我们特训大厨 5 天 (Epochs = 5)
    epochs = 10
    print("开始特训大厨，准备见证奇迹...")
    for t in range(epochs):
        print(f"\n=== 第 {t+1} 天特训 ===")
        train_loop(trainloader, net, criterion, optimizer)
        test_loop(testloader, net, criterion)
        
    print("大厨已修成正果！如果想要存盘，随时使用 torch.save！")

```
