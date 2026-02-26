# Zotero Proxy GUI

Zotero 7/8 插件，提供可视化的代理管理界面。支持多配置预设保存与一键切换。

![GUI](screenshots/gui.png)

## 功能

- 支持 HTTP/HTTPS 和 SOCKS5 代理
- 多配置预设管理（新增、编辑、删除）
- 一键激活/禁用代理
- 工具栏按钮快捷切换
- 首选项面板实时显示当前代理状态
- 中英双语

## 修改的参数

插件通过 Zotero 偏好设置接口读写以下 Firefox 原生参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `network.proxy.type` | number | 代理模式。0=直连，1=手动配置 |
| `network.proxy.http` | string | HTTP 代理主机 |
| `network.proxy.http_port` | number | HTTP 代理端口 |
| `network.proxy.ssl` | string | HTTPS 代理主机 |
| `network.proxy.ssl_port` | number | HTTPS 代理端口 |
| `network.proxy.socks` | string | SOCKS 代理主机 |
| `network.proxy.socks_port` | number | SOCKS 代理端口 |
| `network.proxy.socks_version` | number | SOCKS 版本（固定为 5） |
| `network.proxy.socks_remote_dns` | boolean | SOCKS5 远端 DNS 解析 |

插件自身的配置预设数据存储于：

| 参数 | 说明 |
|------|------|
| `extensions.zotero-proxy-gui.configs` | 所有预设（JSON） |
| `extensions.zotero-proxy-gui.activeConfigId` | 当前激活的预设 ID |

## TODO

- [ ] use zotero-plugin-toolkit
