# 多方向姿态骨架生成器

<div align="center">

**从 Mixamo 动画自动生成多方向 OpenPose 骨架图集**

支持可视化配置 | 实时动画预览 | 批量生成多方向

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🚀 快速开始（3 步启动）

### 第一步：启动程序

**Windows 用户（推荐）：**
```bash
双击运行: run_gui.bat
```

**Linux/Mac 用户：**
```bash
chmod +x run_gui.sh
./run_gui.sh
```

### 第二步：获取 DAE 文件

访问 **[Mixamo 动画库](https://www.mixamo.com/#/?limit=24&page=1)** 下载动作：

1. **登录** Mixamo（免费 Adobe 账号）
2. **搜索动作**（如：`jump`, `attack`, `walk`）
3. **点击下载**按钮
4. **重要配置**：
   ```
   Format: Collada (.dae)          ← 必须选择这个！
   Skin: Without Skin              ← 推荐（文件更小）
   Frames per second: 30
   Keyframe Reduction: None        ← 不要减少关键帧！
   ```
5. **下载并解压**，得到 `.dae` 文件

### 第三步：生成骨架

1. 在 GUI 中点击"浏览..."选择 DAE 文件
2. 选择方向配置（推荐：**四方向**）
3. 选择帧数（推荐：**8 帧**）
4. 点击 **"开始生成"**
5. 等待 1-3 分钟，在右侧预览动画效果

**完成！** 🎉

## 📸 界面预览
<img src='./main.png'>


## ✨ 核心功能

- 🎨 **可视化配置界面**：无需命令行，直观操作
- 🎬 **实时动画预览**：生成后立即预览，支持播放/暂停
- 🎮 **多方向支持**：1/2/4/8 方向预设，适配不同游戏类型
- ⚡ **智能命名**：输出目录包含配置信息，避免覆盖
- 📊 **进度显示**：实时日志显示生成状态
- 🔄 **FPS 调节**：1-30 FPS 可调节播放速度

---

## 📋 首次使用（一次性设置）

### 1. 检查环境

```bash
python test_environment.py
```

会自动检查：
- ✓ Python 版本（需要 3.7+）
- ✓ Tkinter（GUI 库）
- ✓ Pillow（图像处理）
- ✓ OpenCV（图像处理）
- ✓ NumPy（数值计算）
- ✓ 转换工具（mixamotoopenpose）

### 2. 安装依赖（如果测试失败）

```bash
python install_dependencies.py
```

自动完成：
- 安装 Python 包：`pillow`, `numpy`, `opencv-python`
- 克隆转换工具：[mixamotoopenpose](https://github.com/Astropulse/mixamotoopenpose)

**或手动安装：**
```bash
pip install pillow numpy opencv-python
git clone https://github.com/Astropulse/mixamotoopenpose.git
```

---

## 🎯 方向配置说明

| 图标 | 配置 | 方向数 | 操作方式 | 适用场景 | 示例 |
|------|------|-------|----------|----------|------|
| → | **单方向** | 1 | 固定视角 | 跑酷游戏、自动卷轴 | Temple Run |
| ←→ | **左右两方向** | 2 | 按←/→转身 | 横版平台游戏 | 马里奥、洛克人 |
| ✛ | **四方向** ⭐ | 4 | 按↑↓←→移动 | 俯视RPG、等距游戏 | 塞尔达、口袋妖怪 |
| ✺ | **八方向** | 8 | 8个方位移动 | 完整等距游戏 | 暗黑破坏神 |

**推荐配置：**
- **横版游戏**：选择"单方向"（在引擎中镜像即可实现左右）
- **俯视/等距游戏**：选择"四方向"（性能和效果的最佳平衡）
- **完整等距**：选择"八方向"（包含斜向移动）

---

## 🎞️ 帧数选择建议

| 帧数 | 名称 | 流畅度 | 文件量 | 适用 |
|------|------|--------|--------|------|
| 4 | 极简动画 | ⭐⭐ | 最小 | 快速原型、简单待机 |
| 6 | 标准动画 | ⭐⭐⭐ | 较小 | 行走、一般攻击 |
| **8** | **流畅动画** ⭐ | ⭐⭐⭐⭐ | 适中 | **跳跃、复杂动作（推荐）** |
| 12 | 高质量动画 | ⭐⭐⭐⭐⭐ | 较大 | 特殊技能、过场 |
| 16 | 完整动画 | ⭐⭐⭐⭐⭐ | 大 | 主角招牌动作 |
| 0 | 全部帧 | - | 最大 | 后期手动挑选 |

**推荐**：**8 帧** 是流畅度和文件量的最佳平衡。

---

## 📁 输出结构

输出目录采用智能命名，包含配置信息：

```
poses_library/
│
├── UpwardThrust_8frames_4dir/       ← 动作名_帧数_方向数
│   ├── up/                          ← 上方向
│   │   ├── skeleton_001.png         ← 第1帧骨架图
│   │   ├── skeleton_002.png
│   │   ├── ...
│   │   └── skeleton_008.png         ← 第8帧骨架图
│   ├── right/                       ← 右方向
│   │   └── skeleton_*.png
│   ├── down/                        ← 下方向
│   │   └── skeleton_*.png
│   ├── left/                        ← 左方向
│   │   └── skeleton_*.png
│   └── generation_report.json       ← 生成报告
│
├── UpwardThrust_12frames_8dir/      ← 不同配置，独立文件夹
│   └── ...
│
└── Jump_8frames_4dir/               ← 不同动作
    └── ...
```

**命名规则**：
- `动作名`：DAE 文件名
- `帧数`：如 `8frames`, `12frames`, `allframes`
- `方向数`：如 `1dir`, `4dir`, `8dir`

**覆盖策略**：
- ✅ 相同配置（同名文件夹）→ 覆盖旧文件
- ✅ 不同配置 → 创建新文件夹，互不影响

---

## 🎬 动画预览功能

生成完成后，右侧预览区会自动加载动画：

### 功能特性
- **方向切换**：下拉菜单选择要查看的方向（up, right, down, left 等）
- **播放控制**：点击"▶ 播放"按钮播放动画，"⏸ 暂停"暂停
- **FPS 调节**：使用滑块调整播放速度（1-30 FPS）
- **帧信息**：显示当前帧/总帧数（如：帧: 3/8）

### 使用方法
1. 生成完成后动画自动加载
2. 选择要查看的方向
3. 点击播放按钮
4. 调整 FPS 查看不同速度效果

---

## 🔧 在 ComfyUI 中使用

生成的骨架图可直接用于 ComfyUI 工作流：

### 完整工作流示例

```
阶段1: 生成角色参考（多视角）
[Text Prompt] → "character turnaround, 武士角色, 
                 front side back views, T-pose"
    ↓
[Checkpoint] → Realistic Model
    ↓
[Output] → character_turnaround.png

阶段2: 关联角色和动作
[Load Image Batch] 
  → poses_library/UpwardThrust_8frames_4dir/right/*.png
    ↓
[Extract View] → 从 turnaround 提取侧视图
    ↓
[IP-Adapter Apply] ← 角色参考图（保持外观一致）
    ↓
[ControlNet OpenPose] ← 骨架序列（控制姿态）
    ↓
[KSampler - Batch Mode]
    ↓
[Output] → 该角色执行该动作的写实序列

阶段3: 转换为像素风格
[Img2Img + Pixel LoRA + Tile ControlNet]
    ↓
[Output] → 像素风格精灵图集
```

### 节点配置要点

**IP-Adapter 设置：**
```yaml
weight: 0.85-0.95    # 控制角色相似度
noise: 0.0           # 无噪声
```

**ControlNet 设置：**
```yaml
model: control_v11p_sd15_openpose.pth
strength: 0.9-1.0    # 高强度确保姿态准确
```

**Seed 策略：**
```yaml
base_seed: 42        # 固定基础种子
frame_seed: base_seed + frame_index
# 例如：42, 43, 44, 45...
```

---

## 📚 Mixamo 动作推荐

访问 [Mixamo 动画库](https://www.mixamo.com/#/?limit=24&page=1)，推荐下载的动作：

### 基础动作（必备）
- **Idle** - 待机动画
- **Walking** - 行走
- **Running** - 奔跑
- **Jump** / **Standard Jump** - 跳跃
- **Standing Turn** - 转身

### 战斗动作
- **Sword Slash** / **Upward Thrust** - 挥剑攻击
- **Punch** / **Kick** - 拳击/踢腿
- **Blocking** - 防御
- **Hit Reaction** - 受击反应
- **Death** - 死亡

### 特殊动作
- **Climbing** - 攀爬
- **Crouch** - 蹲下
- **Roll** - 翻滚
- **Pick Up** - 拾取
- **Wave** / **Dance** - 招手/跳舞

**提示**：搜索时使用英文关键词效果更好。

---

## 🎮 使用场景与配置推荐

### 场景 1：横版平台游戏（马里奥、洛克人风格）

**配置：**
```
方向：单方向（→）
帧数：8 帧
说明：只需生成一个方向，另一个方向在引擎中镜像翻转
```

**推荐动作：**
- Idle (待机)
- Walking (行走)
- Running (奔跑)
- Jump (跳跃)
- Sword Slash (攻击)

### 场景 2：俯视角 RPG（塞尔达、口袋妖怪风格）

**配置：**
```
方向：四方向（✛）⭐ 推荐
帧数：8 帧
说明：上下左右四个基本方向
```

**推荐动作：**
- Idle
- Walking
- Running
- Sword Slash
- Blocking

### 场景 3：等距视角动作游戏（暗黑破坏神风格）

**配置：**
```
方向：八方向（✺）
帧数：12 帧
说明：完整的 8 方位，包含斜向移动
```

**推荐动作：**
- Walking
- Running
- Attack (多种)
- Death
- Cast Spell


## 📊 输出示例

### 生成不同配置的对比

```
poses_library/
│
├── Jump_8frames_1dir/           # 8帧，单方向
│   └── side/
│       └── skeleton_*.png (8个文件)
│
├── Jump_8frames_4dir/           # 8帧，四方向（不会被覆盖）
│   ├── up/    (8个)
│   ├── right/ (8个)
│   ├── down/  (8个)
│   └── left/  (8个)
│
├── Jump_12frames_4dir/          # 12帧，四方向（不会被覆盖）
│   └── ... (12个文件/方向)
│
└── Attack_8frames_8dir/         # 不同动作（不会被覆盖）
    ├── up/
    ├── up_right/
    ├── right/
    └── ... (8个方向)
```

**文件统计：**
- 8帧单方向 = 8 个文件
- 8帧四方向 = 32 个文件
- 8帧八方向 = 64 个文件
- 12帧八方向 = 96 个文件

## ⚙️ 高级设置

### 缩放参数

调整角色在画面中的大小：

```yaml
1.0x - 角色较小（可能看不清）
2.0x - 默认推荐（清晰可见）⭐
3.0x - 角色较大（适合特写）
4.0x - 角色很大（可能被裁切）
```

**建议**：先用默认 2.0x 生成一次，根据效果调整。

### 输出目录

默认：`poses_library/`

可自定义为任意目录，例如：
- `D:/GameAssets/Poses/`
- `ComfyUI/input/poses/`
- `./output/`


## 🔍 生成报告

每次生成都会创建 `generation_report.json`：

```json
{
  "timestamp": "2026-02-10T18:55:45",
  "config": {
    "dae_file": "UpwardThrust.dae",
    "directions": {
      "up": 0,
      "right": 90,
      "down": 180,
      "left": 270
    },
    "frames": 8,
    "scale": 2.0
  },
  "results": {
    "up": {
      "success": true,
      "frames": 8,
      "path": "poses_library/UpwardThrust_8frames_4dir/up"
    },
    ...
  },
  "summary": {
    "total_directions": 4,
    "successful": 4,
    "total_frames": 32
  }
}
```

## ❓ 常见问题

### Q1: 提示"未找到转换工具"？

**A:** 首次运行会自动提示下载，点击"是"即可。或手动运行：
```bash
git clone https://github.com/Astropulse/mixamotoopenpose.git
```

### Q2: 只有 FBX 文件，没有 DAE 怎么办？

**A:** 该工具只支持 DAE 格式。解决方案：

**方案1：从 Mixamo 重新下载（最简单）⭐**
1. 访问 [Mixamo](https://www.mixamo.com/#/?limit=24&page=1)
2. 找到相同的动作
3. 下载时**格式选择 `Collada (.dae)`**
4. 使用下载的 DAE 文件

**方案2：在线转换工具**
- https://anyconv.com/fbx-to-dae-converter/
- https://products.aspose.app/3d/conversion/fbx-to-dae

**方案3：使用 Blender 转换**
```
File → Import → FBX
File → Export → Collada (.dae)
```

---

### Q3: 中文显示乱码？

**A:** 已修复！如仍有问题：
- 确认使用的是最新版本 `run_gui.bat`
- 确认已包含 `chcp 65001` 命令
- Windows 系统语言设置为中文

---

### Q4: 生成失败，日志显示错误？

**A:** 检查清单：
- ✓ DAE 文件路径正确（没有中文路径）
- ✓ DAE 文件有效（从 Mixamo 正确下载）
- ✓ 输出目录有写入权限
- ✓ 磁盘空间充足
- ✓ 转换工具已正确安装

---

### Q5: 预览窗口没有显示动画？

**A:** 可能原因：
1. 生成失败（查看日志是否有错误）
2. 输出目录为空（检查是否有 PNG 文件）
3. 路径错误（确认输出目录设置）

**解决方法**：
- 查看日志最后几行是否显示"生成完成"
- 手动打开输出目录检查文件
- 重新生成

---

### Q6: 动画播放太快/太慢？

**A:** 调整右侧预览区的 FPS 滑块：
- **降低 FPS** → 播放变慢（如 5 FPS）
- **提高 FPS** → 播放变快（如 20 FPS）
- **推荐**：10-12 FPS 适合像素风格

---

### Q7: 生成的骨架太小/太大？

**A:** 调整"缩放"参数后重新生成：
- 骨架太小 → 增加到 2.5x 或 3.0x
- 骨架太大被裁切 → 减小到 1.5x
- 查看预览确认效果

---

### Q8: 横版游戏需要生成左右两个方向吗？

**A:** **不需要**！建议：
- 只生成一个方向（如"右"）
- 在游戏引擎中水平翻转即可得到左侧
- 节省 50% 生成时间和存储空间
- 大多数横版游戏采用此方案

---

### Q9: 如何批量生成多个动作？

**A:** 方法：
1. 从 Mixamo 下载多个动作的 DAE 文件
2. 依次在 GUI 中选择每个文件
3. 使用相同配置生成
4. 每个动作会生成独立的文件夹

**提示**：可以复制多个 DAE 文件到同一目录方便选择。

---

### Q10: 生成时间多久？

**A:** 取决于配置：

| 配置 | 预计时间 |
|------|---------|
| 8帧单方向 | 30 秒 |
| 8帧四方向 | 2 分钟 |
| 8帧八方向 | 4 分钟 |
| 12帧八方向 | 6 分钟 |

**实际时间**可能因计算机性能而异。

---

## 🛠️ 技术细节

### 依赖

- **Python 3.7+**
- **Tkinter**（Python 自带，GUI 库）
- **Pillow**（图像处理）
- **OpenCV**（图像处理）
- **NumPy**（数值计算）

### 外部工具

- **[mixamotoopenpose](https://github.com/Astropulse/mixamotoopenpose)**：核心转换工具
  - 将 Mixamo DAE 动画转换为 OpenPose 骨架图
  - 支持旋转、缩放、帧提取

### 系统要求

- **操作系统**：Windows / Linux / macOS
- **磁盘空间**：100 MB（程序 + 依赖）+ 输出文件
- **内存**：512 MB+
- **网络**：首次运行需要下载工具（约 2 MB）

---

## 📖 文件说明

| 文件 | 大小 | 说明 |
|------|------|------|
| `pose_generator_gui.py` | 25 KB | 主程序 |
| `run_gui.bat` | 74 B | Windows 启动脚本 |
| `run_gui.sh` | 264 B | Linux/Mac 启动脚本 |
| `install_dependencies.py` | 3.9 KB | 依赖安装工具 |
| `test_environment.py` | 4.4 KB | 环境测试工具 |
| `README.md` | - | 本文档 |

---

## 🔄 完整工作流程

```
1. 准备阶段
   └─ 从 Mixamo 下载 DAE 文件

2. 生成骨架
   └─ 运行 GUI → 配置 → 生成 → 得到骨架图

3. ComfyUI 使用
   ├─ 生成角色参考（多视角）
   ├─ 加载骨架图
   ├─ IP-Adapter + ControlNet 关联
   ├─ 生成写实动作序列
   └─ 转换为像素风格

4. 游戏引擎集成
   ├─ UE5 Paper2D
   ├─ Unity Sprites
   └─ Godot AnimatedSprite
```

---

## 💡 最佳实践

### 建议工作流

1. **先测试一个动作**
   - 选择简单动作（如 Idle）
   - 使用单方向，4 帧
   - 快速验证流程

2. **确认效果后批量生成**
   - 下载所有需要的动作
   - 使用统一配置（如 8帧，4方向）
   - 建立完整的姿态库

3. **组织姿态库**
   ```
   poses_library/
   ├── Idle_8frames_4dir/
   ├── Walk_8frames_4dir/
   ├── Run_8frames_4dir/
   ├── Jump_8frames_4dir/
   ├── Attack_8frames_4dir/
   └── Hurt_8frames_4dir/
   ```

4. **在 ComfyUI 中使用**
   - 创建角色参考
   - 依次加载各动作骨架
   - 批量生成所有动作

---

## 🎯 性能参考

### 文件大小

- 单个骨架图：10-50 KB
- 8帧单方向：80-400 KB
- 8帧四方向：320 KB - 1.6 MB
- 8帧八方向：640 KB - 3.2 MB

### 生成速度

- 单方向：~30 秒
- 四方向：~2 分钟
- 八方向：~4 分钟

### 内存占用

- GUI 程序：~50 MB
- 生成过程：~100 MB
- 预览加载：+50 MB（取决于图片数量）

---

## 🚨 重要提示

⚠️ **必须使用 `.dae` 格式**
   - 该工具不支持 FBX、FBX7 等其他格式
   - 从 Mixamo 下载时选择 `Collada (.dae)`

⚠️ **不要减少关键帧**
   - 下载时 `Keyframe Reduction` 必须选 `None`
   - 否则动画会不流畅

⚠️ **首次运行需要联网**
   - 自动下载转换工具（2 MB）
   - 自动安装 Python 依赖

✅ **CMD 窗口会自动关闭**
   - 使用 `pythonw` 启动，无控制台窗口
   - 只显示 GUI 界面

✅ **相同配置会覆盖**
   - 相同的动作名、帧数、方向数 → 覆盖旧文件
   - 不同配置 → 创建新文件夹

---

## 🔗 相关资源

- **Mixamo 动画库**：https://www.mixamo.com/#/?limit=24&page=1
- **mixamotoopenpose 工具**：https://github.com/Astropulse/mixamotoopenpose
- **ComfyUI**：https://github.com/comfyanonymous/ComfyUI
- **ControlNet**：https://github.com/lllyasviel/ControlNet

---

## 📝 更新日志

### v2.0 (2026-02-10)
- ✨ 全新 GUI 界面
- ✨ 实时动画预览功能
- ✨ 智能输出目录命名（包含配置信息）
- ✨ 日志窗口扩大到 300px
- ✨ CMD 窗口自动关闭
- ✨ 方向配置描述优化
- 🐛 修复中文乱码问题

### v1.0
- 🎉 初始版本（命令行）

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Astropulse/mixamotoopenpose](https://github.com/Astropulse/mixamotoopenpose) - 核心转换工具
- [Adobe Mixamo](https://www.mixamo.com/) - 动作数据来源
- [OpenPose](https://github.com/CMU-Perceptual-Computing-Lab/openpose) - 骨架格式标准

---

<div align="center">

**开始创作您的游戏动画吧！** 🎮✨

Made with ❤️ for Game Developers

</div>
