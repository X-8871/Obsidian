# 第四章：train.py 训练循环

## 数据流

~~~text
取一批 x、targets
  ↓
model(x, targets)
  ↓
logits + cross entropy loss
  ↓ loss.backward()
参数梯度 parameter.grad
  ↓ optimizer.step()
更新模型参数
  ↓ optimizer.zero_grad()
清空梯度
~~~

## 关键概念

- targets 是每个位置正确的下一个字符编号。
- logits 形状是 (B,T,V)，交叉熵需要 (样本数,类别数)，所以使用 logits.view(-1, logits.size(-1)) 展平 B 和 T。
- targets 同样使用 targets.view(-1) 变成 (样本数,)。
- loss.backward() 根据 loss 计算每个参数的梯度。
- parameter.grad 中的 grad 是 gradient（梯度），保存该参数当前反向传播得到的梯度。
- optimizer.step() 根据梯度和学习率更新参数。
- optimizer.zero_grad() 防止上一轮梯度混入下一轮。
- AdamW（Adaptive Moment Estimation with Decoupled Weight Decay，带解耦权重衰减的自适应矩估计）负责更新参数。
- GradScaler（Gradient Scaler，梯度缩放器）用于混合精度训练，保护 FP16（16 位浮点数）梯度中的小数值不下溢。

## 用户已完成的梯度实验

~~~text
after_backward_grad_is_none=False
grad_norm=8.567618
after_step_param_changed=True
after_zero_grad_is_none=True
~~~

结论：反向传播确实产生了梯度，优化器确实改变了参数，清零后梯度变为空。

## 真实代码

~~~text
D:/FPGA/NanoGPT/nanogpt-zynq-backups-main/python/nanoGPT/train.py
~~~
