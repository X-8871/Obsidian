import torch
from torch import nn

print("="*60)
print(" 练习 1: 画图纸 (搭建你自己的神经网络类)")
print("="*60)
# 任务目标：
# 请模仿文档，写一个名为 MySimpleNet 的神经网络类，必须继承 nn.Module。
# 要求：
# 1. 包含一个压面机 (nn.Flatten)
# 2. 包含一个名叫 my_pipeline 的传送带 (nn.Sequential)，里面按顺序放上：
#    - 第一个厨师：接收 28*28 的面条，吐出 128 根
#    - 第一瓶酱料：ReLU
#    - 第二个厨师：接收 128 根面条，吐出 10 个打分
# 3. 写好 forward 函数，让输入 x 先过压面机，再过传送带，最后返回 logits

# --- 请在下方写代码 ---
class MySimpleNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.flaten=nn.Flatten()
        self.my_pipeline =nn.Sequential(
            nn.Linear(28*28,128),
            nn.ReLU(),
            nn.Linear(128,10)

        )
    def forward(self,x):
        x=self.flaten(x)
        logits=self.my_pipeline(x)
        return logits
        

        # 你的代码: self.flatten = ...
        # 你的代码: self.my_pipeline = ...
      

        
# --- 代码结束 ---


print("\n" + "="*60)
print(" 练习 2: 招募大厨并查看透视图")
print("="*60)
# 任务目标：
# 1. 把上面画好图纸的 MySimpleNet 造出来（实例化），赋值给变量 model
# 2. 打印 (print) 这个 model，看看是不是和你想象的结构一样

# --- 请在下方写代码 ---
model = MySimpleNet()
print(model)


# --- 代码结束 ---


print("\n" + "="*60)
print(" 练习 3: 试吃环节 (推理与百分比转换)")
print("="*60)
# 任务目标：
# 1. 我们凭空捏造一张图片： fake_image = torch.rand(1, 28, 28)
# 2. 请把这张假图片喂给大厨，拿到他做出的 10 个原始打分 (命名为 logits)
# 3. 请用 nn.Softmax(dim=1) 把 logits 变成百分比概率 (命名为 pred_probab)
# 4. 请用 .argmax(1) 从百分比中挑出最高概率的座位号 (命名为 y_pred)
# 5. 打印 y_pred 的纯数字值 (记得用 .item())

fake_image = torch.rand(1, 28, 28)

# --- 请在下方写代码 ---
logits = model(fake_image)
pred_probab =  nn.Softmax(dim=1)(logits)
y_pred = pred_probab.argmax(1)
print(f"模型瞎猜的类别是: {y_pred.item()}")


# --- 代码结束 ---
