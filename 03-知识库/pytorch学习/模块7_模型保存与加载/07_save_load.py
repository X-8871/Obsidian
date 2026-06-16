import torch
from torch import nn

# ==========================================
# 前置准备：定义图纸和造一个假装被训好的大厨
# ==========================================
class NeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.flatten = nn.Flatten()
        self.linear_relu_stack = nn.Sequential(
            nn.Linear(28*28, 512),
            nn.ReLU(),
            nn.Linear(512, 10),
        )
    def forward(self, x):
        return self.linear_relu_stack(self.flatten(x))

# 假设我们在模块 6 里，已经花了三天三夜，把这个大厨训练到了满级！
master_chef = NeuralNetwork()


print("="*60)
print(" 练习 1: 拍脑部 X 光片 (保存记忆)")
print("="*60)
# 任务目标：把 master_chef 的脑部记忆提取出来，存入硬盘！
# 1. 提取脑细胞总名册 (状态字典)：master_chef.state_dict()
# 2. 把提取出来的字典保存进一个叫 'master_weights.pth' 的文件中。
# 提示代码结构：torch.save(你要存的东西, '文件名.pth')

# --- 请在下方写代码 ---
# torch.save(...)
torch.save(master_chef.state_dict(),'master_weights.pth')
# --- 代码结束 ---

print("✅ 大厨记忆已成功存盘！如果不报错，你可以去左边的文件夹里看看有没有多出一个文件！\n")



print("="*60)
print(" 练习 2: 秽土转生之术 (加载复活大厨)")
print("="*60)
# 任务目标：假设现在是第二天重新开机，我们要直接复活一个满级大厨去营业！

# 第一步：根据图纸，重新造一个只会瞎蒙的空壳大厨 (我已经帮你写好了)
zombie_chef = NeuralNetwork()

# 第二步：把昨天保存在硬盘里的记忆读出来，强行灌注给空壳大厨！
# 提示代码结构：zombie_chef.load_state_dict(torch.load('文件名.pth', weights_only=True))

# --- 请在下方写代码 ---
# zombie_chef.load_state_dict(...)
zombie_chef.load_state_dict(torch.load('master_weights.pth',weights_only=True))
# --- 代码结束 ---

print("✅ 记忆灌输完毕，大厨睁开了眼睛！\n")



print("="*60)
print(" 练习 3: 营业前的最后一句神咒 (开启营业模式)")
print("="*60)
# 任务目标：大厨现在就要去测试集接客了。为了防止他做出奇怪的抗压特训动作，请对他念出最后的咒语。
# 提示：调用那个代表着 Evaluation 的开关函数！

# --- 请在下方写代码 ---
# zombie_chef.???
zombie_chef.eval()
# --- 代码结束 ---

print("🎉 完美！大厨已经开启最强稳态营业模式，可以去大堂大杀四方了！\n")
