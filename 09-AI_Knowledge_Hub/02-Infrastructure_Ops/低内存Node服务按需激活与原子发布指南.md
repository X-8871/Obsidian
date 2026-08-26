---
type: infra-guide
domain: node-systemd-socket-ops
status: active
created: 2026-08-26
updated: 2026-08-26
tags:
  - Node.js
  - systemd
  - Socket-Activation
  - Nginx
  - Atomic-Deploy
  - Low-Memory
---

# 低内存 Node 服务按需激活与原子发布指南

> [!NOTE]
> 本文沉淀适用于小内存 Linux 主机的通用模式：Nginx 对外提供 HTTPS，systemd socket 常驻监听 loopback，Node 服务首次请求时启动，空闲后自行退出；应用使用 release 目录与 `current` 软链接原子发布。

## 一、连接信息表与适用边界

| 配置项 | 通用取值 | 说明 |
|---|---|---|
| 服务器 | `<server-host>` | 使用项目既有 SSH 主机或别名，不在文档记录私钥内容 |
| SSH 用户 | `<non-root-user>` | 通过 `sudo` 管理 systemd 与 Nginx |
| 公网入口 | `https://<domain>/<api-prefix>/` | 只由 Nginx 暴露 HTTPS |
| 应用监听 | `127.0.0.1:<loopback-port>` | 禁止直接监听公网地址 |
| systemd 单元 | `<app>.socket`、`<app>.service` | socket enabled；service 通常为 static |
| 发布根目录 | `/opt/<org>/<app>/releases/<timestamp>` | 每个版本不可变，保留至少一个回滚版本 |
| 当前版本 | `/opt/<org>/<app>/current` | 指向 release 的原子软链接 |
| 数据目录 | `/srv/<org>/<app>` | 与应用 release 分离，不随发布覆盖 |
| 环境文件 | `/etc/<org>/<app>.env` | root 所有、`600` 权限、禁止入 Git |

### 适用条件

- 服务请求频率不高，但需要 HTTPS API 随时可唤醒。
- 同机存在更高优先级的常驻业务，需要限制 Node 内存占用。
- 服务能在空闲时主动关闭监听服务器并正常退出。
- 数据写入使用独立持久目录，应用代码可按 release 发布。

不适合长连接持续在线、常驻队列消费、内存中状态不可恢复或冷启动不可接受的服务。

## 二、常用运维命令

### 2.1 安装与启用

```bash
sudo install -m 0644 deploy/<app>.socket /etc/systemd/system/<app>.socket
sudo install -m 0644 deploy/<app>.service /etc/systemd/system/<app>.service
sudo systemctl daemon-reload
sudo systemctl enable --now <app>.socket
```

不要 enable 一个没有 `[Install]` 的 service。socket activation 的常见基线是：socket `enabled/active`，service `static/inactive`。

### 2.2 状态、健康与日志

```bash
systemctl is-enabled <app>.socket
systemctl is-active <app>.socket
systemctl is-active <app>.service || true
ss -ltn '( sport = :<loopback-port> )'

# 本机健康请求应触发 service
curl --fail http://127.0.0.1:<loopback-port>/health
systemctl is-active <app>.service

journalctl -u <app>.service -n 100 --no-pager
systemctl show <app>.service -p MainPID -p MemoryCurrent -p MemoryHigh -p MemoryMax
```

### 2.3 暂停与恢复

```bash
# 暂停：先停止 socket，避免新连接再次激活 service
sudo systemctl stop <app>.socket <app>.service

# 恢复：只启动 socket
sudo systemctl start <app>.socket
```

`stop` 不等于 `disable`。临时维护窗口通常保留 socket 的 enabled 状态；只有明确要求禁止开机恢复时才 disable。

### 2.4 Nginx 变更

```bash
sudo cp /etc/nginx/sites-available/<site> /etc/nginx/sites-available/<site>-backup-<timestamp>
sudo nginx -t
sudo systemctl reload nginx
```

必须在编辑后再次执行 `nginx -t`，只有成功才 reload。不要为一个 location 变更 restart Nginx 或其他无关服务。

大文件代理常用基线：

```nginx
location /<api-prefix>/ {
    client_max_body_size <limit>;
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_pass http://127.0.0.1:<loopback-port>/;
}
```

注意 `proxy_pass` 的尾斜杠会移除匹配的 location 前缀。应用路由、集成测试和 curl 必须以实际转发后的路径为准。

## 三、核心目录、运行拓扑与原子发布

### 3.1 拓扑

```mermaid
flowchart LR
    C[客户端] -->|HTTPS| N[Nginx]
    N -->|loopback| S[systemd socket]
    S -->|首次连接传递 FD| A[Node service]
    A --> D[/srv 持久数据]
    A --> E[/etc 环境文件]
    A --> R[current -> releases/时间戳]
    A -->|空闲超时| X[正常退出]
    S -->|继续监听| A
```

### 3.2 目录约束

```text
/opt/<org>/<app>/
├── releases/
│   ├── <previous-timestamp>/
│   └── <new-timestamp>/
└── current -> releases/<new-timestamp>

/srv/<org>/<app>/          # 数据、对象、SQLite、staging
/etc/<org>/<app>.env       # 600，禁止打印
```

- release 目录只放代码和生产依赖；数据、日志和秘密不得复制进 release。
- systemd 的 `ReadWritePaths` 只开放必要持久目录；推荐启用 `NoNewPrivileges`、`ProtectSystem=strict`、`ProtectHome=true`、`PrivateTmp=true`。
- Node 堆上限必须低于 systemd `MemoryMax`，给 native 模块、Buffer、SQLite 和运行时保留空间。

### 3.3 原子发布步骤

1. 本地完成测试、构建和依赖锁文件核对。
2. 在服务器创建新的时间戳 release，不覆盖 `current` 指向的旧版本。
3. 上传归档并校验 SHA-256；在 release 内安装生产依赖和构建。
4. 核对入口真实位置。TypeScript 项目常见产物可能是 `dist/src/index.js`，不能凭经验假设为 `dist/index.js`。
5. 使用同目录临时软链接加 `mv -T` 或等价原子方式切换 `current`。
6. 启动 socket，执行本机健康检查、公网检查、日志和内存检查。
7. 等待超过空闲超时，确认 service 退出但 socket 仍 active。
8. 保留旧 release 与 Nginx 备份，验收完成后再按保留策略清理。

### 3.4 回滚

```bash
# 示意：先解析并人工核对目标 release，再原子切回
readlink -f /opt/<org>/<app>/current
sudo ln -sfn /opt/<org>/<app>/releases/<previous-timestamp> /opt/<org>/<app>/current.next
sudo mv -Tf /opt/<org>/<app>/current.next /opt/<org>/<app>/current
sudo systemctl restart <app>.service
```

回滚前必须确认绝对路径位于预期 `/opt/<org>/<app>/releases/` 内。若 Nginx 变更也有问题，恢复备份并在 `nginx -t` 成功后 reload。

## 四、常见网络与故障排查 Q&A

| 问题 | 判断与处理 |
|---|---|
| service 显示 inactive，是否故障？ | socket active 且端口监听时通常是正常空闲态；发健康请求验证能否按需启动。 |
| socket 和 service 都 inactive？ | 服务被人工暂停或 socket 启动失败。先查 `is-enabled`、journal 和端口，再按维护授权启动 socket。 |
| 公网 502，但静态网站正常？ | Nginx 到 loopback 上游不可达。核对 socket、端口、service journal 和 location 的 `proxy_pass`。 |
| 请求触发 service 后立即退出？ | 检查应用是否正确接收 systemd 传入的监听 FD，以及空闲控制器是否把活动请求/上传纳入计数。 |
| release 软链接下入口判断失败？ | `import.meta.url` 与 `process.argv[1]` 可能一个是实路径、一个是软链接路径；比较前使用 realpath。 |
| systemd 报入口不存在？ | 直接检查 release 中构建产物，不要假设 TypeScript 输出层级。 |
| 大文件上传内存暴涨？ | 检查 Nginx request buffering、应用是否整文件读入 Buffer、并发数和 native 内存；保留流式处理。 |
| 达到 MemoryMax 被终止？ | 当前请求应失败且正式数据保持不变；检查非流式路径，修复后由 socket 再次激活。 |
| Nginx 配置测试有旧警告？ | 区分 warning 与本次 error，留存变更前后证据；不得顺手修改无关 server block。 |
| 上传工具超时但看似传完？ | 必须比较本地和远端 SHA-256；必要时使用压缩归档减少小文件传输失败面。 |
| 如何避免日志泄密？ | 不记录 Authorization、Cookie、签名 URL、正文、上传 token 和环境变量；故障采集后再做关键词扫描。 |

### 验收清单

- [ ] socket enabled/active，service 初始 inactive。
- [ ] 本机健康请求能激活 service，公网 HTTPS 能访问。
- [ ] 活动期间 `MemoryCurrent < MemoryMax`。
- [ ] 活动流未结束时服务不会空闲退出。
- [ ] 超过空闲时间后 service inactive、socket active。
- [ ] 发布前后入口与关键静态文件哈希一致。
- [ ] 回滚 release、Nginx 备份和数据恢复路径均已核对。
- [ ] 日志不含密码、令牌、签名、正文或私钥。

## 关联文档

- [[云服务器连接与运维_模板]]
- [[Git与GitHub连接配置]]
- [[大文件清单式原子同步验收SOP]]
