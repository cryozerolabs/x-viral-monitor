# Chrome Web Store Listing Draft — X Viral Monitor v1.7.0

Use this draft for the Chrome Web Store v1.7.0 submission after final human approval.

---

## English

### Short Description

Spot viral tweets on X, filter low-velocity noise and List non-members, read long screenshots, draft Grok replies.

### Detailed Description

X Viral Monitor turns X (Twitter) into a local control panel for spotting, filtering, reading, and engaging with fast-moving posts. It works on x.com and pro.x.com, with no analytics and no third-party data collection for free features.

NEW IN 1.7.0 — XVM PRO

- Hot-only filter: hide low-velocity posts using views-per-minute and total view thresholds.
- Separate settings for short posts and long X Articles.
- Scope controls for Home, Lists, Profiles, and Tweet detail pages.
- X List member filter: add X Lists, fetch members, and show only posts from saved List members.
- Real List metadata: displays List name, description, owner, member count, and subscriber count.
- Floating panel switches: toggle Hot only and List members directly on X, synced with the popup.
- Pro gating: Free users see disabled Pro switches; Trial and Pro users can enable the filters.
- Safer restore behavior: turning one filter off does not reveal posts hidden by the other filter.

CORE FEATURES

- Velocity badges on tweets with views/hour, engagement, bookmark count, and viral score.
- Draggable floating leaderboard for the fastest-growing visible posts.
- Copy posts as clean Markdown from the X share menu.
- Thank-you Star Chart for retweets and quotes.
- Enhanced photo viewer with zoom, pan, hotkeys, and long-screenshot reading mode.
- Grok reply assistant using X's own Grok endpoint, with editable prompt templates.

PRIVACY

- Free features run locally in your browser.
- No analytics, no tracking pixels, no third-party data collection.
- The extension reads only x.com / pro.x.com pages you are already viewing.
- Pro license checks send only the license key through a Cloudflare Worker proxy.
- X List metadata and member identifiers are fetched from X with your current X session and cached locally in chrome.storage; they are not uploaded to XVM servers.
- Open source: https://github.com/Icy-Cat/x-viral-monitor

COMPATIBILITY

- x.com and pro.x.com
- English, Chinese, and Japanese UI

### Category

Tools

### Languages

English, Chinese, Japanese

---

## 中文

### 简短描述

在 X 上识别爆款、过滤低流速噪音和非 List 成员推文、阅读长图、生成 Grok 评论。

### 详细描述

X Viral Monitor 把 X (Twitter) 变成一个本地内容控制台：识别正在起量的推文、过滤低质量信息流、阅读长图、整理互动对象。支持 x.com 和 pro.x.com。免费功能不含统计埋点, 不采集第三方数据。

v1.7.0 新增 — XVM Pro

- 仅看热帖: 用 views/min 和总浏览量双阈值隐藏低流速推文。
- 短推和 X Article 长文可分别设置阈值。
- 首页、List、博主主页、推文详情页可独立配置作用域。
- X List 成员过滤: 添加 X List, 抓取成员, 只显示已保存 List 成员的推文。
- 真实 List 信息: 显示 List 名称、描述、创建者、成员数和订阅数。
- 悬浮面板开关: 在 X 页面直接切换“仅看热帖”和“仅看 List 成员”, 与 popup 双向同步。
- Pro gating: Free 用户可看到灰色 Pro 开关; Trial 和 Pro 用户可启用过滤。
- 安全恢复: 关闭其中一个过滤器时, 不会误恢复另一个过滤器隐藏的推文。

核心功能

- 推文流速徽章: 显示 views/hour、互动、收藏数和 viral score。
- 可拖拽悬浮流速榜: 排出当前页面可见推文中增长最快的内容。
- 一键复制推文为 Markdown。
- Thank-you Star Chart: 可视化转推和引用你推文的人。
- 增强图片查看器: 支持缩放、拖拽、快捷键和长截图阅读模式。
- Grok 评论助手: 调用 X 自带 Grok endpoint, 支持自定义 prompt 模板。

隐私

- 免费功能完全在本地浏览器运行。
- 无分析埋点、无跟踪像素、无第三方数据采集。
- 只读取你正在浏览的 x.com / pro.x.com 页面。
- Pro license 校验只通过 Cloudflare Worker 代理发送 license key。
- X List 信息和成员标识会使用你当前的 X 登录态从 X 获取，并仅缓存到本地 chrome.storage；不会上传到 XVM 服务器。
- 开源地址: https://github.com/Icy-Cat/x-viral-monitor

兼容性

- x.com 和 pro.x.com
- 英文、中文、日文界面

### 分类

工具

### 语言

英文、中文、日文
