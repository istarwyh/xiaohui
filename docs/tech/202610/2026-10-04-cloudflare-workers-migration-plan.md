# 晓灰博客迁移 Cloudflare Workers 技术方案

初稿日期：2026-10-04；复核日期：2026-10-09  
状态：保留的迁移技术方案（实施另行授权），仅文档，不代表已迁移、已部署或已修改 Cloudflare 配置  
复核代码基线：`v4` / `08bb31e6e7b74851fb1023a814cebd8c4a6b37e2`，包含 PR #100 的双语首页实现及 PR #101 的依赖 override 修复；初稿基线为 `7b595545b1ea19eb880d5e2224238dbbc2f84223`

## 1. 结论与决策

**可以迁移，推荐先把 Quartz 生成的静态网站迁到 Cloudflare Workers Static Assets，再按真实需求增加 API。** 这次调整的是交付与运行平台，不需要为了使用 Workers 把 Quartz 改成 Next.js、Astro 或服务端渲染。

对这个项目，合理顺序是：

1. 保留 `content/ → Quartz → public/` 的内容生产链和现有页面表现
2. 用 Workers Static Assets 接收同一份产物，在预览环境验证与 Pages 的差异
3. 经确认后切换 `xiaohui.cool` 的流量，保留 Pages 回退路径
4. 保留 PR #100 已实现的首页；将来的互动、个性化、Agent API 再逐项接入 Worker

迁移给未来能力预留更直接的运行入口，但**不会自动改善首页设计、搜索体验或页面速度**。目前的阅读、全文索引、RSS、图谱和品牌页都是静态能力，Pages 也能继续可靠承载。推荐迁移的理由是后续 API、定时任务和服务绑定更容易统一管理，而不是现有博客已经必须动态化。[Cloudflare 迁移指南](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

### 方案比较

| 路线                                  | 收益                                 | 代价与适用判断                                                       |
| ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| 继续 Pages，必要时外接一个 API Worker | 今天变更最少，也能扩展动态能力       | 合理备选；多一套部署和运行边界                                       |
| **Quartz + Workers Static Assets**    | 保留内容与构建资产，统一后续运行入口 | **本方案选择**；补齐预览、发布、域名回退和 HTTP 行为校验             |
| Workers + 立即重写整个前端框架        | 可以重新组织全栈应用                 | 同时改变内容模型、渲染与部署，迁移风险大；当前没有足够收益证明       |
| 旧 Workers Sites / KV 静态托管        | 历史方案                             | 不选；新项目采用 Static Assets，不引入静态文件 KV 上传与手写文件路由 |

### 与首页重构的边界

[首页实现 PR #100](https://github.com/istarwyh/xiaohui/pull/100) 已于 2026-10-05 合入 `v4`；[旧方案 PR #96](https://github.com/istarwyh/xiaohui/pull/96) 已于 2026-10-09 关闭、未合并，不再作为待实施依赖。迁移保留现有 `HomePage` / `HomeHeader`、中英文首页、按语言筛选的 FeedList、搜索、加载更多与返回状态、人物照片及遮罩，不重新实现首页。后续首页大改与生产切流应分开发版。实现事实参见 [首页实施记录](2026-10-04-homepage-implementation.md)，视觉规范仍见 [设计系统](../../../design/README.md) 与 [品牌资料说明](../../../design/brand-kit.md)。

本文与 [通用托管指南](../../hosting.md) 分工不同：后者介绍 Quartz 的多平台托管；本文记录本博客迁移 Workers 的构建、HTTP 兼容、预览隔离、域名切流和回退方案。首页实施记录覆盖 UI 与验收，未实现 Workers 迁移；因此本文仍有独立价值。

## 2. 当前仓库与待确认事项

### 已核实的代码事实

| 项目            | 当前状态与来源                                                                                                                                                       | 对迁移的影响                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 项目            | Quartz `4.4.0`，TypeScript / Preact，默认分支 `v4`                                                                                                                   | 构建发生在 Node 环境，产物运行在浏览器                                   |
| 生产构建        | `package.json` 的 `build`：获取 Git 历史 → `quartz build` → 复制 `extra-pages/*` 到 `public/`；`build:cf` 是别名                                                     | Workers 必须上传完整 `public/`，不能误用文档站构建                       |
| 构建副作用      | 生产 build 已移除 `update-homepage`；显式运行旧脚本遇 `pageType: home` 会提前退出（含 FORCE），首页数据由构建阶段派生                                                | CI 不回写这些变化；记录产物与源 SHA，检查意外内容变更                    |
| 域名与语言      | `quartz.config.ts`：`baseUrl: "xiaohui.cool"`、`locale: "zh-CN"`、`enableSPA: true`                                                                                  | 保持 canonical 域名；Quartz SPA 导航不等于服务器 SPA fallback            |
| 输出            | ContentPage、FolderPage、TagPage、AliasRedirects、NotFoundPage、BrandPage                                                                                            | HTML 平铺文件与文件夹 index 并存，保留 URL 解析和真实 404                |
| 发现入口        | `/index.xml`、`/sitemap.xml`、`/static/contentIndex.json`、`/llms.txt`、`/llms-full.txt`、`/agent/manifest.json`、`/agent/search-index.json`、`/agent/pages/**/*.md` | 全部仍按静态文件托管；不能误当 API、不能改变名称                         |
| 额外页面        | `extra-pages/wedding/` 经生产脚本复制                                                                                                                                | 必须进入验收；不能只验 Quartz 文章                                       |
| 媒体            | `Plugin.Assets()` 复制 content 内非 Markdown 资源；OG、品牌 PNG/SVG 在构建生成；另有外部图源                                                                         | 不把图片、字体、OG 生成搬到请求时执行                                    |
| 搜索与 SEO      | `Head.tsx` 生成 canonical、语言 alternate、OG 与 JSON-LD；ContentIndex 生成搜索/RSS/sitemap                                                                          | 迁移保持域名、slug、日期与响应类型                                       |
| robots          | `content/robots.txt` 已声明 sitemap、Agent 入口与抓取范围                                                                                                            | 原样保留生产策略，不能被预览 noindex 污染                                |
| Cloudflare 文件 | 在该基线未跟踪 `wrangler.*`、`functions/`、`_worker.js`、`_routes.json`、`_headers`、`_redirects`                                                                    | 没有已知 Pages Functions 需要改写；仪表盘配置仍需核对                    |
| CI              | `.github/workflows/ci.yaml` 在 Linux / macOS / Windows 跑 Node 22、`npm ci`、design/check/test、`quartz build --bundleInfo -d docs`                                  | 当前聚合 CI 主要构建 **docs**；新增 production-content 构建门禁          |
| PR 预览         | `build-preview.yaml` 与 `deploy-preview.yaml` 都限制仓库为 `jackyzha0/quartz`                                                                                        | 这些上游 workflow 在本仓库不会提供有效的 PR 预览；不能只替换 action 名称 |
| 版本配置        | `.node-version` 为 `v22.16.0`，`.nvmrc` 为 `20.18.0`；`.npmrc` 是 `engine-strict=true`                                                                               | 实施时统一为经 lockfile 验证的 Node 22 版本；不延续冲突配置              |

仓库的 [hosting.md](../../hosting.md) 与 [Pages 部署旧指南](../../cloudflare-pages-deployment-guide.md) 是文档，不是已读取的线上配置。旧指南中的 Node 20.18、关闭 engine-strict、`main` 分支，以及 `build.sh` 对旧版 native git 依赖的回退安装，与当前代码不完全一致。Workers 实施 PR 应更新这些说明；不得直接照抄旧指南作为实际部署事实。

### 尚未核实，实施阶段必须补齐

- Cloudflare account、zone、Pages 项目名称、`*.pages.dev` 地址、当前 production deployment ID 与源 SHA
- 真实构建命令、Git 集成、构建环境变量、预览分支策略、部署钩子
- `xiaohui.cool` 的 DNS 记录、橙云代理状态、已有 Worker Routes、`www` 或其他域名别名、TLS 与重定向规则
- Workers 套餐、当前用量、其他 Worker 共享的免费额度、账单告警和账户权限
- 仪表盘中的 Headers / Redirect / Cache / WAF / Access / Bot 等规则；代码中没有文件不代表线上没有规则
- 当前线上与目标 SHA 的真实 HTML、资源、HTTP 响应对照；网页抓取或搜索缓存不作为实时部署成功的证据

上列信息形成**迁移记录**，仅保存必要非秘密配置、版本号与核验结果。令牌、密钥、Cookie、认证材料不得写进仓库、PR、日志或对话。

## 3. 目标架构与分层

```text
作者 / Obsidian
    ↓ Git
content/ + quartz/ + design tokens + extra-pages/
    ↓ GitHub Actions：Node 22 + npm ci + checks + production build
public/ + manifest（源 SHA、哈希、文件数、大小）
    ↓ Wrangler
Workers Static Assets
    ├─ HTML / CSS / JS / 图片 / 字体 / RSS / sitemap / Agent 索引
    └─ 404.html → HTTP 404

未来增量，当前不创建：
/api/* → Worker → 经单独评审的服务绑定 / D1 / KV / R2 / Queue
```

### 第一阶段不需要 Worker 脚本

纯静态 Worker 可以只配置 `assets.directory`，不配置 `main`、`ASSETS` binding、`nodejs_compat` 或数据库。Node、native git、sharp、Satori 与文件系统都继续只在构建机使用；它们不需要在 Workers runtime 运行。不要把 `quartz build` 放进 `fetch()` 请求处理器。[静态资产](https://developers.cloudflare.com/workers/static-assets/)

### 推荐目录与变更清单

以下是**实施 PR 的计划**，本方案不创建这些配置：

```text
wrangler.jsonc                        # 静态资产与 Preview 配置
package.json / package-lock.json      # 锁定 Wrangler 与新增明确命令
.node-version / .nvmrc                # 统一构建 Node 版本
config/cloudflare/.assetsignore       # 构建后复制到 public/.assetsignore
config/cloudflare/_headers            # 仅在已核实需要时添加
config/cloudflare/_redirects          # 仅迁移已有规则/明确批准的兼容规则
scripts/prepare-workers-assets.mjs    # 复制配置、检查秘密/文件数/文件大小/必要入口
scripts/check-hosting-parity.mjs      # 基线与 Workers 的 HTTP 和 HTML 对照
.github/workflows/workers-preview.yaml
.github/workflows/workers-deploy.yaml
# 后续需求到来才添加：worker/index.ts、独立 Worker 类型检查与测试
```

`public/` 是会被 Quartz 清理重建的产物目录，不作为配置源。用专门的 preparation step 复制 dotfile，不能依赖 `cp extra-pages/*` 复制隐藏文件。最终断言输出里没有 `.git`、`.env*`、`node_modules`、后端源码或认证文件。`_headers` 和 `_redirects` 是平台控制文件，应留在输出根目录让 Wrangler 解析，不当作文章，也不为了旧教程把它们一概排除。[资产配置](https://developers.cloudflare.com/workers/static-assets/binding/)

## 4. 最小 Wrangler 配置与构建

### 4.1 纯静态影子环境配置

以下配置以 2026-10-04 的官方 schema 为依据，Worker 名称是**建议名，尚未在账户创建或确认可用**。实施时先验证项目内 Wrangler schema，再运行本地检查。使用当前受支持的 Wrangler 4，若采用本方案的 Worker Previews，项目依赖必须至少 `4.135.0`；选定版本后精确锁定并提交 lockfile，不在 CI 临时安装 `latest`。[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)、[Previews 起步](https://developers.cloudflare.com/workers/previews/get-started/)

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "xiaohui-blog",
  "compatibility_date": "2026-10-04",
  "workers_dev": true,
  "preview_urls": true,
  "assets": {
    "directory": "./public",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
  },
  "previews": {},
}
```

选择 `auto-trailing-slash` 是初始兼容候选，不是未经比较就修改 URL 的最终结论：普通 `file.html` 对应 `/file`，`folder/index.html` 对应 `/folder/`。上线门禁必须把现网的状态码、重定向目的地与 canonical 放在一起比较；若目录 canonical 原本不带 `/`，先记录既有差异，再决定是否用少量显式规则，而不是顺便全站切换斜杠策略。

配置中刻意没有：

- `pages_build_output_dir`、旧 Workers Sites 的 `site.bucket`、KV 资产命名空间
- 无实际运行代码时无效的 `assets.binding`
- `run_worker_first: true`、全站鉴权中间件或新缓存层
- 生产 `routes`、自定义域名、account ID、数据库 ID 与 secrets
- `not_found_handling: "single-page-application"`

`compatibility_date` 固定在验证过的日期，不在每次构建时自动更新。不要让脚手架自动部署或自动创建未来数据库。

### 4.2 构建与本地预验收

在实现相关脚本、安装锁定 Wrangler 后执行：

```bash
# 完整 Git 历史由 CI checkout fetch-depth: 0 提供
npm ci
npm run check:design
npm run check
npm test
npm run build:cf
node scripts/prepare-workers-assets.mjs
npx wrangler deploy --dry-run
npx wrangler dev
```

`deploy --dry-run` 不是部署成功证明；`wrangler dev` 验证路由，`quartz build --serve` 验证写作体验，两者不能互相替代。上线前还必须跑真正的 Workers Preview。

准备脚本应做这些确定性检查：

1. 核验 `index.html`、`en.html`、`static/home-portrait-mask-cb27f3ad.png`、`404.html`、`index.xml`、`sitemap.xml`、搜索索引、Agent 入口、`brand.html` 与品牌下载资源存在
2. 核验 `extra-pages/wedding/` 的目标资源；盘点超大文件、大小写冲突和规范化后的路径碰撞
3. 验证输出没有内部规则文档、private/draft 内容和 secrets；工程方案放在 `docs/`，不能进入生产 `content/` 索引
4. 生成并保存构建 manifest：源 SHA、lockfile 哈希、Node/npm/Wrangler 版本、必要配置摘要、逐文件 SHA-256 与大小
5. 按当天套餐限额检查文件数和单文件大小，并给 80% 容量预警；不得仅比较整个目录大小
6. 核验新首页构建不改写作者内容或旧 cards-data，拒绝未解释的源文件变化；生成文件不自动 commit/push
7. 不加载生产业务 secrets 参与静态构建；现有生产链不再调用旧 Unsplash/CardFeed 生成器；保留首页真实照片、根路径遮罩及文章图源，不重新引入随机选图

`npm run build` 的 Git fetch 容错不能替代完整历史验证，否则基于 Git 的日期可能退回 filesystem 并改变 feed 顺序。新 workflow 使用 `fetch-depth: 0`，记录时间戳回退警告；若现有脚本稳定性不足，另开小改动修正，不绕过 `engine-strict` 或随意升级依赖。

## 5. URL 与静态行为兼容

### URL 和 404

- 不改 `baseUrl`、目录树、文件名大小写、中文 slug、编码方式或文章 canonical
- `/article`、`/article/`、`/article.html`、folder index、URL 查询参数与中文路径分开测；内链、直接输入 URL、刷新都要可用
- Quartz 的 `enableSPA` 只增强客户端导航，服务器仍是多页静态站。未知文章必须返回真正 `404` 和 `404.html`，不能回首页 `200`，否则产生 soft 404
- `/missing.css`、`/missing.js`、未知图片、`/api/not-created` 也检查 status 和 MIME；不能因 fallback 被当成成功资源
- URL fragment 在浏览器侧处理；同页 TOC、跨页中文 hash、后退/前进与重复导航都要回归

Cloudflare 的自动 HTML 规范化会返回 `307`；Pages 的已有行为可能不同。迁移验收允许的差异应逐条登记，例如“最终 URL 与内容一致，平台默认 308 → 307，已评审”。需要长期 SEO 重定向时使用明确规则，不把“能打开”当作完整等价。[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[SSG 与 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)

### Headers 与 redirects

当前代码没有上述文件，首先导出现网规则，只有确认的规则才迁移。Workers Static Assets 现在原生支持 `_headers`、`_redirects`，不需要为了这两项编写全站 Worker。

- `_headers` 只覆盖资产响应；未来 Worker 自己生成的 API 响应必须自己设置必要 headers
- 重定向先于 headers 执行，不能假设重定向响应会获得 `_headers` 的安全头
- `_redirects` 有规则数量/长度限制；不支持的按 query、cookie、域名条件的规则应单独分类，用 zone 规则或有限 Worker 逻辑处理
- Quartz `AliasRedirects()` 生成的是带 canonical/noindex/meta refresh 的 **HTML 页面**，不是已有 HTTP 301。首期保留它们，是否转成 301 另做 SEO 决策
- `www`、HTTP→HTTPS 或其他域名别名按照现网真实规则处理，不臆造当前存在的域名，也不把 host redirect 错写成普通路径规则
- 不在迁移时未经验证新增强 CSP；现有字体、统计、Userdesk、Clarity、KaTeX、Mermaid、图片与内联脚本可能受影响

实施时给每条规则一行来源、目的、匹配用例和验证结果。[Headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)

### 缓存、索引和下载

初期采用平台静态缓存默认值。普通资产的浏览器默认是 `Cache-Control: public, max-age=0, must-revalidate`，配合 ETag。`index.css`、`prescript.js`、`postscript.js`、`contentIndex.json` 等文件名稳定，但 #100 已对 CSS、两个脚本与 contentIndex URL 添加构建版本参数，并用 `quartz-build` 标记和客户端版本检查在跨版本 SPA 导航时完整刷新。参数不是内容哈希文件名，也不保证旧版本字节仍可获取，不能全站设一年 immutable。构建 ID 随构建生成，同一源 SHA 的两次构建并非字节相同；影子与生产必须复用同一份产物及 manifest。只有真正内容哈希命名、且旧版本仍可取到的文件才考虑长缓存。

保留 CDN 原生资产缓存，不主动套 `caches.default`、KV 缓存或新的 **Workers Cache**。当前 Workers Cache 是另一个可选功能，启用后即使静态缓存命中也按标准 Workers 请求收费；它不是 Static Assets 免费缓存的同义词。[静态缓存行为](https://developers.cloudflare.com/workers/static-assets/headers/)、[Workers Cache 计费](https://developers.cloudflare.com/workers/cache/#pricing)

检查 RSS/XML/JSON/Markdown/SVG/PNG/WebP 的 Content-Type，`HEAD`、条件请求、需要时的 Range。`/brand` 下载链接与实际文件名保持一致；外链 OSS/Unsplash/字体仍是原来的第三方，不在这次迁移中重传或改写。部署后核验新 HTML 与新 JS/CSS 一致、旧标签页 SPA 跳转可恢复；不对所有缓存盲目 purge。站点 analytics 保留原配置，预览流量过滤单独验证。

## 6. PR 预览与 CI 发布设计

### 推荐 GitHub Actions 作为唯一发布执行器

继续使用仓库已有检查体系，新增 Linux 的真实 `content/` 生产构建。Workers Builds 也是官方可行替代，但首期不同时启用两条生产发布链，避免同一提交重复部署、旧提交覆盖新提交、环境配置漂移。

现有上游 preview workflows 先保持或经清理 PR 移除；新建本仓库专用 workflow，显式目标 `istarwyh/xiaohui` / `v4`。不要误把 `-d docs` 产物发布成博客。

### Worker Previews 和 Version URLs 不同

截至本方案日期，推荐 **Worker Previews**：顶层 `assets` + `previews: {}`，执行 `npx wrangler preview --name pr-<number>`。它有稳定 Preview URL 与每次部署独立 URL，不要求先发布生产版本；Workers.dev Preview URL 自带 `X-Robots-Tag: noindex`，仍要在 HTTP 验收中实测。`assets` 保持顶层，不放入 `previews`。[Previews](https://developers.cloudflare.com/workers/previews/)、[Preview 配置](https://developers.cloudflare.com/workers/previews/configuration/)

旧 `npx wrangler versions upload --preview-alias pr-N` 创建的是 **Version URL**：不切生产流量，但复用该版本配置与资源，不等于隔离数据库/密钥的环境。仅作锁定旧工具链的临时备选，而且只能指向隔离的 preview Worker；不要在生产 Worker 上把有写操作的版本当安全沙箱。[Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)

### 工作流执行契约

| 事件                    | 构建/验证                                           | 发布行为                                             | 门禁                                                                    |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| 任意 PR                 | 无 Cloudflare token 的检查与构建，输出 SHA/manifest | 不自动给不可信代码生产能力                           | `contents: read`                                                        |
| 已审核的本仓库 PR       | 使用精确 head SHA 的成功产物，路由与配置校验        | `wrangler preview --name pr-N`                       | protected preview environment；只准公开静态产物与测试资源               |
| fork PR / Dependabot PR | 只跑无 secrets 的验证                               | 默认不发布；维护者审核后走受控预览                   | 不用 `pull_request_target` checkout 不可信 head 再运行带 secrets 的代码 |
| PR closed               | 使用可信默认分支的固定清理逻辑                      | 删除该 PR Preview                                    | 只接收验证过的数字 PR ID，删除后核对 URL/资源                           |
| `v4` 提交               | 聚合检查成功，构建精确 release SHA                  | 经 production environment 门禁运行 `wrangler deploy` | 初次切流另行批准；串行生产发布，不取消进行中的部署                      |
| 回退                    | 选择记录中的已验证版本                              | 回退 Worker 版本或撤销 Route                         | 依批准的 runbook，事后验证                                              |

初次 implementation 不直接把每次 push 都设成无审批自动生产部署。等用户确认发布策略后，再决定 `v4` 的 environment 是否一直保留人工门禁。

**安全细节：**同仓库分支不天然等于可信。负责部署的 job 使用可信发布工具与配置校验，部署必须使用独立、干净的 job/runner，只下载已验证的静态制品，使用可信配置和锁定工具，不执行 PR 脚本、不复用 PR 的 `node_modules`；否则此前运行的不可信构建代码可以篡改发布工具。token 只注入这个干净发布环境的部署步骤，不给构建环境。若采用构建/发布分离的 `workflow_run`，必须验证来源仓库、event、PR、head SHA、conclusion、artifact digest；仅提取已验证的静态资产，不执行 artifact 内脚本、不读取其中伪造的 Wrangler 配置。生产 secret 不出现在 Preview jobs。

GitHub 最小权限：构建 `contents: read`；发部署状态才加 `deployments: write`；发 PR 链接才给独立可信通知步骤 `pull-requests: write`。预览并发键按 PR；生产并发键全站唯一，并检查旧 run 不覆盖更新 release。使用仓库当前 action 主版本并在实施时解析/锁定审核过的 commit SHA。

### 认证与资源隔离

由用户/管理员在 Cloudflare 创建并在 GitHub 受保护 environment 配置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。令牌限定目标 account、必要 Workers 权限；需要修改 Route 的切流身份只授予目标 zone 的必要权限，DNS 变更用独立短期权限/人工步骤。不要为方便使用 Global API Key，也不要声称常规 account token 已做到单 Worker 粒度隔离。[官方 GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

Preview、staging、production 的业务 secrets、D1、KV、R2、Queue 分开。Previews Base 的 secret 更新不会自动更新已存在 Preview；轮换时核对旧 Preview。第一阶段没有业务 bindings，保持空集。需要登录、OAuth、token 创建、添加 GitHub/Cloudflare 集成或扩大持久访问时，由用户完成或逐项确认，不能把“写迁移方案”视为授权。[Preview 隔离](https://developers.cloudflare.com/workers/previews/resources/)

### 清理与产物晋级

```bash
# 以下命令仅为未来实施步骤，需已有发布授权
npx wrangler preview --name "pr-96"
# 关闭 PR 后，从可信配置执行，只删除对应预览
npx wrangler preview delete --name "pr-96" --skip-confirmation
```

这里 `96` 仅示范命名，不对应已关闭的 #96；本文档 PR #98 也不创建预览。Preview 容量淘汰不等于 PR close 自动清理；为 closed/reopened 和失败重试编写显式生命周期逻辑。[预览 CI 示例](https://developers.cloudflare.com/workers/previews/examples/)

生产制品从合入后精确 `v4` SHA 重新构建并验收，不能把合并前 PR head 不加检查地晋级。冻结候选 release 后，shadow 和生产使用同一份 manifest/字节；如 preview-only headers 或 analytics 设置必须不同，记录允许的差异、分别生成产物，禁止把 noindex 带进生产。默认使用 Previews 的服务端 noindex 可避免修改产物。

## 7. 域名切换与上线步骤

### 阶段 A 基线与准备

1. 读取并记录第 2 节的账户/域名/发布状态，确认 `xiaohui.cool` 在可管理的 Cloudflare zone
2. 导出现网域名、DNS、Route 与规则；记录 Pages 当前 production deployment 和可恢复 URL
3. 冻结一个待迁移 release SHA；完成配置、脚本与 CI 的独立 implementation PR
4. 跑本地 Wrangler 和测试矩阵，记录 baseline；与首页大改、内容批量更新分开排期

**退出条件：**没有未解释的构建错误或关键路由差异；回退操作者、配置快照和权限齐全。缺少账户信息时停在本地/文档阶段，不猜 ID、不建资源。

### 阶段 B 影子部署与验证

经授权上传到 Worker Preview，或部署到尚未绑生产域名的独立 shadow Worker。只使用部署工具返回的真实 URL；CI 可调用 `wrangler preview --name pr-N --json` 并从 `.preview.urls[0]` 读取，不拼接账户 subdomain 或用日志正则猜链接。`baseUrl` 保持 `xiaohui.cool`，验证绝对 canonical 和 OG 指向正确；允许预览的绝对链接回生产，但功能测试使用预览相对路径，避免误把生产成功当预览成功。

对预览运行第 10 节矩阵，与**同 SHA** 的 Pages 候选或已归档产物比较。只有网页外观相似不够。静态资产、中文路由、索引、404、下载、移动交互和缓存全部过门禁，再准备切流。

### 阶段 C 推荐先用 Route 接管流量

**先建立正确的生产 deployment，再连接生产 Route。** 如果阶段 B 只创建了 Preview，必须在获得部署授权后，把已验收的同一 release 制品用 `wrangler deploy` 部署到暂未绑定生产域名的目标 Worker，记录 production version/deployment ID，并在其工具返回的 `workers.dev` 地址再次 smoke。Preview 是独立环境，新增 Route 不会把 Preview 自动晋级；否则 Route 可能指向空或旧的生产版本。

**推荐过渡做法：保留 Pages 的自定义域名绑定与 DNS，新增精确 Worker Route `xiaohui.cool/*` 指向已验证 Worker。** 官方支持在 Pages 自定义域名前运行 Worker Route；它要求 DNS 记录启用 Cloudflare 代理。这里把移除 Route 作为回退手段是基于该路由模型的工程设计，须先在测试域名演练，不能承诺绝对零中断。[Pages 前置 Worker](https://developers.cloudflare.com/pages/how-to/add-custom-http-headers/)、[Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)

仅在核实 zone 与当前 Route 无冲突、用户确认切流后，把类似片段加入生产配置或按已核对的仪表盘 runbook 操作：

```jsonc
{
  "routes": [{ "pattern": "xiaohui.cool/*", "zone_name": "xiaohui.cool" }],
}
```

它是上文完整配置的增量片段，不是可独立部署文件。不要使用 `*xiaohui.cool/*` 把未知子域一起接走。已有更具体的 Routes、Page Rules、Cache Rules、Access、WAF 必须先查清优先级与效果。第一阶段直接由 Static Assets 响应，不添加手写代理/自调用逻辑；未命中的资产按本 Worker 的 404 策略处理，不会自动穿透回 Pages。普通 Route 中的 origin fetch 与 Custom Domain 自调用是不同语义，不混用。

切流前明确确认：目标账户、Worker、精确 release SHA、`xiaohui.cool/*`、执行窗口、对读者的影响、回退触发条件和可执行撤销动作。切换后立刻做生产 smoke，再连续观察真实访问与关键错误。初期保留 Pages 在线并保存已知良好版本，避免后续自动构建破坏回退基线。

### 阶段 D 观察与最终 Custom Domain

达到下列条件后才结束双轨：关键矩阵全通过、至少覆盖一个约定的完整日常访问周期、一次真实内容发布成功、回退演练通过。观察周期建议至少 24 小时，低流量站结合主动探测延长；这是风险控制建议，不是凭等待时间自动判定成功。

**首页已在 PR #100 实现，不以 Pages 清退作为其前置条件。** Route 过渡稳定后即可视为流量已由 Workers 承载，首页迭代可以独立推进。彻底去除 Pages 依赖时，再安排第二次变更：

1. 再次记录 DNS、TLS、Pages 域名绑定与 Worker Route 快照，确认回退所需权限
2. 依真实账户状态移除冲突的 Pages 域名/CNAME；不能把同一 host 无条件重复绑定
3. 为 Worker 添加 `xiaohui.cool` Custom Domain，由 Cloudflare 建立相应 DNS/证书；替换过渡 Route，避免遗留冲突
4. 等待域名/TLS active，验证 apex 与已有别名、HTTPS 重定向与全矩阵
5. 仅在单独确认后停用 Pages 自动发布；删除 Pages 项目不是本方案默认动作

目标 Custom Domain 的配置语义是：

```jsonc
{
  "routes": [{ "pattern": "xiaohui.cool", "custom_domain": true }],
}
```

与普通 Route 不同，这里没有 `/*`。官方说明已有 CNAME 的 host 不能直接创建 Worker Custom Domain；只支持受 Cloudflare 管理的目标 zone。若实际域名状态不同，应调整计划并再确认，不执行猜测性的 DNS 删除。[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

生产稳定后再审议关闭顶层 `workers_dev` 与 Version URL 的暴露面，保留受控 Previews；不要以会同时禁用必要预览的配置“顺手收尾”。预览公开且 noindex 不等于私有；未公开内容要另行评审 Access 与访问授权。

## 8. 回滚方案

| 故障阶段                    | 首选动作                                                              | 不能误认为已解决的事                                                 |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 仅 Preview 出问题           | 停止晋级，保留诊断信息，修复后重建                                    | 生产仍在 Pages，无须动 DNS                                           |
| Route 过渡后关键路径异常    | 按预批准 runbook 移除/恢复本次新增 Route，使原 Pages 绑定重新接收请求 | 若 Pages 基线已被别的部署改坏，撤 Route 也不够                       |
| Workers 上后续应用版本回归  | `wrangler rollback <已记录的版本 ID>` 或重新部署已验证的同 SHA 制品   | 不等于撤销 Route、DNS、所有 binding/外部数据变化                     |
| 已改为 Worker Custom Domain | 单独恢复 Pages 自定义域名与原 DNS/代理/规则，确认 TLS active          | `wrangler rollback` 无法把 host 改回 Pages；回退可能需要等待域名激活 |
| 将来动态数据 schema 回归    | 应用先向后兼容，按数据库备份/迁移 runbook 处理                        | 回滚 Worker 代码不会恢复 D1/KV/R2 数据                               |

回退前就保存版本 ID、配置、完整 `public/` artifact、manifest 与 Pages deployment；必要时用旧制品重新部署，不能假定平台永久保存任意历史版本。官方 Worker rollback 使用已存在的版本，但 binding 和外部资源存在约束。[Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

**触发条件：**首页/正文/索引大面积异常、关键 URL 错误重定向或 404、正文私密内容误发布、生产 noindex、资源 MIME 导致脚本失败、明显高于基线的 5xx/不可接受性能恶化，均停止后续发布；关键可访问性或安全故障不等待观察窗口结束。撤 Route 时暂停后续自动发布并同步回滚仓库中的路由配置，避免下一次 deploy 再次接管。切回 Pages 必须通过 Pages 的自定义域名流程恢复关联，不能只手动把 CNAME 指向 pages.dev；同时撤销冲突的 Worker Custom Domain。每次撤回后重新检查真实域名，不把控制台操作成功当恢复成功。[Pages 域名恢复要求](https://developers.cloudflare.com/pages/configuration/custom-domains/)

回退目标建议为“确认故障后 10 分钟内启动已演练的撤 Route/版本回退”，这是操作目标，不是 DNS/TLS 恢复 SLA。记录实际耗时，再决定能否满足项目需要。

## 9. 后续 API 与个性化扩展

第一阶段不创建数据库、会员账户、登录、AI key 或付费资源。以需求驱动增量能力：

| 需求                     | 优先落点                                      | 何时才引入后端                                   |
| ------------------------ | --------------------------------------------- | ------------------------------------------------ |
| 主题、列表密度、阅读模式 | 现有 token + localStorage                     | 跨设备同步/账户需求被确认后                      |
| 搜索                     | 现有静态 `contentIndex.json` / Agent 搜索索引 | 索引体积或查询体验达到明确阈值后，再选服务端检索 |
| 阅读量/反馈/订阅         | 独立 API + 限流、输入校验、隐私边界           | 收集什么、保留多久、后台如何使用先定清楚         |
| 收藏/个性化配置          | 身份验证后的 API，必要时 D1                   | 明确用户模型、删除/导出与数据隔离                |
| Agent 对话/异步任务      | Worker 接口 + 按需 Queue/DO/服务绑定          | 有真实产品场景、预算、鉴权和滥用控制后           |
| 大附件/媒体              | 当前外链；必要时 R2                           | 超过资产限制或出现上传需求时再迁移               |

未来只对明确路径设置 Worker-first，避免全站请求执行代码。加入 `worker/index.ts` 后的配置增量示意：

```jsonc
{
  "main": "worker/index.ts",
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api", "/api/*"],
  },
}
```

原因：较新的 compatibility date 在 `404-page` 下优先把浏览器 navigation 交给资产路由；若没有 `/api/*` 的 Worker-first 规则，直接在地址栏打开 API 与前端 fetch 可能得到不同响应。同时覆盖 `/api` 本身，测试 GET、HEAD、OPTIONS、错误方法与未知 API。非 API 的未命中请求在混合模式下仍可能调用 Worker，不能把费用估算简单等同于“成功 API 次数”。[Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)、[SSG navigation](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)

后端接口契约：

- 未知 API 返回 JSON 404，错误 method 返回 405；不回文章 HTML，不吞掉错误
- 非 API 回退使用 `env.ASSETS.fetch(request)`，不手写 URL→磁盘文件路由，不从 `public/` 打包整个索引进 Worker 脚本
- 为 Worker 单独生成运行时 binding types、tsconfig 与测试，避免给整个 Quartz 构建项目引入冲突的 runtime 全局类型
- API 返回明确缓存策略；个人数据 `private, no-store`，不能在公共 cache key 中忽略身份
- 写操作须有身份验证、输入 schema、请求体上限、CSRF/CORS 边界、限流与错误预算；AI 调用还要超时、用量预算和服务端 key 管理
- Preview 必须显式使用测试 bindings 和测试数据；别把“有单独 URL”误认为生产数据隔离
- D1 用关系数据；KV 用允许最终一致的轻量配置；R2 用对象；DO/Queue 用确定需要的状态协调/异步处理。引入每项前核对官方当前一致性、限制和计费，不能先一次性创建全套基础设施

## 10. 验收矩阵与发布门禁

下列项目由 implementation PR 提供结果表：基线 URL、候选 URL、源 SHA、预期、实际 status/headers/最终 URL、截图或断言、是否允许差异。样例路由必须从该次构建真实输出选取，不猜中文文章名。

| 范围              | 必测用例                                                                                   | 通过标准                                                  |
| ----------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 首页/正文         | `/`、长文、短文、中文路径、编码路径、`/en` 与英文文章                                      | 内容、title、canonical、语言不变，直接打开/刷新成功       |
| URL 规范化        | extensionless、`.html`、trailing slash、folder index、query、空格/中文                     | 无循环、无意外跨域；允许的平台状态码差异已登记            |
| 别名              | 真实 frontmatter alias、`/home` 等由输出确认的入口                                         | 原有内容目标保持；区分 HTML meta refresh 和 HTTP redirect |
| 错误页            | 根/深层随机路径、未知 `.js`/`.css`/图片                                                    | 真实 404，错误资源不返回成功 HTML                         |
| 导航              | 首屏→文章→hash→返回→前进、连续点击、重复打开/关闭搜索                                      | 地址栏与内容一致，无重复监听/空白页/卡死                  |
| 搜索              | 中文/英文、键盘上下/Enter/Escape、结果进入深层页                                           | 索引载入正确，搜索可用；预览不误访问生产索引              |
| SEO               | canonical、hreflang、OG、JSON-LD、RSS、sitemap、robots                                     | 全部生产 URL 正确，无预览域污染；生产无 noindex           |
| 机器接口          | llms、manifest、search-index、Markdown 文章                                                | 路径、Content-Type、结构与非私密内容范围保持              |
| 视觉/移动         | 320px、390px、宽屏 × 亮/暗；中文换行、200% 缩放                                            | 纸感 token 与紧凑 feed 不漂移，无横向裁切                 |
| Feed/图片         | 0/1/2/3 图、加载失败、中英文独立加载更多、文章→Back 保留数量                               | 日期同行，最多三张真实缩略图，尺寸与布局契约保持          |
| 品牌/专题         | `/brand`、所有 SVG/PNG/JSON/TXT 下载、wedding 页面                                         | 文件字节/类型正确，主题切换与下载交互可用                 |
| 缓存/发布         | ETag/304、HEAD、需要的 Range、旧标签页、新旧 CSS/JS、带版本参数的索引、跨版本 SPA 完整导航 | 无稳定路径 immutable 误缓存，无跨版本功能破坏             |
| Headers/redirects | 每条线上已确认规则、重定向链                                                               | 规则有效，安全头覆盖范围清楚，未知规则不遗漏              |
| 预览/安全         | PR reopen/closed、fork、noindex、secret/binding 隔离                                       | 无未经审核生产权限，cleanup 只影响对应 PR                 |
| 构建/容量         | 完整历史、lockfile、文件数、单文件上限、源/产物 manifest                                   | 精确 SHA 可追溯，无内部文件或秘密进入公开产物             |
| 性能/可观测性     | 固定样本冷/热加载、CSS/JS体积、LCP/CLS 与基线                                              | 不声称迁移必然提速；同条件测量，无明确回归                |
| 恢复              | 撤 Route、版本回退、Pages 恢复演练                                                         | 真实域名验证恢复；操作者与耗时已记录                      |

迁移验收沿用 #100 已实现的行为：双语菜单/语言切换、键盘搜索、按语言筛选 feed、返回后的展开数量、深层文章回首页的照片与根路径遮罩均需复测。#100 的 Pages 验收是历史基线，不能作为 Workers 已通过的证据；其已记录的返回位置漂移、时区与浏览器未测范围不在迁移文档中宣称已修复。

纯静态直达请求不经过自定义 `fetch` handler；不能只看 Worker 执行日志证明全站健康。结合可用的 zone/资产指标、既有 analytics、外部 HTTP smoke、浏览器 console 和 network。以后有 API 时再加结构化、脱敏日志与错误/延迟/CPU 告警；不为记录每次阅读而强制全站 Worker-first。

**切流硬门槛：**关键功能与 SEO/安全用例全绿；所有行为差异有人确认；无未解决的 CI 错误；成本与容量满足边界；候选版本和回退版本都能拿到；生产变更得到授权。

## 11. 成本与容量边界

以下为 2026-10-04 查阅的公开文档值，**不是用户账户套餐或账单的查询结果**，执行前复核。Cloudflare zone 的 Free/Pro 与 Workers 的 Free/Paid 是不同维度。

| 项目                       | 官方公开值                                                                                            | 对本项目的判断                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 原生静态资产请求与存储     | 静态请求免费、不限次数；资产存储无额外费用                                                            | 无脚本的第一阶段无需为每次阅读支付 Worker 执行费用             |
| Workers Free 脚本调用      | 每日 100,000 请求、每次 10ms CPU                                                                      | 同账户共享用量需核实；不把它当静态访问上限                     |
| Workers Paid Standard      | 最低 USD 5/月；含 1,000 万请求与 3,000 万 CPU ms/月；超出分别 USD 0.30/百万请求、USD 0.02/百万 CPU ms | 不为迁移自动升级套餐；动态需求出现时重新估算                   |
| 静态文件数                 | Free 每版本 20,000；Paid 每版本 100,000                                                               | 按每次产物实测，不按 Markdown 篇数推断                         |
| 单文件                     | 25 MiB                                                                                                | 搜索索引、聚合 llms、视频/大附件是需要关注的对象               |
| Workers Builds（若改用它） | Free 3,000 分钟/月；Paid 6,000 分钟/月，超出 USD 0.005/分钟；单次 20 分钟超时                         | 采用 GitHub Actions 时不套用这套构建计费；Actions 自身用量另查 |

来源：[Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)、[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)、[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)、[Builds limits/pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)

2026-10-04 初稿在隔离工作树按旧基线进行本地构建并复制 `extra-pages` 后，磁盘实际有 **2,100 个文件、106,155,532 bytes（约 101.2 MiB）**；最大文件 `/static/contentIndex.json` 为 **16,590,321 bytes（约 15.8 MiB，单文件上限约 63%）**。这是本地容量样本，不是 Cloudflare 已部署产物；构建有 Git 元数据警告，日期/顺序仍需在正式 CI 复核。该历史样本未触及当时资产限额；不能用它代表 #100 后的产物，实施时必须重新测量。搜索索引继续增长时应考虑裁减/分片，而不是等到单文件上限触发上传失败。

估算方法：纯静态保持原生资产路由；动态月成本按账户中全部 Worker 的 billable requests + CPU + 实际使用的存储/队列/AI/日志/构建计算。流量未知时不给“每月必定免费”或“最多 5 美元”的承诺。设置预算告警、必要的 CPU/request 防护；告警不是硬性花费上限。

`run_worker_first: true` 会把静态访问也变成脚本调用；Free 限额耗尽可能返回 429。开启 Workers Cache 又是另一项计费选择。两者都不在本次最小迁移范围。[资产计费边界](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## 12. 实施拆分与所需确认

| PR / 阶段               | 交付物                                                    | 预计工程量，仅供排期                | 是否影响生产       |
| ----------------------- | --------------------------------------------------------- | ----------------------------------- | ------------------ |
| 本文档                  | 选型、架构、runbook、验收矩阵                             | 已完成方案撰写后进入评审            | 否                 |
| M1 可复现构建与本地路由 | Wrangler、版本统一、preparation/parity scripts、必要测试  | 约 0.5–1.5 天                       | 否                 |
| M2 CI 与 Preview        | 可信构建/部署分离、环境配置、PR preview/cleanup、影子验收 | 约 0.5–1.5 天，取决于权限和现有规则 | 仅新增预览，需授权 |
| M3 Route 切流           | 配置快照、批准后的切流、观察、回退演练                    | 一个约定窗口 + 至少一个日常访问周期 | 是，单独确认       |
| M4 可选清退             | Custom Domain、停用旧自动发布、保留/删除策略              | 另排窗口，取决于 DNS/TLS 状态       | 是，单独确认       |
| E1 后续动态能力         | 从明确需求开始的单独 API PR                               | 不在迁移估时内                      | 另行设计与授权     |

这些是工程估计，不是承诺完成日期；账户连接、域名、令牌与已有缓存规则的未知项可能改变工作量。M1/M2 通过后再给切流窗口。

当前请求只覆盖技术方案与写入项目。**后续需要明确批准的动作**包括：合入实施 PR、创建或部署 Cloudflare 资源、配置持续部署、创建/扩大凭据权限、Route/DNS/域名/TLS/Access 变更、套餐付费与旧项目删除。账号/令牌由用户通过安全流程处理，不能发到聊天或代码中。文档 PR 合并本身也不等于这些动作获得授权。

## 13. 本方案的验证记录

### 初稿历史验证（2026-10-04，不能替代最新基线验证）

- 仓库事实从 `7b595545b1ea19eb880d5e2224238dbbc2f84223` 核对，独立 worktree，仅新增本文
- 官方行为、CLI 与公开价格于 2026-10-04 核对，引用均为 Cloudflare 一手文档
- 未读取 Cloudflare 私有仪表盘；未创建 Worker、Preview、token、数据库或 DNS 记录
- 文档中的配置与命令是实施模板；没有声称已在用户账户部署通过，也没有把 dry-run 等同线上验收
- 已通过本地 `npm run check`（TypeScript + 全仓 Prettier）与 `npm test`（含 design 检查）；本地 Node `24.19.0` / npm `11.9.0`，复用现有且 lockfile 与基线一致的依赖；未将其声称为一次新的 `npm ci` 或 CI Node 22 全平台验证
- 本地验证执行 `npm run update-homepage` → `node quartz/bootstrap-cli.mjs build` → 复制 `extra-pages/*`，没有执行外层 Git fetch，也没有执行 `sync`；产物容量见第 11 节。构建成功但出现 native Git 元数据、punycode deprecation 与 KaTeX 字符 metrics 警告；不是可直接晋级的生产候选
- 构建引起的 `scripts/cards-data.json` 派生变化已从文档提交排除；没有更改作者内容、UI、依赖、CI 或部署配置
- 文档站 `node quartz/bootstrap-cli.mjs build --bundleInfo -d docs` 已通过；相对链接存在性、四个 JSONC 示例语法、Prettier 与 diff whitespace 已检查。远端 CI 另见本 PR；尚未安装/运行 Wrangler，未做 Workers 本地路由测试或线上迁移验收

本次文档合并只保留并更新方案，不启动迁移。后续获得实施授权后，从 M1 的可复现构建与最小静态配置开始，不把首页视觉改造或未来 API 一次性塞进迁移 PR。

### 最终复核（2026-10-09）

- 对照最新 `v4`（`08bb31e6`）、已合并 #100、`package.json`、首页组件/布局/脚本、资源版本逻辑及三份现有技术文档复核；仅更新本文，不改运行代码或部署配置。
- 更新旧首页提案状态、生产构建链、生成器退出保护、双语首页/照片遮罩/Feed 验收与跨版本资源行为；保留通用 hosting 指南与本项目迁移方案的分工。
- 官方 Previews 起步、HTML handling 与 headers 文档于 2026-10-09 重读，仍支持文中 Wrangler 最低版本、307 规范化与默认 revalidation 说明。价格/限额表保留明确的 2026-10-04 查询日期，不作为新的账户或报价核验。
- 最新基线本地验证结果与远端 CI 在 PR #98 的最终处理记录中列出；初稿 CI 成功不作为最新兼容性证据。
- 未安装或运行 Wrangler，未读取私有 Cloudflare 配置；未部署 Workers、修改 DNS、Route 或生产流量。
