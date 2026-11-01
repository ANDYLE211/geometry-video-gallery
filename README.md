# Geometry Lab · B站视频作品展示网站

无需后端和 Node.js，原生 HTML/CSS/JavaScript + GitHub Pages。视频通过 B站官方站外播放器嵌入，GitHub 仓库只保存网页、封面和视频元数据。

> `data/videos.json` 根据两份 Lays_chip 投稿页 MHTML 快照整理，当前保留 40 条视频，封面已提取到 `assets/`。第二份快照导入指定的 5 条几何视频和 4 条流体视频；分类和搜索标签根据内容整理。已移除不展示的投稿，将生成模型视频合并至最优传输，将图形学与渲染视频合并至流体模拟，将“持续上同调”归入计算共形几何。快照页面标示共 109 条投稿，当前清单不是全部投稿；部分简介在原页面已被截断。

## 目录结构

```text
geometry-video-gallery/
├── index.html                  # 首页、作品列表、视频详情弹窗
├── assets/
│   ├── hero-geometry.jpg       # 首页棋盘格曲面原图
│   ├── app.js                  # 筛选、搜索、BV 嵌入、详情和路由
│   ├── styles.css              # 深色科技风响应式样式
│   ├── favicon.svg
│   └── cover-*.svg             # 本地 SVG 示例封面
├── data/
│   └── videos.json             # 唯一需要日常更新的视频清单
├── .github/workflows/deploy.yml # 提交 main 自动部署
├── .nojekyll
└── README.md
```

## 1. 本地预览

在该目录运行：

```bash
python -m http.server 8080
```

浏览器打开 `http://localhost:8080`。不能直接双击 `index.html` 使用 `file://` 打开，因为页面通过 `fetch` 加载 JSON。

## 2. 添加或修改视频

编辑 `data/videos.json`，可直接修改某条记录或复制一条记录并更新 `id`。例如：

```json
{
  "id": "my-ot-demo",
  "title": "最优传输算法演示",
  "category": "最优传输",
  "summary": "一段简短的列表摘要。",
  "description": "完整说明，介绍问题背景、方法和结果。",
  "tags": ["OT", "Brenier"],
  "placeholder": "cover-ot.svg",
  "cover": "https://你的图片地址/cover.jpg",
  "bvid": "BVxxxxxxxxxx",
  "page": 1,
  "links": [
    {"label": "GitHub 代码", "url": "https://github.com/你的用户名/你的项目"},
    {"label": "论文", "url": "https://example.org/paper"}
  ]
}
```

- `bvid`: 视频网址 `https://www.bilibili.com/video/BVxxxxxxxxxx/` 里的 BV 号，必须是实际 12 位 BV 字符串。留空则显示待配置提醒，不会播放虚假视频。
- `page`: 多 P 投稿中的集数，从 1 开始；不用可省略。
- `cover`: 可选的 HTTPS 封面地址；建议使用本地封面（例如把 `ot-demo.webp` 放入 `assets/` 并写 `"cover": "https://..."` 不如在 `placeholder` 字段使用本地 SVG）。注意 B站图片外链可能遇到防盗链/访问限制，**最稳妥的是下载有权使用的封面放 `assets/`，在 `cover` 字段写相对路径 `assets/your-cover.webp`**；站点代码支持相对路径。
- `placeholder`: 未设置封面时的本地 SVG 文件名（存放于 `assets/`）。
- `category`: 分类名称；系统自动生成分类按钮和统计。
- `tags`: 搜索和卡片标签。
- `links`: 可选扩展链接；仅支持 `https://` 链接。
- `id`: 必须唯一，建议英文字母、数字和短横线。
- `duration`: 可选的视频时长显示文本，例如 `02:29`。
- `publishedAt`: 用于排序的日期，格式为 `YYYY-MM-DD`，不在卡片或详情中显示。快照未标年份的月日按快照保存年份整理。

页面默认按计算共形几何、最优传输、流体模拟分组，各组内最新优先；排序菜单也支持按日期从新到旧或从旧到新，筛选和搜索后同样生效。

当前条目的 `id` 使用 BV 号，后续更新时保持不变可保留视频详情链接。

## 3. 发布到 GitHub Pages

1. 在 GitHub 新建一个公共仓库，例如 `geometry-video-gallery`，不要初始化 README。
2. 在本项目目录运行以下命令（先将 `YOUR_NAME` 改为自己的 GitHub 用户名）：

```bash
git init
git add .
git commit -m "初始化算法视频展示网站"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/geometry-video-gallery.git
git push -u origin main
```

3. 进入 GitHub 仓库 → **Settings → Pages → Build and deployment → Source → GitHub Actions**。
4. 进入 **Actions** 查看 `Deploy Geometry Lab to GitHub Pages` 成功完成。
5. 打开 `https://YOUR_NAME.github.io/geometry-video-gallery/`。

每次修改并 push 到 `main`，都会自动部署；无需重新上传 MP4。

## 4. 后续维护

```bash
# 修改 data/videos.json 后
git add data/videos.json assets/
git commit -m "更新视频作品与封面"
git push
```

GitHub Pages 是静态站点，本模板不会自动读取 B站账号视频清单。更新视频时需要手动填写数据，后续可以另做离线同步工具导入投稿清单。

## 5. 使用边界

- 嵌入视频由 B站提供播放能力；受视频隐私、地区、版权、浏览器政策和站外播放策略影响时，用户仍可点击“在 B 站观看”。
- 本项目不下载或二次托管视频。
- 模板预设深色科技风，可在 `assets/styles.css` 更改主色。
- GitHub Pages 为公开站点，请勿提交私有凭据与敏感资料。
