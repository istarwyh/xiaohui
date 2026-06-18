---
created: 2026-01-31T20:03:52+08:00
modified: 2026-04-07T00:07:40+08:00
published: 2026-01-31T20:03:52+08:00
---

Claude Code 是非常强大的通用智能体工具。只能怪他这个名字没起好，Code 总让人觉得它和代码有关。但是它什么都能做，我们公司的业务、运营和设计同学在反复宣传下也都上在日常工作中使用了 Claude Code。不过公司内部自己有部署和购买的的模型，正常用户使用 Claude Code 20 美刀起步，而且很多海外模型还得时刻挂着梯子，用国内的 GLM、MiniMax 也得花钱。以下我介绍几个完全免费、国内直连的方案。其中一个我已经用了几个月省了 1 千多美刀。

---

下面的内容在 https://aispeeds.me 的网站上有更详细的介绍。

### Nvidia 官方

英伟达（NVIDIA）NIM 平台提供了免费的开源模型可以访问，并且提供 API 调用。

1. 登录 https://build.nvidia.com
2. 创建好账号
3. 在右上角账号设置里选择 API Keys,之后创建 API Key

![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260124125319396.png)

注意 Claude Code 默认走的是 Anthropic 协议，但英伟达 NIM 接口(https://integrate.api.nvidia.com/v1) 是兼容 OpenAI 格式的。所以我写了一个代理转发英伟达的OpenAI 接口变成 Antropic的接口协议，拿到 API key 以后你只需要运行下面命令即可：

```shell
alias claude="ANTHROPIC_API_KEY=nvapi-xxx ANTHROPIC_BASE_URL=https://aispeeds.me claude"
```

### Any Router

这是一个免费提供 Antropic Haiku、Sonnet 和 Opus 模型 token的公益站点，我迄今没有在上面充过一块钱（它也不支持充值，只是要签到和拉新）。讲道理，我实在不知道这个公益站怎么这么公益。有人说这个站点会出售用户数据，我想说相比我用的 1080 美刀 token，我的开源代码数据卖就卖吧。

1. 登录 https://anyrouter.top/register?aff=4Ly0
2. 创建好账号
3. 在 “API 令牌” 中创建 key

![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/20260124200939231.png)

通过我的链接注册 Any Router 使用 Claude Code，你可以多获得 50$ 的额度。

```sh
alias anyrouter="ANTHROPIC_AUTH_TOKEN=sk-xxxxxx ANTHROPIC_BASE_URL=https://anyrouter.top claude"
```

必须说明 Anyrouter 很不稳定，不能指望他每时每刻都可以使用。不过他一分钱都不收，实在没什么好说的。因此 Anyrouter 可以作为主力来使用，但是需要有其他方案来做 backup。

### Ollama Antropic

Ollama 现在正式适配 Anthropic 的 API 接口,我们可以使用本地运行的模型接入到Claude Code中使用。从此只要电费，在实现财务自由之前先实现个人算力自由：）

1. 首先下载 https://ollama.com/download
2. 然后打开随便问个问题，默认就会给你下载 gpt-oss:20b
3. 执行以下命令：

```sh
alias claude="ANTHROPIC_AUTH_TOKEN=ollama ANTHROPIC_BASE_URL=http://localhost:11434 claude --model gpt-oss:20b"
```

Ollama本地模型可以用来处理一些简单的Agent任务，更重要的是不怕数据泄露了，在无网络的的场景下也可以处理些工作，速度也挺快。

⚠️ gpt-oss :20b 就需要12.8GB 的存储空间，解压运行后更大

### 借用 Antigravity 反向代理

Antigravity 是 Google 为了避免市场被 Cursor、Windsurf、Claude Code 这些 编辑器 都被抢完后推出的编辑器，目前科学登录后是免费使用Gemini 相关 API 的。本地通过Antigravity-Manager: https://github.com/lbjlaq/Antigravity-Manager 可以反向代理编辑器提供的 API，从而免费使用 Claude Code。

1. 安装Antigravity-Manager

```sh
brew tap lbjlaq/antigravity-manager https://github.com/lbjlaq/Antigravity-Manager

brew install --cask antigravity-tools
```

2. 启动 Antigravity，并在“API 反代”页面开启服务。
3. 在终端执行：

```shell
export ANTHROPIC_API_KEY="sk-antigravity"
export ANTHROPIC_BASE_URL="http://127.0.0.1:8045"
claude
```

如果有其他问题可以参阅这个项目的README，比较详细。

### FreeLLMAPI — 免费 LLM 全家桶

前面四个方案各走各的路，有没有人把它们整合到一起？有的，[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) 就是一个开源聚合层，把 16+ 个免费 LLM 提供商的 API 接到一个统一的端点，每月约 **17 亿免费 token** 池，智能路由自动故障转移。

它覆盖了上面提到的 NVIDIA NIM、Google Gemini（相当于 Antigravity 的正规渠道），还加上 Groq、Cerebras、OpenRouter（21 个免费模型）、GitHub Models（GPT-4.1/4o）、Cloudflare、HuggingFace 等。本质上，你把 FreeLLMAPI 部署好后，就不用管哪个源今天额度用完了——它内部有 `RPM/RPD/TPM` 计数器，遇到 429 或超时自动切换到下一个可用模型。

部署方式：

```sh
git clone https://github.com/tashfeenahmed/freellmapi.git
cd freellmapi
npm install
npm run build
npm start
```

启动后访问 `http://localhost:3000`，在管理面板填入各提供商的 API Key（没有的跳过即可），然后拿到统一 API Key 就能用了。FreeLLMAPI 提供了 OpenAI 兼容的 `/v1/chat/completions` 端点，也做了 Anthropic Responses API 的翻译层，可以直接对接 Claude Code。

对于 Claude Code 使用，配置方式类似：

```sh
alias claude="ANTHROPIC_BASE_URL=http://localhost:3000/v1 ANTHROPIC_API_KEY=freellmapi-xxxxx claude"
```

⚠️ 需要注意的是：免费源毕竟有日配额，越是顶级的模型（Gemini、GPT-4.1 等）越早耗尽，router 会逐级降级到更小的模型。重度使用时会感觉"越用越笨"。另外 Cohere 的 ToS 明确禁止非家庭用途，NVIDIA 仅限评估，建议阅读项目的 ToS 合规说明。

总结一下 FreeLLMAPI 的价值：**它不提供新的免费源，而是把分散的免费源变成一个可运维的统一入口**。如果你不想在各个平台注册、不想手动切换模型，这可能是最省心的方案。

## 📰 总结

简单比较下五个方案：

| 方案                  | 稳定性     | 使用难度 | 最佳场景              |
| --------------------- | ---------- | -------- | --------------------- |
| **Nvidia NIM**        | ⭐⭐⭐⭐⭐ | 简单     | 生产环境首选          |
| **Any Router**        | ⭐⭐⭐     | 中等     | 备用方案+薅羊毛       |
| **Ollama 本地**       | ⭐⭐⭐⭐⭐ | 简单     | 无网络/隐私优先       |
| **Antigravity反代**   | ⭐⭐⭐     | 较难     | 日常备用              |
| **FreeLLMAPI**        | ⭐⭐⭐⭐   | 中等     | 一站式聚合+自动切换   |

NIM 和 Ollama 基本实现个人算力自由，AnyRouter 十分划算，Antigravity反代还能薅，FreeLLMAPI 则是把上面这些（还有其他十多个源）统一管起来的全家桶方案。
