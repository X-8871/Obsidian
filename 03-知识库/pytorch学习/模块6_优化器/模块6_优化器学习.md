# 模块 6：优化模型参数 (Optimization)

在模块 5 里，我们讲到了一个极其关键的断层点：品菜师发脾气了，追责单（梯度）也算出来了，并且塞进了大厨的口袋里（`w.grad`）。
但是，大厨脑子里那个难吃的菜谱（参数 `w`）自己是不会变的。

今天，我们要请出深度学习里的最后一位核心大咖——**主教练（Optimizer，优化器）**。
主教练的作用，就是强行把大厨按在椅子上，翻开他的菜谱，对照着口袋里的追责单，**一笔一划地帮他涂改菜谱**。

当我们把所有的步骤连在一起，并在每天（Epoch）反复执行这个过程，就形成了一个伟大闭环：**训练循环 (Training Loop)**。

---

## 1. 训练前的准备：设定超参数 (Hyperparameters)

在开始训练之前，老板（你）需要定下三个非常重要的规矩。这些规矩不参与做菜，但决定了大厨的成长速度。它们被称为**超参数**：

1. **`epochs` (迭代次数)**：大厨要在后厨被特训多少天？（整个数据集要被反复刷多少遍）
2. **`batch_size` (批量大小)**：每次传菜员端给大厨炒的数据量是多少？（比如每次炒 64 个数据）
3. **`learning_rate` (学习率)**：主教练每次帮大厨改菜谱时，下笔的力度有多重？
   - 力度太大（1.0）：大厨可能从“太咸”直接矫枉过正变成了“完全没味道”。
   - 力度太小（0.00001）：大厨每次只减一粒盐，练到死也成不了神厨。
   - 一般我们会给一个类似 `1e-3` (0.001) 的温和力度。

```python
learning_rate = 1e-3
batch_size = 64
epochs = 5
```

---

## 2. 请出两大主管：品菜师与主教练

大厨 (`model`) 已经就位了。现在我们需要聘请两大主管：
1. **品菜师 (Loss Function)**：负责打分。我们用上节课学到的交叉熵 `nn.CrossEntropyLoss`。
2. **主教练 (Optimizer)**：负责改菜谱。有很多种性格的教练，比如 `SGD`（稳扎稳打的传统教练）或者 `Adam`（极其聪明的现代教练）。你需要把大厨的脑子（`model.parameters()`）全权交给教练管理，并告诉教练学习率是多少。

```python
# 聘请品菜师
loss_fn = nn.CrossEntropyLoss()

# 聘请 SGD 教练 (Stochastic Gradient Descent)
optimizer = torch.optim.SGD(model.parameters(), lr=learning_rate)
```

---

## 3. 最伟大的循环：Train Loop (训练循环) 的标准 5 步曲

这就是你在整个深度学习生涯中，每天都会写的极其固定的 5 步代码。雷打不动！

在开始这 5 步之前，我们要先向主教练保证，传菜员把数据分批端上来了：
```python
def train_loop(dataloader, model, loss_fn, optimizer):
    # 遍历 dataloader 里每一批 64 个的数据 (X: 图像, y: 标签)
    for batch, (X, y) in enumerate(dataloader):
        
        # --- 训练 5 步曲 开始 ---
        
        # 1. 大厨做菜 (Forward pass)
        pred = model(X)
        
        # 2. 品菜师打分 (Compute Loss)
        loss = loss_fn(pred, y)
        
        # 3. 撕掉旧的追责单 (Zero Gradients) ⚠️极其重要
        optimizer.zero_grad() 
        
        # 4. 追责系统算出新的责任值 (Backward pass)
        loss.backward()
        
        # 5. 主教练动手涂改菜谱！(Update Weights)
        optimizer.step()
        
        # --- 训练 5 步曲 结束 ---
```

### 深入灵魂的拷问：为什么要有第 3 步 `optimizer.zero_grad()`？
假设昨天大厨炒菜太咸了，口袋里塞了一张追责单（盐多放了 10 克）。
如果今天大厨炒菜变淡了，追责系统会算出新的追责单（盐少放了 5 克）。
**但是！PyTorch 的口袋（`.grad`）设计得非常奇葩：它是累加的！**
如果不先把昨天的纸条撕掉清零，PyTorch 就会把今天和昨天的算在一起：`10 + (-5) = 5`，导致主教练以为今天还是多放了 5 克盐！
所以，主教练在算新账之前，必须大吼一声：`optimizer.zero_grad()`，**清空过去所有的追责记录！** 然后再执行第 4 步算新账。

### 压轴动作：第 5 步 `optimizer.step()`
这一步就是奇迹发生的瞬间。主教练拿着第 4 步刚刚算出来的追责单，走向大厨，真刀真枪地修改了 `w` 和 `b` 的数值。大厨的厨艺在这一刻，得到了实质性的提升！

---

## 4. 营业考核：Test Loop (测试/评估循环)

大厨白天在后厨被狂训一顿后，晚上总要去大堂实战营业一下，看看面对没有见过的菜单，做得怎么样。
这就需要我们在每特训完一整天（一个 epoch）后，跑一遍 `test_loop`。

在测试大堂里，**不需要主教练，不需要追责系统**。大厨只管炒菜，品菜师只管打分和统计好评率。
（注意看，这里用到了你在上一章学到的省电神咒！）

```python
def test_loop(dataloader, model, loss_fn):
    # 准备记事本：总共有几个顾客？好评的有几个？总分数是多少？
    size = len(dataloader.dataset)
    num_batches = len(dataloader)
    test_loss, correct = 0, 0

    # 关掉探头，准备营业！省电省内存！
    with torch.no_grad():
        for X, y in dataloader:
            # 1. 大厨做菜
            pred = model(X)
            # 2. 统计所有难吃的分数累加起来
            test_loss += loss_fn(pred, y).item()
            # 3. 统计一下大厨究竟做对了多少道菜 (找出得分最高的种类，和标准答案比对)
            correct += (pred.argmax(1) == y).type(torch.float).sum().item()

    # 算一下平均好评率和平均分
    test_loss /= num_batches
    correct /= size
    print(f"营业战报: \n 好评率: {(100*correct):>0.1f}%, 平均分 Loss: {test_loss:>8f} \n")
```

---

## 总结
将所有的东西拼合在一起，每天的生活就是：
```python
for t in range(epochs):
    print(f"=== 第 {t+1} 天特训 ===")
    train_loop(train_dataloader, model, loss_fn, optimizer) # 在后厨挨骂改进
    test_loop(test_dataloader, model, loss_fn)              # 在大堂实战考核
print("大厨终于成为了食神！")
```

**阅读完毕后，请随时提问！**
（比如：`zero_grad()` 为什么是 PyTorch 最容易踩坑的地方？为什么测试循环里要除以 `num_batches`？）
**如果觉得彻底通透了，请告诉我“完全学会了”，我会把之前所有的拼图合并成一个终极实战演练题！**

---

## 5. Q&A 补充精华（基于你的深度提问）

在我们的互动中，我们理清了许多让新手抓狂的底层代码逻辑：

### 5.1 `model.parameters()` 到底是什么？
神经网络（大厨）肚子里往往包含着成百上千个极其微小的权重 `w` 和偏置 `b`。当我们把模型交给主教练 `Optimizer` 时，我们不可能手动把每个参数的名字列出来。`model.parameters()` 就是干爹 `nn.Module` 赋予大厨的“脑细胞总控制清单”。主教练拿到这本花名册，就能在执行 `step()` 时，瞬间批量修改全网络所有的脑细胞数值。

### 5.2 拆解 `for batch, (X, y) in enumerate(dataloader):`
这是一句经典的 Python 拆快递代码：
*   **`dataloader`**：一列装满盲盒的火车，每节车厢装着一锅菜的量（比如 64 份）。
*   **`for (X, y) in dataloader`**：把车厢一节一节卸下来，分别倒入生肉盆 `X` 和标准答案盆 `y`。
*   **`enumerate()` 与 `batch`**：官方计步器。乘务员不仅卸货，还会顺带塞给你一个序号牌 `batch`（当前是第 0 锅、第 1 锅...），主要用来方便打印进度条。

### 5.3 抽象的形参与实参：`dataloader` 从哪来？
在 `def train_loop(dataloader, ...)` 中，`dataloader` 只是一个占位符（职位说明书里的名字）。它在此时并不真实存在。真正造出它是我们在模块 2 里写的 `train_dataloader = DataLoader(...)`。当最后我们写出 `train_loop(train_dataloader, ...)` 时，才是真正把干活的“人”塞进了这个坑位里执行任务。

### 5.4 营业记账的艺术（Test Loop 核心代码拆解）
在算准确率的代码 `(pred.argmax(1) == y).type(torch.float).sum().item()` 中：
1.  **`argmax(1)`**：大厨给出的猜测号码。
2.  **`== y`**：和正确答案比对，生成一堆 `[True, False, True...]` 的小盘子。
3.  **`.type(torch.float)`**：把 `True` 变成 `1.0`，`False` 变成 `0.0`。
4.  **`.sum()`**：加在一起，算出这一锅 64 道菜里到底做对了多少道（比如对了 60 道）。
5.  **`.item()`**：极其关键！脱去张量外壳变成纯数字。如果不写这个，总记分牌会连带张量复杂的后台记录一起越变越大，最终撑爆显存！
