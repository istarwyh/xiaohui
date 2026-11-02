# Cloudflare Pages 部署指南

## 当前运行时约定

2026-11-02：用户确认遇到依赖运行时不兼容时升级运行时，而非继续暂缓依赖更新。
项目升级到 chokidar 6；它要求 Node >=22.22。项目 `engines.node` 因此为
`>=22.22.0`，不再宣称支持 Node 20 或旧 Node 22。

`.node-version` 和 `.nvmrc` 均固定为 `22.23.4`；GitHub Actions 读取
`.node-version`，Docker 使用 `node:22.23.4-slim`。这是
[Node 官方发行索引](https://nodejs.org/dist/index.json) 中截至 2026-11-02 的
最新 Node 22 LTS 安全补丁（2026-10-20），保持既有 22.x 主版本而非跳至新主版本。

保留 `.npmrc` 的 `engine-strict=true`。不要用 `--force`、关闭引擎检查或忽略
安装错误来绕过不兼容。用 npm 与仓库 lockfile 安装，不盲目补装旧 native 包。

## 安装与验证

```bash
nvm install
nvm use
node --version # v22.23.4
npm ci
npm run check
npm test
npm run build:cf
```

`postinstall` 会验证 native git binding 并安装仓库 hooks。正式构建输出为
`public`；生产分支为 `v4`。更改应经隔离分支、独立审查、最新 SHA CI 与预览验收，
再普通合并；不要直接推送生产分支或重写已有内容分支。

## Cloudflare 配置边界

仓库版本文件不是已读取的 Cloudflare 控制台配置。平台可能存在显式
`NODE_VERSION` 覆盖；若有，预览与生产应与已验证的 `22.23.4` 对齐。
需要从实际构建日志确认 Node 版本及安装结果，不能仅凭提交版本文件宣称平台已升级。
若控制台未登录，停在具体登录/配置确认处，不新建凭据或绕过授权。

建议配置：构建命令 `npm run build:cf`、输出目录 `public`、生产分支 `v4`。
这是仓库推荐值，并非声称已自动修改线上设置。保留现有 Git 集成部署流程，
无需额外手动部署；不要为验证反复触发生产发布。

## 故障定位与发布验收

- `EBADENGINE`：比较实际 Node、`.node-version` 和依赖 engines；升级到受支持且
  已验证的版本，不关闭 `engine-strict`。
- lockfile 不一致：在隔离分支正规更新 lock，核 diff 后执行 `npm ci`；不要删除
  平台可选依赖元数据来“修复”安装。
- 字体或其他远程资源 fetch 失败：保留原始错误，区分网络环境限制与代码问题；
  不关闭 TLS 校验，不把失败构建算作通过。
- Cloudflare 部署成功后，核部署对应的 commit SHA、正式站 build 标识，验证搜索、
  SPA 跳转与实际 WebMCP 搜索/阅读/当前文章调用。合并不等于已部署。

WebMCP 继续默认开启，只提供公开只读工具；本运行时升级不扩大数据、权限或发布内容范围。
