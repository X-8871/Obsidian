---
type: project-runbook
domain: ai-tool
project: codex
status: active
created: 2026-09-02
updated: 2026-09-02
tags:
  - Codex
  - OpenAI
  - Runbook
  - Windows
  - 网络代理
  - 故障排查
---

# Codex 网络代理连接 维护说明

> [!INFO] 一句话定位
> 解决本机 Codex（桌面版/CLI）在开启代理环境下"反复重连五次才应答 / 401 权限不足"的问题。正确终态包含两点：启用 `respect_system_proxy = true`，并移除或不启用错误的 `openai_http` provider。

## 症状

- 每条问答前出现 `Reconnecting 1/5 … 5/5`，等待数十秒后才出结果；
- 修复过程一度出现 `401 Unauthorized: Missing scopes: api.responses.write`（url 为 `api.openai.com/v1/responses`，cf-ray 落在东京 NRT 节点）。

## 有效配置（2026-09-02 终态）

文件：`C:\Users\22061\.codex\config.toml`（改动前备份 `config.toml.bak-20260902-1721`）

适用版本：本机 Codex CLI `0.152.1`；桌面版 `26.831.2377.0`。

```toml
[features]
js_repl = false
respect_system_proxy = true
```

当前不应存在任何自定义 provider。使用默认 `openai` provider：在本机 Codex CLI `0.152.1` 的 ChatGPT 登录态下，请求 `chatgpt.com/backend-api/codex`，经系统代理（`http://127.0.0.1:65532`）出网。

## 根因（两层，缺一不可）

> [!warning] L1 · 不走代理
> Codex 默认 `respect system proxy = disabled` 且不读代理环境变量。在本机当时的网络环境中，直连 `api.openai.com` 实测约 21s 超时，随后反复重试，表现为"重连五次才正常"。具体时长会随网络环境变化。

> [!danger] L2 · 曾误加自定义 provider（已回退）
> 曾新增 `[model_providers.openai_http]` 且 `base_url = "https://api.openai.com/v1"`，与 ChatGPT OAuth 登录不匹配，导致令牌被发往无权端点 → 持续 401 "Missing scopes"。
> **本机版本的关键事实**：ChatGPT 账号登录的请求端点是 `chatgpt.com/backend-api/codex`；`api.openai.com/v1` 用于 API Key 场景，不应作为本机 ChatGPT OAuth provider 的 `base_url`。

## 验证方法

1. 完全退出并重启 Codex 后，连续多轮问答（建议 5–10 轮，含长任务）：无 401、无 `Reconnecting` 才可判定通过。单次成功不构成充分验证；
2. 传输核验：
   ```powershell
   @'
   import sqlite3
   uri = "file:///C:/Users/22061/.codex/logs_2.sqlite?mode=ro"
   with sqlite3.connect(uri, uri=True) as db:
       print("integrity_check=", db.execute("PRAGMA integrity_check").fetchone()[0])
       print("logs_count=", db.execute("SELECT COUNT(*) FROM logs").fetchone()[0])
       for keyword in ("401", "missing scopes", "reconnecting", "responses_websocket", "responses_http", "api.openai.com", "chatgpt.com"):
           count = db.execute("SELECT COUNT(*) FROM logs WHERE lower(coalesce(feedback_log_body, '')) LIKE ?", (f"%{keyword}%",)).fetchone()[0]
           print(f"{keyword!r}=", count)
   '@ | python -
   ```
   `logs_2.sqlite` 为空时，只能记录为“无日志证据”，不能据此判定最近会话没有错误。
3. CLI 诊断：`codex doctor --ascii --no-color`，重点查看 `Configuration`、`auth` 和 `Connectivity` 段；整体汇总中的线程索引、终端或 Defender 警告不等同于网络修复失败。

## 排查工具箱

```bash
# 自检（配置/认证/连通性）
codex doctor --ascii --no-color
# 直连 vs 走系统代理对比（直连应超时；代理应快速返回 HTTP 403/405 等可达性结果）
curl.exe --noproxy '*' -sS -o NUL --connect-timeout 8 --max-time 12 -w "HTTP=%{http_code} total=%{time_total}s\n" https://chatgpt.com/backend-api/codex
curl.exe --proxy http://127.0.0.1:65532 -sS -o NUL --connect-timeout 8 --max-time 12 -w "HTTP=%{http_code} total=%{time_total}s\n" https://chatgpt.com/backend-api/codex
# 读系统代理（reg 被安全策略禁用时用 python winreg）
@'
import winreg
path = r'Software\Microsoft\Windows\CurrentVersion\Internet Settings'
with winreg.OpenKey(winreg.HKEY_CURRENT_USER, path) as key:
    for name in ('ProxyEnable', 'ProxyServer', 'ProxyOverride'):
        try:
            print(name, winreg.QueryValueEx(key, name)[0])
        except FileNotFoundError:
            print(name, '<missing>')
'@ | python -
```

## 关键教训

1. **端点必须与认证方式匹配**：对本机 Codex CLI `0.152.1`，ChatGPT OAuth → `chatgpt.com/backend-api/codex`；API Key → `api.openai.com/v1`。自定义 provider 的 base_url 选错宿主，会以 401 "Missing scopes" 暴露；
2. **首次实测正常 ≠ 修复正确**：间歇性成功会掩盖错误的端点和凭据组合，验证要连续多轮；
3. **运行中的 Codex 会回写 `config.toml`**：修改前必须完全退出 Codex（托盘 Quit / 任务管理器结束 Codex 桌面进程），否则改动会被覆盖；
4. **TOML 表头吞键**：若存在自定义 provider，应将 `[model_providers.xxx]` 放在文件末尾，避免其后本应属于顶层的键（如 personality/service_tier/notify）被解析到该表。改完用 tomllib 校验顶层键归属；
5. **`reg`/`wmic` 被本机安全策略禁用**，读注册表改用 `python winreg`。

## 回滚

```bash
cd C:/Users/22061/.codex
cp config.toml.bak-20260902-1721 config.toml   # 恢复改动前配置
# 完全退出并重启 Codex
```

Windows PowerShell：

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
# 如需保留当前状态，先复制一份带时间戳的回滚前配置
Copy-Item -LiteralPath 'C:\Users\22061\.codex\config.toml' -Destination "C:\Users\22061\.codex\config.toml.before-rollback-$stamp" -Force
Copy-Item -LiteralPath 'C:\Users\22061\.codex\config.toml.bak-20260902-1721' -Destination 'C:\Users\22061\.codex\config.toml' -Force
python -c "import tomllib; tomllib.load(open(r'C:\Users\22061\.codex\config.toml','rb')); print('tomllib=OK')"
# 完全退出并重启 Codex，然后重新执行 codex doctor
```

备份文件当前 SHA-256：`893f39b5d9e713a2a056d187915b123083c1793a5839d1422017f5ac01a3649a`（2026-09-02 复核读取）。

## 验证边界

- `codex doctor` 能证明当前配置已加载、认证模式和 inference URL 匹配，并能做即时连通性检查；不能替代长时间、多轮真实会话。
- `auth.json` 含敏感令牌，不要直接打印或提交；当前版本 `codex auth whoami` 不可用时，以 doctor 的 `stored auth mode`、`stored API key` 和 `stored ChatGPT tokens` 为准。
- `logs_2.sqlite` 没有记录时，运行结论应写为“证据不足”，不要把空日志解释成“无错误”。

## 相关

- [[Codex-Skills-MCP-本机清单]]
- 完整排查报告：桌面《Codex网络重连问题解决报告_2026-09-02.md》（含两层根因证据、改动清单、速度影响评估）
