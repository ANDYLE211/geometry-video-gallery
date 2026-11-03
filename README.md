# Geometry Lab · 几何算法视频作品集

展示计算共形几何、最优传输与流体模拟的研究和实现成果，用视频呈现抽象算法与可视化效果。

支持分类筛选、关键词搜索、自定义默认排序、日期排序和视频详情查看，视频通过 B 站播放器在线播放。网站使用原生 HTML、CSS 和 JavaScript 构建，公开展示无需后端或 Node.js，可部署至 GitHub Pages。

## 本地预览

在项目目录运行：

```bash
python3 -m http.server 8080
```

浏览器访问 http://localhost:8080。页面需通过 HTTP 加载视频数据，请勿直接双击打开 `index.html`。

## 内容维护

- `data/videos.json`：维护视频标题、分类、摘要、详细介绍、标签和 BV 号。
- `assets/`：存放封面、样式和脚本；本地封面在 `cover` 字段填写相对路径，如 `assets/HODGE4.31.png`。
- `index.html`：页面结构与首页介绍。

新增视频时复制一条现有记录，保持 `id` 唯一，并填写 `publishedAt`（`YYYY-MM-DD`）用于日期排序。

### 编辑默认排序

在项目目录运行本地维护服务（仅使用 Python 标准库）：

```bash
python3 serve.py
```

打开 http://127.0.0.1:8080/?edit=1#works 进入编辑模式（端口被占用时可用 `--port 8081`）。

- 勾选视频的「置顶」，或设置整数「权重」，页面会即时按默认排序预览。筛选、搜索不影响其他视频的设置。
- 默认顺序为：分类顺序（计算共形几何 → 最优传输 → 流体模拟）→ 组内置顶优先 → 组内权重从高到低 → 日期从新到旧。全部作品按完整分类分组展示，置顶和权重不会打乱组间顺序。未设置的权重为 `0`，默认不置顶。
- 点击「保存为默认排序」，会将 `pinned` 和 `sortWeight` 写入 `data/videos.json` 并退出编辑模式；「取消」不会写入数据。
- 保存后提交并推送 `data/videos.json`，部署完成后所有访客都会看到相同的默认顺序。普通页面不会出现编辑控件，不依赖浏览器本地存储。
- 排序编辑仅在本地维护服务中可用，GitHub Pages 和 `python3 -m http.server` 只支持展示。

测试：`node tests/video-order.test.cjs`、`node tests/app-loading.test.cjs` 和 `python3 -m unittest discover -s tests`。

## 部署

在仓库的 **Settings → Pages** 中，将发布来源设为 **GitHub Actions**。推送至 `main` 分支后，现有工作流会自动部署网站。

部署时由 `build_site.py` 生成 `_site/`，自动为脚本、样式和视频数据请求添加相同的内容版本号，避免新旧缓存混用；修改排序数据也会更新版本号。本地维护仍使用源文件，无需构建。
