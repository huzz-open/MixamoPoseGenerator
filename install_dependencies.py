#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
依赖安装脚本
自动安装所有必需的依赖
"""

import subprocess
import sys
import os

def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")

def install_python_packages():
    """安装 Python 包"""
    print_header("安装 Python 依赖包")
    
    packages = [
        "pillow",
        "numpy", 
        "opencv-python"
    ]
    
    for package in packages:
        print(f"安装 {package}...")
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", package],
                check=True,
                capture_output=True
            )
            print(f"✓ {package} 安装成功")
        except subprocess.CalledProcessError as e:
            print(f"✗ {package} 安装失败: {e}")
            return False
    
    return True

def clone_tool():
    """克隆转换工具"""
    print_header("下载转换工具")
    
    if os.path.exists("mixamotoopenpose"):
        print("✓ 转换工具已存在")
        return True
    
    print("正在克隆 mixamotoopenpose...")
    try:
        subprocess.run([
            "git", "clone",
            "https://github.com/Astropulse/mixamotoopenpose.git"
        ], check=True)
        print("✓ 转换工具下载成功")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ 下载失败: {e}")
        print("\n请手动运行:")
        print("  git clone https://github.com/Astropulse/mixamotoopenpose.git")
        return False
    except FileNotFoundError:
        print("✗ 未找到 git 命令")
        print("\n请安装 Git:")
        print("  Windows: https://git-scm.com/download/win")
        print("  Mac: brew install git")
        print("  Linux: sudo apt install git")
        return False

def verify_installation():
    """验证安装"""
    print_header("验证安装")
    
    # 检查 Python 包
    try:
        import PIL
        print("✓ Pillow")
    except ImportError:
        print("✗ Pillow 未安装")
        return False
    
    try:
        import cv2
        print("✓ OpenCV")
    except ImportError:
        print("✗ OpenCV 未安装")
        return False
    
    try:
        import numpy
        print("✓ NumPy")
    except ImportError:
        print("✗ NumPy 未安装")
        return False
    
    # 检查工具
    if os.path.exists("mixamotoopenpose"):
        print("✓ 转换工具")
    else:
        print("✗ 转换工具未下载")
        return False
    
    return True

def main():
    """主函数"""
    print_header("多方向姿态骨架生成器 - 依赖安装")
    
    print("本脚本将自动安装以下依赖:")
    print("  1. Python 包: pillow, numpy, opencv-python")
    print("  2. 转换工具: mixamotoopenpose")
    print("")
    
    input("按 Enter 开始安装...")
    
    # 安装 Python 包
    if not install_python_packages():
        print("\n❌ Python 包安装失败")
        input("按 Enter 退出...")
        sys.exit(1)
    
    # 下载工具
    if not clone_tool():
        print("\n❌ 工具下载失败")
        input("按 Enter 退出...")
        sys.exit(1)
    
    # 验证
    if verify_installation():
        print_header("安装完成")
        print("✅ 所有依赖已成功安装！")
        print("\n现在可以运行:")
        print("  Windows: run_gui.bat")
        print("  Linux/Mac: ./run_gui.sh")
        print("  或直接: python pose_generator_gui.py")
    else:
        print_header("安装失败")
        print("❌ 部分依赖安装失败，请检查错误信息")
    
    print("")
    input("按 Enter 退出...")

if __name__ == "__main__":
    main()
