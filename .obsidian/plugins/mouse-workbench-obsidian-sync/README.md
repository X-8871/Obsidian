# Mouse Workbench Obsidian Sync

这个插件把 Obsidian Vault 增量同步到 Mouse Workbench，网页端只读浏览 Markdown、图片、Canvas、Mermaid、Excalidraw 和其他附件。

## 构建

```bash
npm install
npm run build
```

将生成的 `main.js`、`manifest.json` 和样式文件放入 Obsidian 的插件目录后，在 Obsidian 设置中启用插件。

## 配置

1. 网页登录 Mouse Workbench。
2. 在网页设置中生成一次性配对码。
3. 在插件设置中填写 `obsidian-sync` Edge Function 地址。
4. 输入网页配对码。
5. 执行“立即同步”，或打开保存时自动同步。

默认排除 `.obsidian`、`.trash` 和 `.git`，可以在插件设置中增加规则。
