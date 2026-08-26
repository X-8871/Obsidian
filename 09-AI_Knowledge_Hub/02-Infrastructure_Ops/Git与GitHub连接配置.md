---
type: infra-guide
domain: git-github-ops
status: active
created: 2026-08-26
tags: [Git, GitHub, SSH, Proxy, DevOps, Infrastructure]
---

# 🐙 Git 与 GitHub 连接与网络配置指南

> [!NOTE]
> 本文件沉淀了 Git 与 GitHub 在本地与云端环境下的连接、认证、代理加速与常见排障方案，供所有项目通过 `[[Git与GitHub连接配置]]` 双链复用。

---

## 一、 基础认证与 SSH 免密连接

### 1. 本地全局用户信息配置
```bash
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱@domain.com"
# 保持换行符在 Windows 下自动转换 (CRLF -> LF)
git config --global core.autocrlf true
```

### 2. 生成与配置 Ed25519 SSH 密钥（推荐）
```bash
# 生成高强度 Ed25519 密钥
ssh-keygen -t ed25519 -C "你的邮箱@domain.com" -f ~/.ssh/id_ed25519_github

# 查看并复制公钥（Windows PowerShell）
Get-Content ~/.ssh/id_ed25519_github.pub
```
> **配置步骤**：登录 GitHub $\rightarrow$ `Settings` $\rightarrow$ `SSH and GPG keys` $\rightarrow$ `New SSH key` $\rightarrow$ 粘贴公钥。

### 3. 本地 SSH 配置文件优化 (`~/.ssh/config`)
```ssh
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    PreferredAuthentications publickey
    # 保持长连接防掉线
    ServerAliveInterval 60
```

### 4. 验证 SSH 连通性
```bash
ssh -T git@github.com
# 成功回显: Hi username! You've successfully authenticated...
```

---

## 二、 网络代理与连接加速 (针对国内网络环境)

### 1. 为 Git 配置本地 HTTP/Socks5 代理
```bash
# 设置 HTTP/HTTPS 代理 (假设本地代理端口为 7890)
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 2. 为 SSH 连接配置代理 (`~/.ssh/config`)
若 SSH 端口被阻断，可通过 `connect.exe`（Git 自带）在 SSH 配置中加入代理：
```ssh
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    ProxyCommand connect -H 127.0.0.1:7890 %h %p
```

---

## 三、 常用远程仓库操作命令

```bash
# 查看当前远程地址
git remote -v

# 将远程 HTTPS 地址切换为 SSH 地址 (推荐)
git remote set-url origin git@github.com:username/repository.git

# 关联新的远程仓库
git remote add origin git@github.com:username/repository.git
```

---

## 四、 常见故障排查 Q&A

| 常见错误现象 | 根本原因 | 标准解决方案 |
| :--- | :--- | :--- |
| `Permission denied (publickey)` | 密钥未被 GitHub 识别或本地未加载对应私钥 | 执行 `ssh-add ~/.ssh/id_ed25519_github` 或检查 `~/.ssh/config` 路径 |
| `OpenSSL SSL_read: Connection was reset` | 国内直连网络被阻断或握手失败 | 开启本地代理并配置 `git config --global http.proxy` |
| `Failed to connect to github.com port 443` | 本地代理端口配置错误或代理客户端未启动 | 检查本地代理端口是否匹配，或使用 `git config --global --unset http.proxy` 取消 |
