# Mixamo Pose Generator

基于 Web 的 Mixamo 动画骨架姿态生成工具。将 Mixamo 导出的 DAE/FBX 动画文件转换为 OpenPose / DWPose 骨架图，用于 AI 生图/生视频的姿态控制。

## 功能

- **DAE 文件解析** — 解析 Mixamo 导出的 COLLADA (.dae) 动画文件，提取骨骼关键帧数据
- **多方向渲染** — 支持单方向、左右、四方向（上下左右）、八方向的骨架姿态生成
- **多种骨架模式** — 支持 Raw（原始骨骼）、OpenPose、DWPose 三种渲染模式
- **实时预览** — 逐帧预览动画，支持播放/暂停、帧跳转
- **PNG 导出** — 将所有方向的骨架帧导出为 PNG 图片（ZIP 打包）
- **MP4 视频导出** — 支持自定义分辨率、帧率和循环模式的 MP4 视频导出
- **循环控制** — 自动（适配 81 帧 WAN 模型）、按次数循环、按时长循环

## 技术栈

- **Vue 3** + TypeScript + Vite
- **Canvas 2D / WebGL** 骨架渲染
- **WebCodecs + mp4-muxer** 视频编码导出
- **JSZip** PNG 批量打包

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 使用方法

1. 前往 [Mixamo](https://www.mixamo.com/) 选择动画，以 **COLLADA (.dae)** 格式下载
2. 在页面中点击上传区域或拖拽文件到上传区域
3. 选择方向预设（单方向 / 两方向 / 四方向 / 八方向）
4. 选择骨架模式（OpenPose / DWPose / Raw）
5. 实时预览生成的骨架动画
6. 选择导出格式（PNG 或 MP4），点击导出

## 项目结构

```
├── src/
│   ├── core/              # DAE 解析与 OpenPose 映射
│   ├── renderers/         # Canvas2D 和 WebGL 骨架渲染器
│   ├── exporters/         # PNG / MP4 导出逻辑
│   ├── composables/       # Vue 组合式函数
│   ├── components/        # Vue 组件
│   ├── types/             # TypeScript 类型定义
│   └── styles/            # 全局样式与 CSS 变量
├── public/                # 静态资源（图标等）
├── index.html             # 入口 HTML
├── vite.config.ts         # Vite 配置
└── package.json
```

## License

MIT
