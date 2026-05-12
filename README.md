# Mixamo Pose Generator

基于 Web 的 Mixamo 动画骨架姿态生成工具。将 Mixamo 导出的 DAE 动画文件转换为 OpenPose / DWPose 骨架图，用于 AI 生图/生视频的姿态控制（ControlNet、Wan 2.1/2.2 等）。

## 功能

- **DAE 文件解析** — 解析 Mixamo 导出的 COLLADA (.dae) 动画文件，提取骨骼关键帧数据
- **多方向渲染** — 支持单方向、左右、四方向（上下左右）、八方向的骨架姿态生成
- **多种骨架模式** — 支持 Raw（原始骨骼）、OpenPose（ControlNet/Wan-Fun）、DWPose（Wan Animate）三种渲染模式
- **完整关键点** — Body 18 点 + Face 68 点 + Hand 21 点（面部/手部可独立开关）
- **实时预览** — 逐帧预览动画，支持播放/暂停、帧跳转
- **PNG 导出** — 将所有方向的骨架帧导出为 PNG 图片（ZIP 打包）
- **MP4 视频导出** — 支持自定义分辨率、帧率和循环模式的 MP4 视频导出
- **循环控制** — 自动（适配 81 帧 Wan 模型）、按次数循环、按时长循环

## 快速开始

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 使用方法

1. 前往 [Mixamo](https://www.mixamo.com/) 选择动画，以 **COLLADA (.dae)** 格式下载
2. 在页面中点击上传区域或拖拽文件到上传区域
3. 选择方向预设（单方向 / 两方向 / 四方向 / 八方向）
4. 选择骨架模式（OpenPose / DWPose / Raw）
5. 实时预览生成的骨架动画
6. 选择导出格式（PNG 或 MP4），点击导出

---

## 骨架渲染算法说明

本项目的 OpenPose 和 DWPose 渲染算法严格对齐上游 Python 参考实现，确保生成的骨架图与 ControlNet / Wan 模型训练时使用的格式一致。

### 关键点格式

两种模式均使用 **COCO 18-Keypoint** 格式（OpenPose Body 25 的前 18 个点）：

| 索引 | 关键点 | 索引 | 关键点 |
|:---:|:---|:---:|:---|
| 0 | Nose | 9 | Right Knee |
| 1 | Neck | 10 | Right Ankle |
| 2 | Right Shoulder | 11 | Left Hip |
| 3 | Right Elbow | 12 | Left Knee |
| 4 | Right Wrist | 13 | Left Ankle |
| 5 | Left Shoulder | 14 | Right Eye |
| 6 | Left Elbow | 15 | Left Eye |
| 7 | Left Wrist | 16 | Right Ear |
| 8 | Right Hip | 17 | Left Ear |

手部使用 **21-Keypoint** 格式（Wrist + 5 指 × 4 关节）。面部使用 **68-Keypoint** 格式（iBUG 300-W 标准：下颌线 17 + 眉毛 10 + 鼻子 9 + 眼睛 12 + 嘴唇 20）。

### OpenPose 模式

**用途**：ControlNet OpenPose 条件控制

**参考实现**：[comfyui_controlnet_aux · `open_pose/util.py :: draw_bodypose`](https://github.com/Fannovel16/comfyui_controlnet_aux/blob/main/src/custom_controlnet_aux/open_pose/util.py)（源自 [controlnet_aux](https://github.com/huggingface/controlnet_aux) by HuggingFace）

**渲染流程**：
1. 画 17 条肢体：用 `ellipse2Poly` 生成椭圆多边形，颜色为对应 limb 色的 **60%** 亮度（`color × 0.6`）
2. 画 18 个关节圆点：使用完整亮度颜色
3. 画手部连线（HSV 彩虹色 thickness=2）+ 蓝色关节圆点（radius=4）
4. 画面部 68 白色圆点（radius=3，iBUG 300-W 标准格式）

**参数**（默认与上游完全一致）：
- `stickwidth = 4`，`joint_radius = 4`（固定）
- 可选 xinsr 高分辨率缩放（对齐 [xinsir/controlnet-openpose-sdxl-1.0](https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0)：`scale = max_side < 500 ? 1 : min(2 + floor(max_side / 1000), 7)`），默认关闭
- 手部边：`cv2.line` thickness=2，HSV 彩虹色；关节：蓝色圆点 radius=4
- 面部：68 个白色圆点 radius=3（从 Mixamo 头部骨骼近似生成）

### DWPose 模式

**用途**：[Wan 2.1](https://github.com/Wan-Video/Wan2.1) / Wan 2.2 视频生成的 DWPose 条件控制

**参考实现**：
- [Wan2GP · `preprocessing/dwpose/util.py :: draw_bodypose`](https://github.com/deepbeepmeep/Wan2GP/blob/main/preprocessing/dwpose/util.py)（Copyright Alibaba）
- [ComfyUI-WanVideoWrapper · `unianimate/dwpose/util.py`](https://github.com/kijai/ComfyUI-WanVideoWrapper/blob/main/unianimate/dwpose/util.py)

**渲染流程**（与 OpenPose 的关键区别）：
1. 画 17 条肢体：用 `ellipse2Poly` 生成椭圆多边形，使用 **完整亮度** 颜色
2. **全画布暗化 `× 0.6`**：对已绘制的所有像素统一乘以 0.6
3. 画 18 个关节圆点：在暗化后的画面上画 **完整亮度** 圆点
4. 画手部连线（HSV 彩虹色 thickness=2）+ 蓝色关节圆点（radius=4）
5. 画面部 68 白色圆点（radius=3）

**参数**（与上游完全一致）：
- `stickwidth = 4`，**不缩放**
- 关节圆半径：固定 `4`
- 手部边：`cv2.line` thickness=2，HSV 彩虹色；关节：蓝色圆点 radius=4，阈值检查 `> eps(0.01)`

**视觉效果**：关节点从暗色肢体中"弹出"，产生比 OpenPose 更强的关节-肢体亮度对比。这是 Wan 2.1/2.2 模型训练时使用的骨架格式。

### 两种模式对比

| 维度 | OpenPose | DWPose (Wan) |
|:---|:---|:---|
| 肢体颜色 | `color × 0.6`（逐条暗化） | 全亮 → 全局 `× 0.6` |
| 关节颜色 | 全亮 | 全亮（叠在暗化画面上） |
| stickwidth | 固定 4px（可选 xinsr 缩放） | 固定 4px |
| 关节半径 | 固定 4px（可选 xinsr 缩放） | 固定 4px |
| 面部 | 68 白色圆点（可选） | 68 白色圆点（可选） |
| 手部 | HSV 彩虹连线 + 蓝色圆点（可选） | HSV 彩虹连线 + 蓝色圆点（可选） |
| 目标模型 | ControlNet (SD/SDXL) / Wan-Fun | Wan 2.1 / 2.2 Animate |
| 参考实现 | controlnet_aux | Wan2GP / Alibaba |

### Mixamo → OpenPose 关键点映射

由于 Mixamo 骨骼命名与 COCO 格式不同，项目在 `src/core/openpose-mapper.ts` 中实现了映射逻辑：

| Mixamo 骨骼名 | OpenPose 关键点 |
|:---|:---|
| `mixamorig_Neck` | neck (1) |
| `mixamorig_RightArm` | right_shoulder (2) |
| `mixamorig_RightForeArm` | right_elbow (3) |
| `mixamorig_RightHand` | right_wrist (4) |
| `mixamorig_LeftArm` | left_shoulder (5) |
| `mixamorig_LeftForeArm` | left_elbow (6) |
| `mixamorig_LeftHand` | left_wrist (7) |
| `mixamorig_RightUpLeg` | right_hip (8) |
| `mixamorig_RightLeg` | right_knee (9) |
| `mixamorig_RightFoot` | right_ankle (10) |
| `mixamorig_LeftUpLeg` | left_hip (11) |
| `mixamorig_LeftLeg` | left_knee (12) |
| `mixamorig_LeftFoot` | left_ankle (13) |

面部 body 关键点（nose、eyes、ears）由 `mixamorig_Head` / `mixamorig_HeadTop_End` 推导生成。面部 68 点关键点使用 iBUG 300-W 标准模板，根据头部骨骼位置和朝向进行仿射变换近似生成。手部关键点从 `mixamorig_{Left/Right}Hand{Finger}{1-4}` 映射到 21 点手部格式。

---

## 技术栈

- **Vue 3** + TypeScript + Vite
- **Canvas 2D / WebGL** 骨架渲染（双引擎，WebGL 用于高分辨率批量导出）
- **WebCodecs + mp4-muxer** 视频编码导出
- **JSZip** PNG 批量打包

## 项目结构

```
├── src/
│   ├── core/              # DAE 解析与 OpenPose 关键点映射
│   │   ├── dae-parser.ts        # COLLADA 文件解析 + ZIP 解包
│   │   ├── openpose-mapper.ts   # Mixamo → COCO 18-keypoint 映射
│   │   └── pose-transformer.ts  # 3D→2D 投影、旋转、缩放
│   ├── renderers/         # 骨架渲染引擎
│   │   ├── canvas2d/            # Canvas 2D 渲染器
│   │   │   ├── openpose-renderer.ts  # OpenPose 渲染（对齐 controlnet_aux）
│   │   │   ├── dwpose-renderer.ts    # DWPose 渲染（对齐 Wan 2.1/2.2）
│   │   │   └── raw-renderer.ts       # 原始骨骼线条渲染
│   │   ├── webgl/               # WebGL 渲染器（GPU 加速）
│   │   └── renderer-factory.ts  # 渲染器工厂
│   ├── exporters/         # 导出逻辑
│   ├── composables/       # Vue 组合式函数
│   ├── components/        # Vue 组件
│   ├── types/             # TypeScript 类型定义
│   └── styles/            # 全局样式与 CSS 变量
├── public/                # 静态资源
├── index.html
├── vite.config.ts
└── package.json
```

## 参考链接

| 资源 | 链接 |
|:---|:---|
| Mixamo | https://www.mixamo.com/ |
| controlnet_aux (HuggingFace) | https://github.com/huggingface/controlnet_aux |
| comfyui_controlnet_aux (OpenPose 渲染参考) | https://github.com/Fannovel16/comfyui_controlnet_aux |
| xinsir ControlNet OpenPose SDXL | https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0 |
| Wan 2.1 官方仓库 | https://github.com/Wan-Video/Wan2.1 |
| Wan2GP (DWPose 渲染参考) | https://github.com/deepbeepmeep/Wan2GP |
| ComfyUI-WanVideoWrapper (DWPose 参考) | https://github.com/kijai/ComfyUI-WanVideoWrapper |
| CMU OpenPose 原始论文 | https://github.com/CMU-Perceptual-Computing-Lab/openpose |

## License

MIT
