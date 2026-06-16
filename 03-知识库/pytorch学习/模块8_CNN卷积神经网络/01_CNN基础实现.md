# 01_CNN基础实现

``python
import torch
import torch.nn as nn
import torch.nn.functional as F

print("="*60)
print(" 缁冧範 1: 鑱樿鎷ユ湁鐏溂閲戠潧鐨勫ぇ鍘?(Conv2d)")
print("="*60)
# 浠诲姟鐩爣锛?# 璇峰疄渚嬪寲涓€涓簩缁村嵎绉眰澶у帹銆?# 瑕佹眰锛?# 1. 鎺ユ敹涓€寮犵湡瀹炵殑褰╄壊鍥剧墖 (鎻愮ず锛歩n_channels 鏄嚑锛?
# 2. 鎴戜滑鎯宠浠栨彁鍙栧嚭 6 绉嶄笉鍚岀殑鐗瑰緛鐢婚潰 (out_channels)
# 3. 缁欎粬鍙戜竴涓昂瀵镐负 5x5 鐨勬柟褰㈡斁澶ч暅 (kernel_size)

# --- 璇峰湪涓嬫柟鍐欎唬鐮?---
# conv_chef = nn.Conv2d(...)
conv_chef = nn.Conv2d(in_channels=3,out_channels=6,kernel_size=5)
# --- 浠ｇ爜缁撴潫 ---
# 濡傛灉鍐欏浜嗭紝涓嬩竴琛屼細姝ｅ父鎵撳嵃
print(f"澶у帹鎷涜仒鎴愬姛锛佷粬鐨勯厤缃槸: {conv_chef}")



print("\n" + "="*60)
print(" 缁冧範 2: 浣跨敤鏋侀€熺槮韬硶瀹?(Max Pooling)")
print("="*60)
# 浠诲姟鐩爣锛?# 鎴戜滑鐢ㄤ竴鍫嗛殢鏈哄亣鏁板瓧锛屼吉閫犱簡涓€寮犺鎻愬彇瀹岀壒寰佺殑宸ㄥ瀷鍥剧墖 (澶у皬涓?1x6x32x32)銆?# 璇蜂綘浣跨敤 F.max_pool2d 鎶婂畠鐨勫鍜岄珮缂╁皬涓€鍗婏紒
# 鎻愮ず锛氱浜屼釜鍙傛暟鏄槮韬殑缃戞牸澶у皬锛岄€氬父濉?(2, 2)

fake_image_features = torch.randn(1, 6, 32, 32)
print(f"鐦﹁韩鍓嶏紝鍥剧墖鐨勫舰鐘舵槸: {fake_image_features.shape}")

# --- 璇峰湪涓嬫柟鍐欎唬鐮?---
# shrunken_features = ...
shrunken_features = F.max_pool2d(fake_image_features,(2,2))
# --- 浠ｇ爜缁撴潫 ---
# 濡傛灉鍐欏浜嗭紝浣犱細鐪嬪埌 32x32 鍙樻垚浜?16x16
print(f"鐦﹁韩鍚庯紝鍥剧墖鐨勫舰鐘跺彉鎴愪簡: {shrunken_features.shape}")



print("\n" + "="*60)
print(" 缁冧範 3: 缁勮浣犵殑绗竴鏉?AI 瑙嗚娴佹按绾匡紒")
print("="*60)
# 浠诲姟鐩爣锛?# 鎶婁笂闈㈠鍒扮殑涓滆タ缁勫悎璧锋潵锛屽啓涓€涓瀬绠€鐨?CNN 鍥剧焊 (缁ф壙 nn.Module)銆?# 1. 鍦?__init__ 閲岋紝鍑嗗涓€涓嵎绉眰 (鍚岀粌涔?)銆?# 2. 鍦?forward 閲岋紝璁╂暟鎹?x 鍏堢粡杩囧嵎绉眰锛屽啀鎶逛笂 F.relu 绁炰粰閰辨枡锛屾渶鍚庤繃涓€閬?F.max_pool2d((2,2)) 鐦﹁韩鏈猴紒

class MiniCNN(nn.Module):
    def __init__(self):
        super().__init__()
        # --- 璇峰湪涓嬫柟鍐欎唬鐮?(鍑嗗鍘ㄥ笀) ---
        self.conv1 = nn.Conv2d(in_channels=3,out_channels=6,kernel_size=5)
       

    def forward(self, x):
        # --- 璇峰湪涓嬫柟鍐欎唬鐮?(瀹夋帓娴佹按绾? ---
        x = self.conv1(x)
        x = F.relu(x)
        x = F.max_pool2d(x,(2,2))
        return x

# 妫€楠屾祦姘寸嚎鏄惁閫氱晠
my_net = MiniCNN()
dummy_x = torch.randn(1, 3, 32, 32) # 涓€寮犲亣鐨?32x32 褰╄壊鍥剧墖
output = my_net(dummy_x)
print(f"\n鏁存潯娴佹按绾胯窇閫氫簡锛佹渶缁堝悙鍑虹殑鏁版嵁褰㈢姸鏄? {output.shape}")

``
