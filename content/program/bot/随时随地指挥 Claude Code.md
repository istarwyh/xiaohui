---
created: 2025-08-09T15:03:38+08:00
modified: 2025-11-23T23:29:10+08:00
published: 2025-08-09T15:03:38+08:00
---

## 用手机提 PR

上周我结合在手机上 AI Coding ，给 Nacos 的项目提了一个 PR： https://github.com/nacos-group/nacos-mcp-router/pull/37

这怎么搞的呢？ 其实步骤和原理都比较简单，一个项目通过 Web 端代理 Claude Code 在 terminal 中的交互, 一个项目将 Web 页面暴露到公网即可。

## 快速开始

### 1. 本地启动 claudecodeui

项目地址：https://github.com/siteboon/claudecodeui

选好一个目录执行以下命令：

```shell
git clone https://github.com/siteboon/claudecodeui.git && cd claudecodeui &&
npm install && cp .env.example .env && npm run dev
```

如果有偏好的话，可以更改 `.env` 中配置比如端口，默认就是 3009 端口避免和常见端口冲突。

### 2. 通过 ngrok 访问本地端口

MacOS 直接打开： https://dashboard.ngrok.com/get-started/setup/macos

Windows 系统直接打开： https://dashboard.ngrok.com/get-started/setup/windows

![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202508082343927.png)

按照 Ngrok 的页面上说明按照步骤操作即可，注意需要选择静态域名方便后面移动端访问。

绑定域名之后启动 ngrok:

```bash
ngrok http --url=your-static-domain 3009
```

可以看到控制台上显示暴露出来公网域名 your-static-domain ，并且这个域名指向本地的 3009 端口。

![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202508082204638.png)

这时通过 your-static-domain 就可以访问 claudecodeui 了，效果示例： ![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202508082159579.png)

### 3. 愉快远程使用 CC

Cloud Code UI 巧妙地将命令行工具的强大功能转化为现代化的 Web 体验，让 AI 编程真正做到"随时随地"。而且我们可以语音输入，也可以同时开始多个对话，让 CC 在电脑上同时干活。不过除了 AI Coding, 远程使用 CC 本质上是给予了我们一个私人 Agent ，它可以被授权访问自己电脑上任意工作目录、和我们做一样的工作而不会泄露任何隐私和数据！

这其实也对应着某种创业机会，相比于 Manus 这些希望提供云端 Agent 功能的公司。

其实这篇文章大部分内容也是手机上 Claude Code 帮我完成的，包括后面介绍项目技术原理的部分 ：）

![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202508082212261.png)

## 展望：每个人的私人助理

**每个人都可以拥有一个与 AI Agent 共同协作的私人移动工作空间**，每个人不管什么职业、身份都可以有自己的私人助理，24 h 待命。因为我对象之前是班主任 ，我让 AI 写了个小故事说明老师怎么用CC 或者说 Agent 来帮助自己的工作。也不知道真不真实，图一乐。

---

"张老师！刘小雨又没写作业！"上午第二节下课，班长王朵朵冲进办公室告状。小张老师刚想发火，手机"叮"的一声——家长群里炸了锅。

刘小雨妈妈："老师，孩子说作业太难了，全班都不会..."

王朵朵妈妈："我家孩子说数学作业写到11点..."

李豆豆爸爸："是不是作业布置太多了？现在不是说要减负吗？"

小张老师眼前发黑。她知道接下来要发生什么——23个家长会轮流上阵，从作业量吵到教育政策，最后变成"老师不负责任"的批斗大会。上次类似事件，她被校长叫去谈话，回家路上边开车边哭。

于是小张老师开始和 CC 对话，CC 的工作目录就在桌面。她问 CC 马上要和家长吵起来了怎么办，CC 立即开始干活：调出她上学期家长会做的《学生作业困难调查》PPT（她自己做的问卷，有家长填写的真实数据）；翻出她存了3年的《家长常见问题及标准回答》文档；找出她之前处理类似争议的微信群话术模板。

三分钟后，小张老师发群里："各位家长，关于作业难度问题，我上学期做过问卷调查，全班32名家长中，18人反馈孩子能在30分钟内完成，8人需要1小时，6人超过90分钟。针对刘小雨同学的情况，我建议：1.先让孩子口述解题思路再动笔；2.把错题拍照我统一讲评；3.实在不会的题标星号我重点讲解。附上我上学期做的《如何辅导数学作业》供大家参考..."

群里瞬间安静。十分钟后，刘小雨妈妈发了个红包："老师辛苦了，买杯咖啡。"王朵朵妈妈发了个"老师最棒"的表情包。连平时最爱挑刺的李豆豆爸爸都发了句："张老师比我们有方法。"

之后每次家长会，小张老师还会把CC整理的"家长常见问题及标准答案"打印出来，发给大家。有老师问她秘诀，她笑笑说："哪有啥秘诀，有个 Agent 一直帮你看事就可以了"。

---

## 📋 注意事项

1. Ngrok 目前的免费计划每个月有流量限制，静态域名也只能开一个。开源免费的有 Ngrok 1.0
2. 远程运行 claudecodeui 的电脑如果休眠了，端口将会关闭。对于 Mac 用户可以在 “电池” 选项卡中开启“屏幕关闭电脑不休眠” 选项。 ![](https://xiaohui-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/image/202508091129981.png)
3. 手机上远程使用 shell 暂不支持

以下面向技术同学，从架构和交互时序层面介绍 Ngrok 和 claudecodeui 两个项目的技术原理。

## 原理介绍

### Ngrok

```mermaid
sequenceDiagram
    participant Public User
    participant Ngrok Server
    participant Ngrok Client
    participant Claude Code UI

    Public User->>+Ngrok Server: 发送 HTTP 请求 (访问 https://random-id.ngrok.io)
    Ngrok Server-->>-Ngrok Server: 根据域名查找绑定的隧道 (Tunnel)
    Note over Ngrok Server: **隧道建立**<br>Ngrok Client 启动时就已与 Ngrok Server 建立的 TCP 长连接
    Ngrok Server->>+Ngrok Client: 通过隧道转发请求数据
    Note over Ngrok Client: **隧道内数据中转**
    Ngrok Client->>+Claude Code UI: 将请求转发到本地端口 (例如 localhost:3000)
    Note over Claude Code UI: **本地应用处理请求**
    Claude Code UI-->>-Ngrok Client: 返回 HTTP 响应数据
    Ngrok Client->>+Ngrok Server: 通过隧道转发响应数据
    Ngrok Server->>+Public User: 返回 HTTP 响应
```

隧道(Tunnel): 一个持续开放、安全可靠的 TCP 连接，通过多路复用技术高效地承载着从公网到本地的请求，以及从本地到公网的响应，从而完美地解决了内网服务暴露到公网的难题。

### CloudCodeUI

#### 系统架构概览

ClaudeCodeUI 采用现代化的三层架构设计，通过 Web 界面为 Claude Code CLI 提供跨平台支持：

```mermaid
graph TB
    subgraph "客户端层"
        A[移动端浏览器]
        B[桌面端浏览器]
        C[平板端浏览器]
    end

    subgraph "Web UI 层"
        D[React 前端应用]
        E[响应式界面组件]
        F[WebSocket 客户端]
    end

    subgraph "服务端层"
        G[Express API 服务器]
        H[WebSocket 服务器]
        I[身份验证中间件]
        J[文件系统 API]
    end

    subgraph "核心层"
        K[Claude Code CLI]
        L[项目管理系统]
        M[会话存储]
    end

    subgraph "数据存储层"
        N[SQLite 数据库]
        O[项目文件系统]
        P[会话历史文件]
    end

    A & B & C --> D
    D --> E & F
    E & F --> G & H
    G & H --> I & J
    I & J --> K & L & M
    K & L & M --> N & O & P

    style A fill:#e1f5fe
    style B fill:#e1f5fe
    style C fill:#e1f5fe
    style K fill:#f3e5f5
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#fff3e0
```

#### 完整交互时序图

以下时序图展示了用户从打开应用到完成 AI 编程任务的完整流程：

```mermaid
sequenceDiagram
    participant U as 用户设备
    participant F as React 前端
    participant W as WebSocket
    participant S as Express 服务器
    participant C as Claude CLI
    participant FS as 文件系统
    participant DB as SQLite 数据库

    Note over U,DB: 1. 应用启动与项目发现
    U->>F: 打开 Web 应用
    F->>S: 请求身份验证
    S->>DB: 验证用户凭据
    DB-->>S: 返回用户信息
    S-->>F: 返回访问令牌

    F->>S: 获取项目列表
    S->>FS: 扫描 ~/.claude/projects/
    FS-->>S: 返回项目元数据
    S->>DB: 存储项目信息
    S-->>F: 返回项目数据
    F-->>U: 显示项目列表

    Note over U,DB: 2. 建立实时连接
    F->>W: 建立 WebSocket 连接
    W-->>F: 连接确认

    Note over U,DB: 3. 用户选择项目与会话
    U->>F: 选择项目/会话
    F->>S: 请求会话历史
    S->>FS: 读取 JSONL 会话文件
    FS-->>S: 返回历史消息
    S-->>F: 返回格式化消息
    F-->>U: 显示聊天历史

    Note over U,DB: 4. AI 对话流程
    U->>F: 输入编程需求
    F->>W: 发送消息 (WebSocket)
    W->>S: 转发用户消息
    S->>C: 启动 Claude CLI 进程

    Note over C: Claude 处理请求
    C->>FS: 分析项目文件
    C->>FS: 执行代码操作

    loop 流式响应
        C-->>S: 返回部分响应
        S-->>W: 转发响应流
        W-->>F: 实时更新界面
        F-->>U: 显示实时输出
    end

    Note over U,DB: 5. 文件操作与同步
    C->>FS: 修改/创建文件
    FS-->>S: 文件变更通知
    S->>W: 广播文件更新
    W-->>F: 更新文件树
    F-->>U: 刷新界面状态

    Note over U,DB: 6. 会话持久化
    S->>FS: 保存会话 JSONL
    S->>DB: 更新会话元数据
    DB-->>S: 确认存储
    S-->>F: 会话保存完成

    Note over U,DB: 7. 跨设备同步 (可选)
    S->>W: 广播项目状态更新
    W-->>F: 同步到其他设备
```
