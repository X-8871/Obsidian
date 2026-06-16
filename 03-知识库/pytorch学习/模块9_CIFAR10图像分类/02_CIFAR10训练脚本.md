# 02_CIFAR10训练脚本

``python
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms

print("="*60)
print(" 缁堟瀬鍐虫垬锛氳缁?CIFAR-10 鍥惧儚璇嗗埆 AI")
print("="*60)

# ==========================================
# 1. 鎺㈠寰尝鐐?(GPU) 涓庢暟鎹姞杞?# ==========================================
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"馃専 褰撳墠鐐间腹鐐夌姸鎬? {device} 馃専\n")

# CIFAR10 鐨勬暟鎹澶勭悊 (杞负寮犻噺骞舵爣鍑嗗寲棰滆壊)
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
])

print("姝ｅ湪涓嬭浇/鍔犺浇 CIFAR-10 鏁版嵁闆?(澶ф闇€瑕佸崄鍑犵)...")
trainset = torchvision.datasets.CIFAR10(root='./data', train=True, download=True, transform=transform)
trainloader = torch.utils.data.DataLoader(trainset, batch_size=64, shuffle=True)

testset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True, transform=transform)
testloader = torch.utils.data.DataLoader(testset, batch_size=64, shuffle=False)

# ==========================================
# 2. 瀹氫箟娣卞眰鍗风Н绁炵粡缃戠粶 (澶у帹鍥剧焊)
# ==========================================
class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 6, 5)   # 绗竴涓斁澶ч暅
        self.pool = nn.MaxPool2d(2, 2)    # 鐦﹁韩鏈?        self.conv2 = nn.Conv2d(6, 16, 5)  # 绗簩涓斁澶ч暅
        self.fc1 = nn.Linear(16 * 5 * 5, 120) # 鍘嬫墎鍚庣殑鑻﹀姏1
        self.fc2 = nn.Linear(120, 84)         # 鑻﹀姏2
        self.fc3 = nn.Linear(84, 10)          # 鏈€缁堟墦鍒?(10涓被鍒?

    def forward(self, x):
        # 鍏稿瀷鐨?CNN 娴佹按绾匡細鍗风Н -> 閰辨枡 -> 姹犲寲鐦﹁韩
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1) # 鎶婂浘鐗囧交搴曞帇鎵佹垚闈㈡潯
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = self.fc3(x)         # 鏈€鍚庝竴灞備笉瑕佸姞 ReLU锛佺洿鎺ヨ緭鍑虹敓鎵撳垎(Logits)
        return x

# ==========================================
# 3. 鑱樿澶у帹鍜屼富绠★紝骞跺杩涘井娉㈢倝锛?# ==========================================
net = Net()
net.to(device) # 鎶婂ぇ鍘ㄥ己琛屽杩?GPU

criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(net.parameters(), lr=0.001, momentum=0.9) # 鍔犲己鐗堟暀缁?
# ==========================================
# 4. 鍚庡帹璁粌杞﹂棿 (闇€瑕佷綘琛ュ叏 5 姝ユ洸)
# ==========================================
def train_loop(dataloader, model, loss_fn, optimizer):
    model.train() # 寮€鍚缁冪壒璁ā寮?    size = len(dataloader.dataset)
    
    for batch, (X, y) in enumerate(dataloader):
        # 銆愰噸瑕侊紒銆戞妸浼犺彍鍛樼涓婃潵鐨勮彍锛屼篃鎵旇繘寰尝鐐夐噷锛?        X, y = X.to(device), y.to(device)
        
        # ----------------------------------
        # 馃憞 璇峰湪杩欓噷榛樺啓鏋佸叾绁炲湥鐨?5 姝ユ洸鍙ｈ瘈 馃憞
        # ----------------------------------
        # 1. 鍋氳彍
        pred = model(X)
        
        # 2. 绠楀垎
        loss = loss_fn(pred,y)
        
        # 3. 鎾曟棫璐︽湰 (鏋佸叾閲嶈锛屽崈涓囧埆婕忎簡鎷彿)
        optimizer.zero_grad()
        
        # 4. 杩借矗 (鍙嶅悜浼犳挱)
        loss.backward()
        
        # 5. 鏀硅剳瀛?(鎵ц淇敼)
        optimizer.step()
        pass # 鍒犳帀杩欒锛岃ˉ鍏ㄤ笂闈㈢殑 5 姝?        # ----------------------------------

        # 鎵撳嵃杩涘害鏉?        if batch % 100 == 0:
            loss, current = loss.item(), batch * 64 + len(X)
            print(f"杩涘害: Loss: {loss:>7f}  [{current:>5d}/{size:>5d}]")

# ==========================================
# 5. 钀ヤ笟澶у爞 (浠ｇ爜宸插啓濂?
# ==========================================
def test_loop(dataloader, model, loss_fn):
    model.eval() # 寮€鍚惀涓氭ā寮?    size = len(dataloader.dataset)
    num_batches = len(dataloader)
    test_loss, correct = 0, 0

    with torch.no_grad(): # 鍏虫帀杩借矗鎺㈠ご
        for X, y in dataloader:
            X, y = X.to(device), y.to(device) # 鑿滀篃寰楄繘寰尝鐐?            pred = model(X)
            test_loss += loss_fn(pred, y).item()
            correct += (pred.argmax(1) == y).type(torch.float).sum().item()

    test_loss /= num_batches
    correct /= size
    print(f"\n鏅氶棿钀ヤ笟鎴樻姤: \n濂借瘎鍑嗙‘鐜? {(100*correct):>0.1f}%, 骞冲潎 Loss: {test_loss:>8f} \n")

# ==========================================
# 6. 鎷変笅鎬婚椄锛佸紑濮嬮棴鐜紒
# ==========================================
if __name__ == '__main__':
    # 鎴戜滑鐗硅澶у帹 5 澶?(Epochs = 5)
    epochs = 10
    print("寮€濮嬬壒璁ぇ鍘紝鍑嗗瑙佽瘉濂囪抗...")
    for t in range(epochs):
        print(f"\n=== 绗?{t+1} 澶╃壒璁?===")
        train_loop(trainloader, net, criterion, optimizer)
        test_loop(testloader, net, criterion)
        
    print("澶у帹宸蹭慨鎴愭鏋滐紒濡傛灉鎯宠瀛樼洏锛岄殢鏃朵娇鐢?torch.save锛?)

``
