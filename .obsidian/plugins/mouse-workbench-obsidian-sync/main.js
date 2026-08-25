"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MouseWorkbenchPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/sync-client.ts
async function request(endpoint, token, body) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6e4);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...token ? { Authorization: `Bearer ${token}` } : {} },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const responseText = await response.text();
      if (!response.ok) {
        let message = responseText || `\u540C\u6B65\u63A5\u53E3\u9519\u8BEF\uFF1A${response.status}`;
        try {
          const value2 = JSON.parse(responseText);
          if (value2.error) message = value2.error;
        } catch (e) {
        }
        throw new Error(message);
      }
      const value = JSON.parse(responseText);
      if (value.error) throw new Error(value.error);
      return value;
    } catch (error) {
      lastError = error instanceof DOMException && error.name === "AbortError" ? new Error("\u540C\u6B65\u8BF7\u6C42\u8D85\u65F6") : error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("\u540C\u6B65\u8BF7\u6C42\u5931\u8D25");
}
async function exchangePairing(endpoint, code, deviceName) {
  return request(endpoint, void 0, { action: "exchange-pairing", code, deviceName });
}
async function syncVault(settings, files, force = false) {
  if (!settings.endpoint || !settings.deviceToken) throw new Error("\u8BF7\u5148\u914D\u7F6E\u540C\u6B65\u63A5\u53E3\u548C\u8BBE\u5907\u4EE4\u724C");
  const begin = await request(settings.endpoint, settings.deviceToken, {
    action: "begin",
    vaultId: settings.vaultId || void 0,
    vaultName: settings.vaultName,
    force,
    files: files.map(({ contentBase64: _contentBase64, ...manifest }) => manifest)
  });
  settings.vaultId = begin.vaultId;
  const changed = new Set(begin.upload.map((item) => item.relativePath));
  const uploadFiles = files.filter((file) => changed.has(file.relativePath));
  const chunkSize = 12;
  for (let index = 0; index < uploadFiles.length; index += chunkSize) {
    await request(settings.endpoint, settings.deviceToken, { action: "upload", runId: begin.runId, files: uploadFiles.slice(index, index + chunkSize) });
  }
  await request(settings.endpoint, settings.deviceToken, { action: "commit", runId: begin.runId, removed: begin.removed });
  return { vaultId: begin.vaultId, revision: begin.revision, uploaded: uploadFiles.length, removed: begin.removed.length };
}

// src/classifier.ts
var MIME_BY_EXTENSION = {
  md: "text/markdown",
  markdown: "text/markdown",
  canvas: "application/json",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm"
};
function extensionOf(path) {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index + 1);
}
function mimeTypeOf(path) {
  var _a;
  return (_a = MIME_BY_EXTENSION[extensionOf(path)]) != null ? _a : "application/octet-stream";
}
function classifyFile(path) {
  const lower = path.toLowerCase();
  const extension = extensionOf(lower);
  if (lower.endsWith(".excalidraw.md") || extension === "excalidraw") return "excalidraw";
  if (extension === "canvas") return "canvas";
  if (extension === "md" || extension === "markdown") return "markdown";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  if (["mp3", "wav", "ogg"].includes(extension)) return "audio";
  if (["mp4", "webm"].includes(extension)) return "video";
  if (["txt", "json", "csv"].includes(extension)) return "text";
  return "other";
}
function shouldExclude(path, excludes) {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
  return excludes.some((rule) => {
    const clean = rule.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    if (!clean) return false;
    if (clean.endsWith("/")) return normalized.startsWith(clean);
    if (clean.includes("*")) {
      const pattern = new RegExp(`^${clean.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}(?:/|$)`);
      return pattern.test(normalized);
    }
    return normalized === clean || normalized.startsWith(`${clean}/`) || normalized.split("/").includes(clean);
  });
}

// src/scanner.ts
var MAX_FILE_BYTES = 50 * 1024 * 1024;
function toBase64(bytes) {
  let binary = "";
  const chunkSize = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
async function scanFile(vault, file) {
  const bytes = new Uint8Array(await vault.readBinary(file));
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error(`\u6587\u4EF6 ${file.path} \u8D85\u8FC7 ${MAX_FILE_BYTES / 1024 / 1024} MB \u9650\u5236`);
  return {
    relativePath: file.path,
    kind: classifyFile(file.path),
    mimeType: mimeTypeOf(file.path),
    size: bytes.byteLength,
    sha256: await sha256(bytes),
    mtime: file.stat.mtime,
    contentBase64: toBase64(bytes)
  };
}
async function scanVault(app, settings) {
  const files = app.vault.getFiles().filter((file) => !shouldExclude(file.path, settings.excludes));
  const scanned = [];
  for (const file of files) scanned.push(await scanFile(app.vault, file));
  return scanned;
}

// src/main.ts
var DEFAULT_SETTINGS = {
  endpoint: "",
  deviceToken: "",
  vaultId: "",
  vaultName: "Obsidian Vault",
  excludes: [".obsidian", ".trash", ".git"],
  autoSync: true,
  paused: false,
  lastSyncMessage: "\u5C1A\u672A\u540C\u6B65",
  lastSyncAt: ""
};
var MouseWorkbenchPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.isSyncing = false;
  }
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.addCommand({ id: "sync-now", name: "\u7ACB\u5373\u540C\u6B65\u5230 Mouse Workbench", callback: () => void this.syncNow() });
    this.addCommand({ id: "rebuild-index", name: "\u5B8C\u6574\u91CD\u5EFA Obsidian \u7D22\u5F15", callback: () => void this.syncNow(true) });
    this.addCommand({ id: "toggle-sync", name: "\u6682\u505C\u6216\u6062\u590D\u81EA\u52A8\u540C\u6B65", callback: () => void this.togglePaused() });
    this.addCommand({ id: "pair-device", name: "\u8F93\u5165\u7F51\u9875\u914D\u5BF9\u7801", callback: () => void this.pairDevice() });
    this.addRibbonIcon("cloud-upload", "\u540C\u6B65\u5230 Mouse Workbench", () => void this.syncNow());
    this.settingTab = new MouseWorkbenchSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (this.settings.autoSync && file instanceof import_obsidian.TFile) this.scheduleSync();
    }));
  }
  onunload() {
    if (this.timer) window.clearTimeout(this.timer);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  scheduleSync() {
    if (this.settings.paused) return;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.syncNow(), 2500);
  }
  async syncNow(force = false) {
    var _a, _b, _c;
    if (this.settings.paused && !force) return;
    if (this.isSyncing) {
      new import_obsidian.Notice("\u540C\u6B65\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u8BF7\u7A0D\u5019");
      return;
    }
    if (!this.settings.endpoint || !this.settings.deviceToken) {
      new import_obsidian.Notice("\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u5B8C\u6210\u914D\u5BF9");
      return;
    }
    this.isSyncing = true;
    this.settings.lastSyncMessage = "\u6B63\u5728\u626B\u63CF Obsidian Vault\u2026";
    (_a = this.settingTab) == null ? void 0 : _a.display();
    try {
      new import_obsidian.Notice("\u6B63\u5728\u626B\u63CF Obsidian Vault\u2026");
      const files = await scanVault(this.app, this.settings);
      this.settings.lastSyncMessage = `\u5DF2\u626B\u63CF ${files.length} \u4E2A\u6587\u4EF6\uFF0C\u6B63\u5728\u6267\u884C\u589E\u91CF\u540C\u6B65\u2026`;
      (_b = this.settingTab) == null ? void 0 : _b.display();
      const result = await syncVault(this.settings, files, force);
      this.settings.vaultId = result.vaultId;
      this.settings.lastSyncMessage = `\u540C\u6B65\u5B8C\u6210\uFF1A\u4E0A\u4F20 ${result.uploaded} \u4E2A\u6587\u4EF6\uFF0C\u5220\u9664 ${result.removed} \u4E2A\u6587\u4EF6`;
      new import_obsidian.Notice(this.settings.lastSyncMessage, 8e3);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Obsidian \u540C\u6B65\u5931\u8D25";
      this.settings.lastSyncMessage = `\u540C\u6B65\u5931\u8D25\uFF1A${message}`;
      console.error("[Mouse Workbench Sync]", error);
      new import_obsidian.Notice(this.settings.lastSyncMessage, 12e3);
    } finally {
      this.isSyncing = false;
      this.settings.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveSettings();
      (_c = this.settingTab) == null ? void 0 : _c.display();
    }
  }
  async togglePaused() {
    this.settings.paused = !this.settings.paused;
    await this.saveSettings();
    new import_obsidian.Notice(this.settings.paused ? "\u5DF2\u6682\u505C\u81EA\u52A8\u540C\u6B65" : "\u5DF2\u6062\u590D\u81EA\u52A8\u540C\u6B65");
  }
  async pairDevice() {
    var _a, _b;
    if (!this.settings.endpoint) {
      new import_obsidian.Notice("\u8BF7\u5148\u586B\u5199 Obsidian Sync Edge Function \u5730\u5740");
      return;
    }
    const code = await requestPairingCode(this.app);
    if (!code) return;
    try {
      const result = await exchangePairing(this.settings.endpoint, code, this.app.vault.getName());
      this.settings.deviceToken = result.deviceToken;
      this.settings.vaultId = (_a = result.vaultId) != null ? _a : "";
      this.settings.vaultName = this.app.vault.getName();
      await this.saveSettings();
      (_b = this.settingTab) == null ? void 0 : _b.display();
      new import_obsidian.Notice("\u914D\u5BF9\u6210\u529F\uFF0C\u73B0\u5728\u53EF\u4EE5\u6267\u884C\u540C\u6B65");
    } catch (error) {
      new import_obsidian.Notice(error instanceof Error ? error.message : "\u914D\u5BF9\u5931\u8D25");
    }
  }
};
function requestPairingCode(app) {
  return new Promise((resolve) => {
    new PairingCodeModal(app, resolve).open();
  });
}
var PairingCodeModal = class extends import_obsidian.Modal {
  constructor(app, finish) {
    super(app);
    this.finish = finish;
    this.code = "";
    this.finished = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "\u8FDE\u63A5 Mouse Workbench" });
    new import_obsidian.Setting(contentEl).setName("\u4E00\u6B21\u6027\u914D\u5BF9\u7801").setDesc("\u8F93\u5165\u7F51\u9875\u8BBE\u7F6E\u9875\u751F\u6210\u7684 8 \u4F4D\u914D\u5BF9\u7801\uFF0C\u914D\u5BF9\u7801\u6709\u6548\u671F\u4E3A 10 \u5206\u949F\u3002").addText((text) => {
      text.setPlaceholder("\u8F93\u5165\u914D\u5BF9\u7801").onChange((value) => {
        this.code = value.trim();
      });
      text.inputEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        this.submit();
      });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });
    new import_obsidian.Setting(contentEl).addButton((button) => button.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton((button) => button.setCta().setButtonText("\u8FDE\u63A5").onClick(() => this.submit()));
  }
  onClose() {
    this.contentEl.empty();
    if (this.finished) return;
    this.finished = true;
    this.finish(void 0);
  }
  submit() {
    if (!this.code) {
      new import_obsidian.Notice("\u8BF7\u8F93\u5165\u914D\u5BF9\u7801");
      return;
    }
    this.finished = true;
    this.finish(this.code);
    this.close();
  }
};
var MouseWorkbenchSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Mouse Workbench Obsidian Sync" });
    new import_obsidian.Setting(containerEl).setName("\u540C\u6B65\u63A5\u53E3").setDesc("\u586B\u5199 Supabase Edge Function \u7684 obsidian-sync \u5730\u5740").addText((text) => text.setValue(this.plugin.settings.endpoint).onChange(async (value) => {
      this.plugin.settings.endpoint = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u8BBE\u5907\u72B6\u6001").setDesc(this.plugin.settings.deviceToken ? "\u5DF2\u914D\u5BF9\uFF0C\u53EF\u6267\u884C\u589E\u91CF\u540C\u6B65" : "\u5C1A\u672A\u914D\u5BF9").addButton((button) => button.setButtonText("\u8F93\u5165\u914D\u5BF9\u7801").onClick(() => void this.plugin.pairDevice()));
    const lastSyncAt = this.plugin.settings.lastSyncAt ? new Date(this.plugin.settings.lastSyncAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "";
    new import_obsidian.Setting(containerEl).setName("\u6700\u8FD1\u540C\u6B65").setDesc(`${this.plugin.settings.lastSyncMessage}${lastSyncAt ? ` \xB7 ${lastSyncAt}` : ""}`);
    new import_obsidian.Setting(containerEl).setName("\u6392\u9664\u76EE\u5F55").setDesc("\u6BCF\u884C\u4E00\u4E2A\u76EE\u5F55\u6216\u901A\u914D\u89C4\u5219").addTextArea((area) => area.setValue(this.plugin.settings.excludes.join("\n")).onChange(async (value) => {
      this.plugin.settings.excludes = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u4FDD\u5B58\u65F6\u81EA\u52A8\u540C\u6B65").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
      this.plugin.settings.autoSync = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u6682\u505C\u540C\u6B65").setDesc("\u6682\u505C\u540E\u4E0D\u4F1A\u54CD\u5E94\u6587\u4EF6\u4FEE\u6539\u4E8B\u4EF6\uFF0C\u4F46\u4ECD\u53EF\u624B\u52A8\u6267\u884C\u7ACB\u5373\u540C\u6B65\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.paused).onChange(async (value) => {
      this.plugin.settings.paused = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).addButton((button) => button.setCta().setButtonText(this.plugin.isSyncing ? "\u540C\u6B65\u4E2D\u2026" : "\u7ACB\u5373\u540C\u6B65").setDisabled(this.plugin.isSyncing).onClick(() => void this.plugin.syncNow()));
    new import_obsidian.Setting(containerEl).addButton((button) => button.setButtonText("\u5B8C\u6574\u91CD\u5EFA\u7D22\u5F15").setDisabled(this.plugin.isSyncing).onClick(() => void this.plugin.syncNow(true)));
  }
};
