# Geometry Lab · 几何算法视频作品集

展示计算共形几何、最优传输与流体模拟的研究和实现成果，用视频呈现抽象算法与可视化效果。

支持分类筛选、关键词搜索、日期排序和视频详情查看，视频通过 B 站播放器在线播放。网站使用原生 HTML、CSS 和 JavaScript 构建，无需后端或 Node.js，可部署至 GitHub Pages。

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

## 部署

在仓库的 **Settings → Pages** 中，将发布来源设为 **GitHub Actions**。推送至 `main` 分支后，现有工作流会自动部署网站。
