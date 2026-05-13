中文 | [English](README.md)

# Mixamo Pose Generator

将 [Mixamo](https://www.mixamo.com/) 动画转换为 OpenPose / DWPose 骨架图的 Web 工具，用于 AI 生图/生视频的姿态控制。

支持 ControlNet (SD/SDXL)、Wan 2.1/2.2 等模型所需的骨架条件格式。

## 核心功能

| 功能 | 说明 |
|:---|:---|
| DAE 解析 | 解析 Mixamo 导出的 COLLADA (.dae) 文件，支持 ZIP 包直接上传 |
| 多方向渲染 | 单方向 / 左右 / 四方向 / 八方向骨架生成，支持自定义旋转角度 |
| 骨架模式 | OpenPose、DWPose、Raw（原始骨骼）三种渲染模式 |
| 3D 预览 | Three.js 驱动的 Collada 网格实时预览，可旋转观察 |
| 帧级控制 | 播放/暂停、逐帧跳转、FPS 调节 |
| PNG 导出 | 所有方向的骨架帧序列，ZIP 打包下载 |
| MP4 导出 | 自定义分辨率、帧率，支持自动/按次/按时长三种循环模式 |
| 手部/面部 | 可选渲染手部 21 关键点和面部关键点 |

## 快速开始

```bash
npm install
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run preview    # 预览构建产物
```

## 使用流程

1. 在 [Mixamo](https://www.mixamo.com/) 选择动画，以 **COLLADA (.dae)** 格式下载
2. 拖拽 `.dae` 或 `.zip` 文件到页面上传区域
3. 选择方向预设和骨架模式
4. 在 3D 视图中旋转调整观察角度（支持 Ctrl+Z / Ctrl+Y 撤销/重做）
5. 配置导出参数（格式、分辨率、帧率、循环模式）
6. 点击导出

## 技术栈

- **Vue 3** + TypeScript + Vite
- **Three.js** — 3D Collada 网格渲染与交互
- **Canvas 2D / WebGL** — 双引擎骨架渲染（WebGL 用于高分辨率批量导出）
- **WebCodecs + mp4-muxer** — 浏览器端视频编码
- **JSZip** — PNG 批量打包

## 项目结构

```
src/
├── core/                          # 核心解析与映射
│   ├── dae-parser.ts              #   COLLADA 解析 + ZIP 解包
│   ├── openpose-mapper.ts         #   Mixamo → COCO 18 关键点映射
│   └── pose-transformer.ts        #   3D→2D 投影、旋转、缩放、采样
├── renderers/                     # 骨架渲染引擎
│   ├── renderer-factory.ts        #   渲染器工厂（模式分发）
│   ├── render-utils.ts            #   椭圆多边形、HSV、离屏 Canvas 等工具
│   ├── canvas2d/                  #   Canvas 2D 渲染器
│   │   ├── openpose-renderer.ts   #     OpenPose 渲染（对齐 controlnet_aux）
│   │   ├── dwpose-renderer.ts     #     DWPose 渲染（对齐 Wan 2.1/2.2）
│   │   └── raw-renderer.ts       #     原始骨骼线条
│   └── webgl/                     #   WebGL GPU 渲染器
│       ├── gl-pose-renderer.ts    #     胶囊体 + 圆形实例化渲染
│       ├── gl-utils.ts            #     WebGL 工具函数
│       └── shaders/               #     GLSL 着色器
├── exporters/                     # 导出逻辑
│   ├── png-exporter.ts            #   ZIP 打包 PNG 序列
│   └── video-exporter.ts          #   WebCodecs MP4 编码
├── composables/                   # Vue 组合式函数
│   ├── useFileLoader.ts           #   文件加载与解析状态
│   ├── usePoseGenerator.ts        #   预览/导出帧生成
│   ├── usePreview.ts              #   播放状态管理
│   ├── useExport.ts               #   导出流程编排
│   ├── useRotationHistory.ts      #   旋转撤销/重做
│   ├── useToast.ts                #   消息通知
│   └── useLog.ts                  #   结构化日志
├── components/                    # Vue 组件
│   ├── config/                    #   配置面板（文件上传、参数设置）
│   ├── preview/                   #   预览区（Canvas、3D 视图、动画控制）
│   ├── export/                    #   导出进度条
│   └── Toast.vue                  #   通知组件
├── types/                         # TypeScript 类型定义
│   ├── pose.ts                    #   Vec3, JointMap, FrameData, ParseResult 等
│   └── config.ts                  #   SkeletonMode, LoopMode, 方向预设等
├── styles/                        # 全局样式
│   ├── global.css
│   └── variables.css
└── assets/icon/                   # UI 图标 (SVG)
```

## 骨架渲染算法

本项目的 OpenPose 和 DWPose 渲染严格对齐上游 Python 实现，确保生成的骨架图与模型训练时使用的格式一致。

### 关键点格式

**Body** — COCO 18-Keypoint（OpenPose Body 25 的前 18 个点）：

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

**Hand** — 21-Keypoint（Wrist + 5 指 × 4 关节）

### OpenPose 模式

适用于 ControlNet OpenPose 条件控制。

**参考实现**：[comfyui_controlnet_aux · `open_pose/util.py :: draw_bodypose`](https://github.com/Fannovel16/comfyui_controlnet_aux/blob/main/src/custom_controlnet_aux/open_pose/util.py)

**渲染流程**：

1. 绘制 17 条肢体 — `ellipse2Poly` 椭圆多边形，颜色为 limb 色的 **60%** 亮度
2. 绘制 18 个关节圆点 — 完整亮度

**参数**：
- `stickwidth = 4`，按画布尺寸自适应缩放（对齐 [xinsir/controlnet-openpose-sdxl-1.0](https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0) 的缩放策略）
- 关节圆半径 `4 × stickScale`（随分辨率自适应，避免高分辨率下过小）
- 手部边线 thickness=2，HSV 彩虹色；关节蓝色圆点 radius=4

### DWPose 模式

适用于 [Wan 2.1](https://github.com/Wan-Video/Wan2.1) / Wan 2.2 视频生成的 DWPose 条件控制。

**参考实现**：
- [Wan2GP · `preprocessing/dwpose/util.py`](https://github.com/deepbeepmeep/Wan2GP/blob/main/preprocessing/dwpose/util.py)
- [ComfyUI-WanVideoWrapper · `unianimate/dwpose/util.py`](https://github.com/kijai/ComfyUI-WanVideoWrapper/blob/main/unianimate/dwpose/util.py)

**渲染流程**（与 OpenPose 的关键区别在于暗化策略）：

1. 绘制 17 条肢体 — `ellipse2Poly` 椭圆多边形，**完整亮度**
2. 全画布暗化 **× 0.6**
3. 绘制 18 个关节圆点 — 完整亮度（从暗色肢体中"弹出"）

**参数**（与上游完全一致）：
- `stickwidth = 4`，不缩放
- 关节圆半径固定 `4`
- 手部边线 thickness=2，HSV 彩虹色；关节蓝色圆点 radius=4

### 两种模式对比

| 维度 | OpenPose | DWPose (Wan) |
|:---|:---|:---|
| 肢体颜色 | `color × 0.6`（逐条暗化） | 全亮 → 全局 `× 0.6` |
| 关节颜色 | 全亮 | 全亮（叠在暗化画面上） |
| stickwidth 缩放 | 随分辨率自适应 | 固定 4px |
| 关节半径 | `4 × stickScale` | 固定 4px |
| 目标模型 | ControlNet (SD/SDXL) | Wan 2.1 / 2.2 |

### Mixamo → OpenPose 关键点映射

映射逻辑实现于 `src/core/openpose-mapper.ts`：

| Mixamo 骨骼 | OpenPose 关键点 |
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

面部关键点（nose、eyes、ears）由 `mixamorig_Head` / `mixamorig_HeadTop_End` 推导。手部关键点从 `mixamorig_{Left/Right}Hand{Finger}{1-4}` 映射到 21 点格式。

## 参考链接

| 资源 | 链接 |
|:---|:---|
| Mixamo | https://www.mixamo.com/ |
| controlnet_aux (HuggingFace) | https://github.com/huggingface/controlnet_aux |
| comfyui_controlnet_aux (OpenPose 渲染参考) | https://github.com/Fannovel16/comfyui_controlnet_aux |
| xinsir ControlNet OpenPose SDXL | https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0 |
| Wan 2.1 | https://github.com/Wan-Video/Wan2.1 |
| Wan2GP (DWPose 渲染参考) | https://github.com/deepbeepmeep/Wan2GP |
| ComfyUI-WanVideoWrapper (DWPose 参考) | https://github.com/kijai/ComfyUI-WanVideoWrapper |
| CMU OpenPose | https://github.com/CMU-Perceptual-Computing-Lab/openpose |

## 许可证

[Apache-2.0](LICENSE)
