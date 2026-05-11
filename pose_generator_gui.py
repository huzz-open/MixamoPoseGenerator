#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
多方向姿态骨架生成器 - 可视化 GUI 版本
包含配置界面和动画预览功能
"""

import os
import sys
import subprocess
import json
import threading
import zipfile
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinter import Canvas
from PIL import Image, ImageTk
import time

# ==================== 配置 ====================

DIRECTION_CONFIGS = {
    "single": {
        "name": "单方向（固定视角）",
        "directions": {"side": 90},
        "description": "角色只朝一个方向，无法转身",
        "icon": "→"
    },
    "two": {
        "name": "左右两方向（2D横版）",
        "directions": {"right": 90, "left": 270},
        "description": "角色可以面朝左边或右边",
        "icon": "←→"
    },
    "four": {
        "name": "四方向（上下左右）",
        "directions": {"up": 0, "right": 90, "down": 180, "left": 270},
        "description": "角色可以面朝上、下、左、右",
        "icon": "✛"
    },
    "eight": {
        "name": "八方向（完整方位）",
        "directions": {
            "up": 0, "up_right": 45, "right": 90, "down_right": 135,
            "down": 180, "down_left": 225, "left": 270, "up_left": 315
        },
        "description": "角色可以面朝8个方位",
        "icon": "✺"
    }
}

FRAME_CONFIGS = {
    4: {"name": "极简动画", "desc": "快速原型"},
    6: {"name": "标准动画", "desc": "平衡选择"},
    8: {"name": "流畅动画", "desc": "推荐使用"},
    12: {"name": "高质量动画", "desc": "精细动画"},
    16: {"name": "完整动画", "desc": "最流畅"},
    0: {"name": "全部帧", "desc": "不限制"}
}

# ==================== 动画预览器类 ====================

class AnimationPreview:
    """动画预览窗口"""
    
    def __init__(self, parent):
        self.parent = parent
        self.images = {}  # {direction: [frame1, frame2, ...]}
        self.current_direction = None
        self.current_frame = 0
        self.is_playing = False
        self.fps = 10
        self.animation_thread = None
        
        self.setup_ui()
    
    def setup_ui(self):
        """设置预览UI"""
        # 主框架
        frame = ttk.LabelFrame(self.parent, text="动画预览", padding=10)
        frame.grid(row=0, column=1, rowspan=3, sticky='nsew', padx=5, pady=5)
        
        # 画布
        self.canvas = Canvas(frame, width=512, height=512, bg='#2b2b2b')
        self.canvas.pack()
        
        # 控制面板
        control_frame = ttk.Frame(frame)
        control_frame.pack(fill='x', pady=10)
        
        # 方向选择
        ttk.Label(control_frame, text="视角:").pack(side='left', padx=5)
        self.direction_var = tk.StringVar()
        self.direction_combo = ttk.Combobox(
            control_frame, 
            textvariable=self.direction_var,
            state='readonly',
            width=15
        )
        self.direction_combo.pack(side='left', padx=5)
        self.direction_combo.bind('<<ComboboxSelected>>', self.on_direction_change)
        
        # 播放控制
        self.play_btn = ttk.Button(
            control_frame, 
            text="▶ 播放", 
            command=self.toggle_play,
            width=10
        )
        self.play_btn.pack(side='left', padx=5)
        
        # FPS 控制
        ttk.Label(control_frame, text="FPS:").pack(side='left', padx=5)
        self.fps_var = tk.IntVar(value=10)
        fps_spinbox = ttk.Spinbox(
            control_frame,
            from_=1,
            to=30,
            textvariable=self.fps_var,
            width=5,
            command=self.update_fps
        )
        fps_spinbox.pack(side='left', padx=5)
        
        # 帧信息
        self.frame_label = ttk.Label(control_frame, text="帧: 0/0")
        self.frame_label.pack(side='left', padx=10)
        
        # 提示文本
        tip_frame = ttk.Frame(frame)
        tip_frame.pack(fill='x', pady=5)
        self.tip_label = ttk.Label(
            tip_frame,
            text="生成完成后将在此显示动画预览",
            foreground='gray'
        )
        self.tip_label.pack()
    
    def load_images(self, output_dir):
        """加载生成的图像"""
        self.images = {}
        
        # 扫描输出目录
        output_path = Path(output_dir)
        if not output_path.exists():
            return False
        
        # 遍历各方向文件夹
        for direction_dir in output_path.iterdir():
            if direction_dir.is_dir():
                direction_name = direction_dir.name
                frames = []
                
                # 加载该方向的所有帧
                for img_file in sorted(direction_dir.glob("*.png")):
                    try:
                        img = Image.open(img_file)
                        # 调整大小以适应画布
                        img = img.resize((512, 512), Image.NEAREST)
                        frames.append(ImageTk.PhotoImage(img))
                    except Exception as e:
                        print(f"加载图像失败: {img_file}, {e}")
                
                if frames:
                    self.images[direction_name] = frames
        
        if self.images:
            # 更新方向选择
            directions = list(self.images.keys())
            self.direction_combo['values'] = directions
            self.direction_combo.current(0)
            self.current_direction = directions[0]
            
            # 显示第一帧
            self.current_frame = 0
            self.update_display()
            
            self.tip_label.config(
                text=f"加载完成: {len(self.images)} 个方向, 共 {sum(len(f) for f in self.images.values())} 帧"
            )
            return True
        
        return False
    
    def on_direction_change(self, event=None):
        """方向改变时"""
        self.current_direction = self.direction_var.get()
        self.current_frame = 0
        self.update_display()
    
    def update_display(self):
        """更新显示"""
        if not self.current_direction or self.current_direction not in self.images:
            return
        
        frames = self.images[self.current_direction]
        if not frames:
            return
        
        # 循环帧索引
        self.current_frame = self.current_frame % len(frames)
        
        # 显示当前帧
        self.canvas.delete('all')
        self.canvas.create_image(256, 256, image=frames[self.current_frame])
        
        # 更新帧信息
        self.frame_label.config(
            text=f"帧: {self.current_frame + 1}/{len(frames)}"
        )
    
    def toggle_play(self):
        """切换播放/暂停"""
        if self.is_playing:
            self.stop_animation()
        else:
            self.play_animation()
    
    def play_animation(self):
        """播放动画"""
        if not self.images or not self.current_direction:
            messagebox.showwarning("提示", "没有可播放的动画")
            return
        
        self.is_playing = True
        self.play_btn.config(text="⏸ 暂停")
        
        # 启动动画线程
        self.animation_thread = threading.Thread(target=self._animation_loop, daemon=True)
        self.animation_thread.start()
    
    def stop_animation(self):
        """停止动画"""
        self.is_playing = False
        self.play_btn.config(text="▶ 播放")
    
    def _animation_loop(self):
        """动画循环"""
        while self.is_playing:
            if self.current_direction and self.current_direction in self.images:
                frames = self.images[self.current_direction]
                if frames:
                    self.parent.after(0, self.update_display)
                    self.current_frame = (self.current_frame + 1) % len(frames)
                    time.sleep(1.0 / self.fps)
            else:
                break
    
    def update_fps(self):
        """更新FPS"""
        self.fps = self.fps_var.get()

# ==================== 主应用类 ====================

class PoseGeneratorGUI:
    """主应用窗口"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("多方向姿态骨架生成器 v2.0")
        self.root.geometry("1200x850")
        
        # 变量
        self.dae_file_var = tk.StringVar()
        self.output_dir_var = tk.StringVar(value="poses_library")
        self.direction_preset_var = tk.StringVar(value="four")
        self.frame_count_var = tk.IntVar(value=8)
        self.scale_var = tk.DoubleVar(value=2.0)
        
        # 进度相关
        self.is_generating = False
        
        self.setup_ui()
        self.check_dependencies()
    
    def setup_ui(self):
        """设置UI"""
        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.columnconfigure(1, weight=2)
        self.root.rowconfigure(2, weight=1)
        
        # 左侧配置面板
        self.setup_config_panel()
        
        # 右侧预览面板
        self.preview = AnimationPreview(self.root)
        
        # 底部日志面板
        self.setup_log_panel()
    
    def setup_config_panel(self):
        """设置配置面板"""
        config_frame = ttk.LabelFrame(self.root, text="配置", padding=10)
        config_frame.grid(row=0, column=0, sticky='nsew', padx=5, pady=5)
        
        row = 0
        
        # 文件选择
        ttk.Label(config_frame, text="DAE 文件:", font=('', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=5
        )
        row += 1
        
        file_frame = ttk.Frame(config_frame)
        file_frame.grid(row=row, column=0, columnspan=2, sticky='ew', pady=5)
        file_frame.columnconfigure(0, weight=1)
        
        ttk.Entry(file_frame, textvariable=self.dae_file_var).grid(
            row=0, column=0, sticky='ew', padx=(0, 5)
        )
        ttk.Button(file_frame, text="浏览...", command=self.browse_file).grid(
            row=0, column=1
        )
        row += 1
        
        # 分隔线
        ttk.Separator(config_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=2, sticky='ew', pady=10
        )
        row += 1
        
        # 方向配置
        ttk.Label(config_frame, text="方向配置:", font=('', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=5
        )
        row += 1
        
        for key, config in DIRECTION_CONFIGS.items():
            rb = ttk.Radiobutton(
                config_frame,
                text=f"{config['icon']} {config['name']}",
                value=key,
                variable=self.direction_preset_var
            )
            rb.grid(row=row, column=0, sticky='w', padx=10, pady=2)
            
            ttk.Label(
                config_frame,
                text=f"({len(config['directions'])} 方向)",
                foreground='gray'
            ).grid(row=row, column=1, sticky='w', pady=2)
            row += 1
            
            # 描述
            ttk.Label(
                config_frame,
                text=config['description'],
                foreground='blue',
                font=('', 8)
            ).grid(row=row, column=0, columnspan=2, sticky='w', padx=30, pady=(0, 5))
            row += 1
        
        # 分隔线
        ttk.Separator(config_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=2, sticky='ew', pady=10
        )
        row += 1
        
        # 帧数配置
        ttk.Label(config_frame, text="帧数配置:", font=('', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=5
        )
        row += 1
        
        frame_frame = ttk.Frame(config_frame)
        frame_frame.grid(row=row, column=0, columnspan=2, sticky='ew', pady=5)
        
        ttk.Label(frame_frame, text="帧数:").pack(side='left', padx=5)
        
        frame_combo = ttk.Combobox(
            frame_frame,
            textvariable=self.frame_count_var,
            values=list(FRAME_CONFIGS.keys()),
            width=10,
            state='readonly'
        )
        frame_combo.pack(side='left', padx=5)
        frame_combo.current(2)  # 默认8帧
        frame_combo.bind('<<ComboboxSelected>>', self.on_frame_change)
        
        self.frame_desc_label = ttk.Label(
            frame_frame,
            text=FRAME_CONFIGS[8]['name'],
            foreground='gray'
        )
        self.frame_desc_label.pack(side='left', padx=5)
        row += 1
        
        # 分隔线
        ttk.Separator(config_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=2, sticky='ew', pady=10
        )
        row += 1
        
        # 高级设置
        ttk.Label(config_frame, text="高级设置:", font=('', 10, 'bold')).grid(
            row=row, column=0, sticky='w', pady=5
        )
        row += 1
        
        # 缩放
        scale_frame = ttk.Frame(config_frame)
        scale_frame.grid(row=row, column=0, columnspan=2, sticky='ew', pady=5)
        
        ttk.Label(scale_frame, text="缩放:").pack(side='left', padx=5)
        ttk.Scale(
            scale_frame,
            from_=1.0,
            to=4.0,
            variable=self.scale_var,
            orient='horizontal',
            length=150
        ).pack(side='left', padx=5)
        
        self.scale_label = ttk.Label(scale_frame, text="2.0x")
        self.scale_label.pack(side='left', padx=5)
        self.scale_var.trace('w', self.update_scale_label)
        row += 1
        
        # 输出目录
        ttk.Label(config_frame, text="输出目录:").grid(
            row=row, column=0, sticky='w', pady=5
        )
        row += 1
        
        output_frame = ttk.Frame(config_frame)
        output_frame.grid(row=row, column=0, columnspan=2, sticky='ew', pady=5)
        output_frame.columnconfigure(0, weight=1)
        
        ttk.Entry(output_frame, textvariable=self.output_dir_var).grid(
            row=0, column=0, sticky='ew', padx=(0, 5)
        )
        ttk.Button(output_frame, text="浏览...", command=self.browse_output).grid(
            row=0, column=1
        )
        row += 1
        
        # 生成按钮
        self.generate_btn = ttk.Button(
            config_frame,
            text="🚀 开始生成",
            command=self.start_generation,
            style='Accent.TButton'
        )
        self.generate_btn.grid(
            row=row, column=0, columnspan=2, sticky='ew', pady=20
        )
        
        # 设置样式
        style = ttk.Style()
        style.configure('Accent.TButton', font=('', 12, 'bold'))
    
    def setup_log_panel(self):
        """设置日志面板"""
        log_frame = ttk.LabelFrame(self.root, text="日志", padding=10)
        log_frame.grid(row=2, column=0, columnspan=2, sticky='nsew', padx=5, pady=5)
        
        # 文本框 - 设置固定高度为300像素
        self.log_text = tk.Text(log_frame, height=15, wrap='word', state='disabled')
        self.log_text.pack(side='left', fill='both', expand=True)
        
        # 滚动条
        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.pack(side='right', fill='y')
        self.log_text.config(yscrollcommand=scrollbar.set)
        
        # 配置标签
        self.log_text.tag_config('info', foreground='blue')
        self.log_text.tag_config('success', foreground='green')
        self.log_text.tag_config('error', foreground='red')
        self.log_text.tag_config('warning', foreground='orange')
    
    def log(self, message, level='info'):
        """添加日志"""
        self.log_text.config(state='normal')
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.log_text.insert('end', f"[{timestamp}] ", 'info')
        self.log_text.insert('end', f"{message}\n", level)
        self.log_text.see('end')
        self.log_text.config(state='disabled')
    
    def check_dependencies(self):
        """检查依赖"""
        self.log("检查依赖...", 'info')
        
        # 检查转换工具
        if not os.path.exists("mixamotoopenpose"):
            self.log("未找到转换工具，需要下载", 'warning')
            if messagebox.askyesno("下载工具", "需要下载 mixamotoopenpose 工具，是否现在下载？"):
                self.download_tool()
        else:
            self.log("转换工具已就绪", 'success')
        
        # 检查 Python 库
        try:
            import PIL
            import cv2
            import numpy
            self.log("Python 依赖已安装", 'success')
        except ImportError:
            self.log("缺少 Python 依赖，正在安装...", 'warning')
            subprocess.run([
                sys.executable, "-m", "pip", "install",
                "pillow", "numpy", "opencv-python"
            ])
            self.log("依赖安装完成", 'success')
    
    def download_tool(self):
        """下载转换工具"""
        try:
            self.log("正在克隆 mixamotoopenpose...", 'info')
            subprocess.run([
                "git", "clone",
                "https://github.com/Astropulse/mixamotoopenpose.git"
            ], check=True)
            self.log("下载完成", 'success')
        except Exception as e:
            self.log(f"下载失败: {e}", 'error')
            messagebox.showerror("错误", f"下载失败: {e}\n请手动克隆仓库")
    
    def browse_file(self):
        """浏览文件"""
        filename = filedialog.askopenfilename(
            title="选择 DAE 文件或 ZIP 压缩包",
            filetypes=[
                ("支持的文件", "*.dae *.zip"),
                ("Collada Files", "*.dae"),
                ("ZIP Archives", "*.zip"),
                ("All Files", "*.*")
            ]
        )
        if filename:
            if filename.lower().endswith('.zip'):
                dae_name = self._find_dae_in_zip(filename)
                if dae_name:
                    self.dae_file_var.set(filename)
                    self.log(f"已选择ZIP: {os.path.basename(filename)} (包含: {dae_name})", 'info')
                else:
                    messagebox.showerror("错误", f"ZIP 压缩包中未找到 DAE 文件:\n{os.path.basename(filename)}")
                    self.log(f"ZIP 中未找到 DAE 文件: {os.path.basename(filename)}", 'error')
            else:
                self.dae_file_var.set(filename)
                self.log(f"已选择文件: {os.path.basename(filename)}", 'info')

    def _find_dae_in_zip(self, zip_path):
        """在ZIP中查找DAE文件，返回文件名或None"""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                dae_files = [n for n in zf.namelist() if n.lower().endswith('.dae')]
                if dae_files:
                    return dae_files[0]
        except zipfile.BadZipFile:
            self.log(f"无效的ZIP文件: {os.path.basename(zip_path)}", 'error')
        except Exception as e:
            self.log(f"读取ZIP失败: {e}", 'error')
        return None

    def _extract_dae_from_zip(self, zip_path):
        """从ZIP中提取DAE文件到临时目录，返回临时文件路径或None"""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                dae_files = [n for n in zf.namelist() if n.lower().endswith('.dae')]
                if not dae_files:
                    return None
                dae_name = dae_files[0]
                temp_dir = tempfile.mkdtemp(prefix="mixamo_")
                extracted_path = zf.extract(dae_name, temp_dir)
                return extracted_path
        except zipfile.BadZipFile:
            self.log("无效的ZIP文件，无法提取DAE", 'error')
        except Exception as e:
            self.log(f"从ZIP提取DAE失败: {e}", 'error')
        return None
    
    def browse_output(self):
        """浏览输出目录"""
        dirname = filedialog.askdirectory(title="选择输出目录")
        if dirname:
            self.output_dir_var.set(dirname)
    
    def on_frame_change(self, event=None):
        """帧数改变时"""
        frame_count = self.frame_count_var.get()
        config = FRAME_CONFIGS.get(frame_count, {})
        self.frame_desc_label.config(
            text=f"{config.get('name', '')} - {config.get('desc', '')}"
        )
    
    def update_scale_label(self, *args):
        """更新缩放标签"""
        self.scale_label.config(text=f"{self.scale_var.get():.1f}x")
    
    def start_generation(self):
        """开始生成"""
        # 验证输入
        if not self.dae_file_var.get():
            messagebox.showerror("错误", "请选择 DAE 文件或 ZIP 压缩包")
            return
        
        if not os.path.exists(self.dae_file_var.get()):
            messagebox.showerror("错误", "文件不存在")
            return
        
        # 如果是ZIP文件，验证其中包含DAE
        if self.dae_file_var.get().lower().endswith('.zip'):
            if not self._find_dae_in_zip(self.dae_file_var.get()):
                messagebox.showerror("错误", "ZIP 压缩包中未找到 DAE 文件")
                return
        
        if self.is_generating:
            messagebox.showwarning("提示", "正在生成中，请稍候...")
            return
        
        # 确认配置
        preset = self.direction_preset_var.get()
        directions = DIRECTION_CONFIGS[preset]['directions']
        frames = self.frame_count_var.get()
        
        # 计算输出文件夹名称（预览）
        input_path = self.dae_file_var.get()
        if input_path.lower().endswith('.zip'):
            dae_name = self._find_dae_in_zip(input_path)
            animation_name = Path(dae_name).stem if dae_name else Path(input_path).stem
        else:
            animation_name = Path(input_path).stem
        dir_count = len(directions)
        frame_text = f"{frames}frames" if frames > 0 else "allframes"
        output_folder_name = f"{animation_name}_{frame_text}_{dir_count}dir"
        
        msg = (
            f"确认配置:\n\n"
            f"文件: {os.path.basename(self.dae_file_var.get())}\n"
            f"方向: {DIRECTION_CONFIGS[preset]['name']} ({len(directions)} 个)\n"
            f"帧数: {frames if frames > 0 else '全部'}\n"
            f"预计总帧数: 约 {len(directions) * (frames if frames > 0 else 30)}\n"
            f"输出文件夹: {output_folder_name}\n\n"
            f"开始生成？"
        )
        
        if not messagebox.askyesno("确认", msg):
            return
        
        # 开始生成
        self.is_generating = True
        self.generate_btn.config(state='disabled', text="生成中...")
        
        # 在后台线程中执行
        thread = threading.Thread(target=self.generate_poses, daemon=True)
        thread.start()
    
    def generate_poses(self):
        """生成姿态（后台线程）"""
        temp_dae_path = None
        try:
            input_file = self.dae_file_var.get()
            preset = self.direction_preset_var.get()
            directions = DIRECTION_CONFIGS[preset]['directions']
            frames = self.frame_count_var.get()
            scale = self.scale_var.get()
            
            # 处理ZIP文件：提取DAE到临时目录
            if input_file.lower().endswith('.zip'):
                self.log("正在从ZIP中提取DAE文件...", 'info')
                temp_dae_path = self._extract_dae_from_zip(input_file)
                if not temp_dae_path:
                    self.log("错误：无法从ZIP中提取DAE文件", 'error')
                    return
                dae_file = temp_dae_path
                animation_name = Path(temp_dae_path).stem
                self.log(f"已提取: {animation_name}.dae", 'success')
            else:
                dae_file = input_file
                animation_name = Path(dae_file).stem
            dir_count = len(directions)
            frame_text = f"{frames}frames" if frames > 0 else "allframes"
            
            # 格式：动作名_帧数_方向数dir
            # 例如：UpwardThrust_8frames_4dir
            output_folder_name = f"{animation_name}_{frame_text}_{dir_count}dir"
            output_base = os.path.join(self.output_dir_var.get(), output_folder_name)
            os.makedirs(output_base, exist_ok=True)
            
            self.log(f"开始生成: {output_folder_name}", 'info')
            self.log(f"方向数: {len(directions)}, 帧数: {frames if frames > 0 else '全部'}", 'info')
            self.log(f"输出路径: {output_base}", 'info')
            
            success_count = 0
            total_frames = 0
            
            for idx, (direction_name, rotation_y) in enumerate(directions.items(), 1):
                self.log(f"[{idx}/{len(directions)}] 生成 {direction_name} (旋转 {rotation_y}°)...", 'info')
                
                output_dir = os.path.join(output_base, direction_name)
                os.makedirs(output_dir, exist_ok=True)
                
                cmd = [
                    sys.executable,
                    "mixamotoopenpose/mixamo_to_openpose.py",
                    "-i", dae_file,
                    "-o", output_dir,
                    "-ow", "512",
                    "-oh", "512",
                    "-os", str(scale),
                    "-ry", str(rotation_y),
                    "-f", str(frames),
                    "-of", "PNG"
                ]
                
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                    
                    if result.returncode == 0:
                        # 统计帧数
                        frame_count = len(list(Path(output_dir).glob("*.png")))
                        total_frames += frame_count
                        success_count += 1
                        self.log(f"✓ {direction_name} 完成 ({frame_count} 帧)", 'success')
                    else:
                        self.log(f"✗ {direction_name} 失败", 'error')
                
                except Exception as e:
                    self.log(f"✗ {direction_name} 出错: {e}", 'error')
            
            # 生成完成
            self.log("=" * 50, 'info')
            self.log(f"生成完成！成功: {success_count}/{len(directions)}, 总帧数: {total_frames}", 'success')
            self.log(f"输出目录: {output_base}", 'info')
            self.log(f"💡 相同配置再次生成会覆盖此文件夹，不同配置会创建新文件夹", 'info')
            
            # 加载预览
            self.root.after(0, lambda: self.load_preview(output_base))
            
        except Exception as e:
            self.log(f"生成出错: {e}", 'error')
            import traceback
            traceback.print_exc()
        
        finally:
            # 清理临时提取的DAE文件
            if temp_dae_path:
                try:
                    temp_dir = os.path.dirname(temp_dae_path)
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    self.log("已清理临时文件", 'info')
                except Exception:
                    pass
            
            self.is_generating = False
            self.root.after(0, lambda: self.generate_btn.config(
                state='normal',
                text="🚀 开始生成"
            ))
    
    def load_preview(self, output_dir):
        """加载预览"""
        self.log("加载预览...", 'info')
        
        if self.preview.load_images(output_dir):
            self.log("预览加载成功！可以播放动画了", 'success')
            messagebox.showinfo("完成", "生成完成！\n可以在右侧预览动画效果")
        else:
            self.log("无法加载预览", 'warning')

# ==================== 主程序 ====================

def main():
    """主函数"""
    root = tk.Tk()
    app = PoseGeneratorGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
