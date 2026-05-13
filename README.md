[中文](README.zh-CN.md) | English

# Mixamo Pose Generator

A web-based tool that converts [Mixamo](https://www.mixamo.com/) animations into OpenPose / DWPose skeleton maps for AI image/video generation pose control.

Supports skeleton conditioning formats required by ControlNet (SD/SDXL), Wan 2.1/2.2, and other models.

## Features

| Feature | Description |
|:---|:---|
| DAE Parsing | Parse Mixamo-exported COLLADA (.dae) files, with direct ZIP upload support |
| Multi-Direction | Single / left-right / 4-direction / 8-direction skeleton generation with custom rotation angles |
| Skeleton Modes | OpenPose, DWPose, and Raw (original bone) rendering modes |
| 3D Preview | Real-time Collada mesh preview powered by Three.js with orbit controls |
| Frame Control | Play/pause, frame-by-frame navigation, FPS adjustment |
| PNG Export | Skeleton frame sequences for all directions, packed as ZIP |
| MP4 Export | Custom resolution and frame rate, with auto/count/duration loop modes |
| Hands & Face | Optional 21-keypoint hand and face keypoint rendering |

## Quick Start

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
```

## Usage

1. Pick an animation on [Mixamo](https://www.mixamo.com/) and download in **COLLADA (.dae)** format
2. Drag & drop the `.dae` or `.zip` file onto the upload area
3. Choose direction preset and skeleton mode
4. Rotate the 3D view to adjust the viewing angle (Ctrl+Z / Ctrl+Y for undo/redo)
5. Configure export options (format, resolution, frame rate, loop mode)
6. Click Export

## Tech Stack

- **Vue 3** + TypeScript + Vite
- **Three.js** — 3D Collada mesh rendering & interaction
- **Canvas 2D / WebGL** — Dual-engine skeleton rendering (WebGL for high-res batch export)
- **WebCodecs + mp4-muxer** — Browser-side video encoding
- **JSZip** — Batch PNG packaging

## Project Structure

```
src/
├── core/                          # Core parsing & mapping
│   ├── dae-parser.ts              #   COLLADA parsing + ZIP extraction
│   ├── openpose-mapper.ts         #   Mixamo → COCO 18-keypoint mapping
│   └── pose-transformer.ts        #   3D→2D projection, rotation, scaling, sampling
├── renderers/                     # Skeleton rendering engines
│   ├── renderer-factory.ts        #   Renderer factory (mode dispatch)
│   ├── render-utils.ts            #   Ellipse polygon, HSV, offscreen canvas utilities
│   ├── canvas2d/                  #   Canvas 2D renderers
│   │   ├── openpose-renderer.ts   #     OpenPose rendering (aligned with controlnet_aux)
│   │   ├── dwpose-renderer.ts     #     DWPose rendering (aligned with Wan 2.1/2.2)
│   │   └── raw-renderer.ts       #     Raw bone line rendering
│   └── webgl/                     #   WebGL GPU renderer
│       ├── gl-pose-renderer.ts    #     Capsule + circle instanced rendering
│       ├── gl-utils.ts            #     WebGL utility functions
│       └── shaders/               #     GLSL shaders
├── exporters/                     # Export logic
│   ├── png-exporter.ts            #   ZIP-packaged PNG sequences
│   └── video-exporter.ts          #   WebCodecs MP4 encoding
├── composables/                   # Vue composables
│   ├── useFileLoader.ts           #   File loading & parse state
│   ├── usePoseGenerator.ts        #   Preview/export frame generation
│   ├── usePreview.ts              #   Playback state management
│   ├── useExport.ts               #   Export workflow orchestration
│   ├── useRotationHistory.ts      #   Rotation undo/redo
│   ├── useToast.ts                #   Toast notifications
│   └── useLog.ts                  #   Structured logging
├── components/                    # Vue components
│   ├── config/                    #   Config panel (file upload, settings)
│   ├── preview/                   #   Preview area (canvas, 3D view, animation controls)
│   ├── export/                    #   Export progress bar
│   └── Toast.vue                  #   Toast component
├── types/                         # TypeScript type definitions
│   ├── pose.ts                    #   Vec3, JointMap, FrameData, ParseResult, etc.
│   └── config.ts                  #   SkeletonMode, LoopMode, direction presets, etc.
├── styles/                        # Global styles
│   ├── global.css
│   └── variables.css
└── assets/icon/                   # UI icons (SVG)
```

## Skeleton Rendering Algorithm

Both OpenPose and DWPose renderers are strictly aligned with upstream Python reference implementations, ensuring generated skeleton maps match the formats used during model training.

### Keypoint Format

**Body** — COCO 18-Keypoint (first 18 points of OpenPose Body 25):

| Index | Keypoint | Index | Keypoint |
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

**Hand** — 21-Keypoint (Wrist + 5 fingers × 4 joints)

### OpenPose Mode

For ControlNet OpenPose conditioning.

**Reference**: [comfyui_controlnet_aux · `open_pose/util.py :: draw_bodypose`](https://github.com/Fannovel16/comfyui_controlnet_aux/blob/main/src/custom_controlnet_aux/open_pose/util.py)

**Rendering pipeline**:

1. Draw 17 limbs — `ellipse2Poly` elliptical polygons at **60%** brightness of limb color
2. Draw 18 joint circles — full brightness

**Parameters**:
- `stickwidth = 4`, adaptively scaled by canvas size (aligned with [xinsir/controlnet-openpose-sdxl-1.0](https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0) scaling strategy)
- Joint circle radius: `4 × stickScale` (adaptive to avoid undersized joints at high resolutions)
- Hand edges: `cv2.line` thickness=2, HSV rainbow colors; joints: blue circles radius=4

### DWPose Mode

For [Wan 2.1](https://github.com/Wan-Video/Wan2.1) / Wan 2.2 video generation DWPose conditioning.

**Reference**:
- [Wan2GP · `preprocessing/dwpose/util.py`](https://github.com/deepbeepmeep/Wan2GP/blob/main/preprocessing/dwpose/util.py)
- [ComfyUI-WanVideoWrapper · `unianimate/dwpose/util.py`](https://github.com/kijai/ComfyUI-WanVideoWrapper/blob/main/unianimate/dwpose/util.py)

**Rendering pipeline** (key difference from OpenPose is the darkening strategy):

1. Draw 17 limbs — `ellipse2Poly` elliptical polygons at **full brightness**
2. Darken entire canvas **× 0.6**
3. Draw 18 joint circles — full brightness (joints "pop" from darkened limbs)

**Parameters** (identical to upstream):
- `stickwidth = 4`, no scaling
- Joint circle radius: fixed `4`
- Hand edges: `cv2.line` thickness=2, HSV rainbow colors; joints: blue circles radius=4

### Mode Comparison

| Aspect | OpenPose | DWPose (Wan) |
|:---|:---|:---|
| Limb color | `color × 0.6` (per-limb darken) | Full → global `× 0.6` |
| Joint color | Full brightness | Full brightness (on darkened canvas) |
| stickwidth scaling | Adaptive to resolution | Fixed 4px |
| Joint radius | `4 × stickScale` | Fixed 4px |
| Target model | ControlNet (SD/SDXL) | Wan 2.1 / 2.2 |

### Mixamo → OpenPose Keypoint Mapping

Mapping logic implemented in `src/core/openpose-mapper.ts`:

| Mixamo Bone | OpenPose Keypoint |
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

Face keypoints (nose, eyes, ears) are derived from `mixamorig_Head` / `mixamorig_HeadTop_End`. Hand keypoints are mapped from `mixamorig_{Left/Right}Hand{Finger}{1-4}` to the 21-point hand format.

## References

| Resource | Link |
|:---|:---|
| Mixamo | https://www.mixamo.com/ |
| controlnet_aux (HuggingFace) | https://github.com/huggingface/controlnet_aux |
| comfyui_controlnet_aux (OpenPose reference) | https://github.com/Fannovel16/comfyui_controlnet_aux |
| xinsir ControlNet OpenPose SDXL | https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0 |
| Wan 2.1 | https://github.com/Wan-Video/Wan2.1 |
| Wan2GP (DWPose reference) | https://github.com/deepbeepmeep/Wan2GP |
| ComfyUI-WanVideoWrapper (DWPose reference) | https://github.com/kijai/ComfyUI-WanVideoWrapper |
| CMU OpenPose | https://github.com/CMU-Perceptual-Computing-Lab/openpose |

## License

[Apache-2.0](LICENSE)
