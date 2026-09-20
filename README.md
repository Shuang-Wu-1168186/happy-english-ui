# happy-english-ui

Happy English 独立前端，使用 **React + TypeScript + Vite + React Router**，通过同级 `happy-english` 项目的 FastAPI 接口读取和保存数据。

**迁移要求：学习端以原 `HappyEnglish` 系统的 UI 为准，保留页面布局、配色、字体、文案、图片、控件位置与交互，只替换前后端技术架构。后台管理与学习端分离，使用独立的后台工作台和侧边栏导航。** 运行时不依赖 Flask / Jinja，也不依赖原项目目录。

## 本机启动

依赖已安装。先启动后端，然后执行：

```sh
cd /Users/wushuang/projects/happy-english-ui
npm run dev
```

打开 <http://127.0.0.1:5173>，使用原系统的用户名、密码登录。开发服务把 `/api` 和 `/static` 代理到 `http://127.0.0.1:8000`。

另一个终端启动后端：

```sh
cd /Users/wushuang/projects/happy-english
sh scripts/dev.sh
```

## 配置

复制 `.env.example` 为 `.env.local` 后可按需修改：

- `API_PROXY_TARGET`：开发服务器代理到的后端地址，默认 `http://127.0.0.1:8000`。
- `VITE_API_BASE_URL`：构建后使用的 API 来源，默认留空，配合生产同域 `/api`、`/static` 反向代理。若设置为独立来源，需要同时配置后端 CORS，并保证 Cookie 可在浏览器同站策略下发送。

所有 `VITE_` 变量都会进入浏览器代码，只填写公开地址。开发代理仅在 `npm run dev` 下生效；生产部署参考 `deploy/nginx.conf`。

## 页面

- 原版蓝紫导航与四个折叠模块分组；管理员显示九个模块，普通学习者沿用原系统的六个可见模块。
- 关键词搜索、分类筛选、分页和卡片前后翻阅。
- 课本逐句阅读、儿童卡片例句与词族、拼读小测验、面试回答分段。
- 学习笔记、听写检查及提示；翻页自动保存进度，通过原有 Continue Study 入口恢复位置。
- 浏览器朗读；后端启用音频服务后可调用 Kokoro 朗读、录音并提交跟读评估。
- 登录、注册、个人资料和密码修改。
- 独立后台工作台：内容编辑和图片上传、用户创建及角色和状态管理、登录监控。
- 桌面与移动端布局。

管理员登录后，点击学习首页右上角 Logout 旁的 **后台管理** 进入 `/admin`。后台侧边栏中的 **内容管理** 维护卡片、学习笔记、图片和面试题，**用户管理** 维护用户，**登录监控** 查看登录来源与时间。旧地址 `/manage`、`/manage?resource=interviews`、`/users`、`/login-monitor` 会自动跳转到对应的 `/admin/...` 页面。普通学习账号不显示管理入口，管理页面及接口仍校验管理员权限。

学习页面按原 Jinja 模板的结构重写为 React，原 CSS 仅添加页面作用域，避免不同模块之间互相覆盖。原背景图、教材人物图片、Bootstrap 5.3.3 和 StPageFlip 2.0.7 已放到本项目前端资源中。儿童卡片、笔记、数学卡片保留原翻书效果；日常英语、词汇与面试保留横向卡片。

`/english/home`、`/english/cards`、`/english/note-cards` 等旧学习链接仍可打开对应页面。录音最多 60 秒，需要浏览器麦克风权限及 localhost / HTTPS；跟读评估依赖后端音频服务。朗读服务不可用时回退到浏览器语音。

本机后端已安装 Kokoro 语音依赖，并设置 `AUDIO_ENABLED=true`，使用原系统缓存的模型及音色（英语 `bf_vale`、中文 `zf_001`）。已验证本地模型能够离线合成中英文语音。修改音频配置后，需重启后端并刷新网页；IDEA 调试运行的后端也必须重新运行。可检查 `/api/auth/session` 的 `audio_enabled` 是否为 `true`，以及朗读时是否成功请求 `/api/audio/tts`。

卡片上传图片由后端 `../happy-english/data/static/uploads/` 提供，页面通过 `/static/uploads/…` 访问。原系统与新后端共用数据库，但上传目录各自独立；迁移后若仍在旧系统新建卡片，需要把旧项目 `loginapp/static/uploads/` 中新增的图片按原相对路径补到新后端，不能只同步数据库。补迁时检查源文件非空、保留新后端已有文件，并通过前端 `/static/…` 地址验证图片。新管理页面上传的图片直接保存到新后端目录。

## 开发与验证

```sh
npm ci
npm run dev
npm run build
npm run lint
npm run test:e2e
npm run test:visual
```

端到端测试需要同级后端已安装 `requirements-dev.txt`，并有 Playwright Chromium：`npx playwright install chromium`。测试自动启动 8011 端口的隔离后端和 5174 端口的前端；使用临时 SQLite 数据库，不连接真实 MySQL。覆盖原版角色入口、搜索、卡片隐藏、位置跳转、自动进度、拼读、词卡学习标记、笔记听写、九模块桌面与移动布局、内容增删改、注册和资料修改。

视觉回归的基准图直接由原 Jinja 页面生成，位于 `e2e/reference/`，使用与集成测试相同的数据。`npm run test:visual` 对照登录、首页和各学习页面；基准环境为 macOS Chromium、1280 × 900，其他系统字体和 emoji 可能有差异。构建与功能测试不依赖原项目或 Jinja。

原样式来源为 `/Users/wushuang/Desktop/606GIS/HappyEnglish/loginapp`。需要同步原版 CSS 时运行：

```sh
npm run import:styles -- /path/to/HappyEnglish
```

此脚本只提取原样式、添加页面作用域并改写本地图片路径；同步后必须重新执行截图对照。

```text
src/
  components/study/  # 原版各学习页的 React 组件与翻书集成
  styles/            # 从原系统迁入并隔离作用域的 CSS
  components/        # 导航与旧路由兼容
  pages/             # 首页、学习、登录、管理和个人设置
  lib/               # API 请求、会话、模块定义
  App.tsx            # 路由与访问控制
  index.css          # 样式入口与必要的集成适配
public/original/    # 原背景与教材图片
public/vendor/      # 原版 Bootstrap 与 StPageFlip
scripts/            # 原样式同步脚本
e2e/                # 浏览器功能测试、原版截图基准与视觉回归
deploy/nginx.conf   # 生产反向代理示例
```

Vite 模板与代理配置参考 [Vite 文档](https://vite.dev/guide/)。前端仅负责展示和交互，管理员授权由后端再次验证。

## 部署

`npm run build` 生成 `dist/`，可独立放到静态服务器上。配置 History API 回退到 `index.html`，并代理 `/api` 与 `/static` 到后端。

提供 `Dockerfile` 和 Nginx 配置。默认上游主机为 `happy-english:8000`，需要在容器网络中提供同名后端服务，或按实际地址修改 `deploy/nginx.conf`。上线时在入口配置 HTTPS。
