# zotero-proxy-gui — 项目方案文档

## 项目背景

Zotero 没有在图形界面中直接提供代理设置入口，用户需要进入高级配置编辑器手动修改多个 `network.proxy.*` 参数，操作繁琐。本插件为 Zotero 7 提供一个可视化的代理管理界面，支持多配置预设保存与一键切换。

---

## 技术栈

| 组件 | 选择 |
|------|------|
| 语言 | TypeScript |
| 构建工具 | zotero-plugin-scaffold + ESBuild |
| 插件规范 | Zotero 7 Bootstrap 插件（manifest.json + bootstrap.js） |
| UI | XUL/XHTML（Zotero 7 规范，.xul → .xhtml） |
| 本地化 | Fluent (.ftl) — 简体中文 + 英文 |
| 类型定义 | zotero-types |

---

## 功能设计

### 支持的代理类型

| 类型 | Zotero 设置项 |
|------|--------------|
| 无代理（直连） | `network.proxy.type = 0` |
| HTTP 代理 | `network.proxy.type = 1`, `network.proxy.http`, `network.proxy.http_port` |
| HTTPS/SSL 代理 | `network.proxy.ssl`, `network.proxy.ssl_port`（与 HTTP 同时配置） |
| SOCKS5 代理 | `network.proxy.type = 1`, `network.proxy.socks`, `network.proxy.socks_port`, `network.proxy.socks_remote_dns = true` |

### 多配置预设管理

- 用户可创建多个命名配置预设（如"工作代理"、"家用 VPN"）
- 每个预设包含：名称、代理类型、主机、端口、可选 SSL 主机/端口、SOCKS5 远端 DNS 选项
- 所有预设序列化为 JSON 存储于 `extensions.zotero-proxy-gui.configs`
- 当前激活配置 ID 存储于 `extensions.zotero-proxy-gui.activeConfigId`

### 快速切换

- 工具栏按钮：显示当前代理状态（图标 + tooltip）
- 点击按钮弹出下拉菜单，列出所有配置预设，一键切换
- 菜单顶部提供"禁用代理"选项

### 首选项面板

- 在 Zotero 设置 → 插件分页中注册专属面板
- 面板内可完整管理配置预设：新增、编辑、删除
- 显示当前激活的代理状态

---

## 数据模型

```typescript
interface ProxyConfig {
  id: string;          // UUID
  name: string;        // 显示名称
  type: "http" | "socks5" | "none";
  host: string;        // 代理主机 IP 或域名
  port: number;        // 代理端口
  sslHost?: string;    // HTTP 代理时 HTTPS 流量走的主机（可与 host 相同）
  sslPort?: number;    // HTTPS 端口
  remoteDns?: boolean; // SOCKS5 远端 DNS（防 DNS 污染，默认 true）
}
```

---

## 项目结构

```
zotero-proxy-gui/
├── AGENTS.md                        # 本文档
├── package.json                     # npm 包配置与构建脚本
├── tsconfig.json                    # TypeScript 编译配置
├── zotero-plugin.config.ts          # zotero-plugin-scaffold 构建配置
├── .gitignore
├── addon/                           # 插件静态资源（直接打包进 XPI）
│   ├── bootstrap.js                 # 插件引导（由构建工具生成/拷贝）
│   ├── manifest.json                # 插件清单（WebExtension 格式）
│   ├── prefs.js                     # 默认偏好设置
│   ├── content/
│   │   ├── preferences.xhtml        # 首选项面板 UI
│   │   ├── proxyDialog.xhtml        # 新增/编辑代理配置对话框
│   │   └── icons/
│   │       ├── favicon.png          # 插件图标（48x48）
│   │       ├── favicon@2x.png       # 插件图标（96x96）
│   │       └── toolbar.svg          # 工具栏按钮图标
│   └── locale/
│       ├── en-US/
│       │   ├── addon.ftl            # 通用字符串（英文）
│       │   └── preferences.ftl      # 首选项面板字符串（英文）
│       └── zh-CN/
│           ├── addon.ftl            # 通用字符串（简体中文）
│           └── preferences.ftl      # 首选项面板字符串（简体中文）
└── src/                             # TypeScript 源码
    ├── index.ts                     # 插件入口，导出生命周期函数
    ├── hooks.ts                     # startup/shutdown/onMainWindowLoad 等
    ├── addon.ts                     # 插件根类（单例，持有各模块引用）
    └── modules/
        ├── configStore.ts           # 多配置预设的存储/加载/保存
        ├── proxyManager.ts          # 核心：读写 network.proxy.* 设置
        ├── toolbar.ts               # 工具栏按钮 + 快捷下拉菜单
        └── preferencePane.ts        # 首选项面板注册与事件绑定
```

---

## 关键 API

### 读写代理设置

```typescript
// 激活配置
Zotero.Prefs.set("network.proxy.type", 1);
Zotero.Prefs.set("network.proxy.http", "192.168.1.100");
Zotero.Prefs.set("network.proxy.http_port", 7890);
Zotero.Prefs.set("network.proxy.ssl", "192.168.1.100");
Zotero.Prefs.set("network.proxy.ssl_port", 7890);

// 禁用代理
Zotero.Prefs.set("network.proxy.type", 0);
```

### 存储配置预设

```typescript
// 读取所有配置
const configs: ProxyConfig[] = JSON.parse(
  Zotero.Prefs.get("extensions.zotero-proxy-gui.configs") || "[]"
);

// 保存
Zotero.Prefs.set("extensions.zotero-proxy-gui.configs", JSON.stringify(configs));
```

### 注册首选项面板

```typescript
Zotero.PreferencePanes.register({
  pluginID: "zotero-proxy-gui@royenheart",
  src: rootURI + "content/preferences.xhtml",
  scripts: [rootURI + "content/preferences.js"],
  label: "Proxy GUI",
  image: rootURI + "content/icons/favicon.png",
});
```

---

## 构建与开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm start

# 生产构建
npm run build

# 打包 XPI
npm run build
# 产物位于 build/zotero-proxy-gui.xpi
```

---

## 实现步骤

1. 写入本文档（AGENTS.md）
2. 初始化项目结构（package.json、tsconfig.json、构建配置）
3. 编写 manifest.json 和 bootstrap.js
4. 实现 `configStore.ts` — 配置的增删改查与持久化
5. 实现 `proxyManager.ts` — 代理设置的读写逻辑
6. 实现 `preferencePane.ts` + `preferences.xhtml` — 首选项 UI 面板
7. 实现 `toolbar.ts` — 工具栏按钮与快捷切换菜单
8. 添加 Fluent 本地化 — 中英双语 `.ftl` 文件
9. 完成 `hooks.ts` + `index.ts` — 串联所有模块
10. 配置构建系统 — `package.json` 脚本、`zotero-plugin.config.ts`
