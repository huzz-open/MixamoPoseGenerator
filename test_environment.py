#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境测试脚本
检查所有依赖是否正确安装
"""

import sys
import os

def test_python_version():
    """测试 Python 版本"""
    print("检查 Python 版本...")
    version = sys.version_info
    print(f"  Python {version.major}.{version.minor}.{version.micro}")
    
    if version.major >= 3 and version.minor >= 7:
        print("  ✓ Python 版本符合要求 (3.7+)")
        return True
    else:
        print("  ✗ Python 版本过低，需要 3.7 或更高")
        return False

def test_tkinter():
    """测试 Tkinter"""
    print("\n检查 Tkinter...")
    try:
        import tkinter
        print(f"  Tkinter 版本: {tkinter.TkVersion}")
        print("  ✓ Tkinter 可用")
        return True
    except ImportError:
        print("  ✗ Tkinter 未安装")
        print("  请安装: sudo apt-get install python3-tk (Linux)")
        return False

def test_pillow():
    """测试 Pillow"""
    print("\n检查 Pillow...")
    try:
        from PIL import Image, ImageTk
        import PIL
        print(f"  Pillow 版本: {PIL.__version__}")
        print("  ✓ Pillow 可用")
        return True
    except ImportError:
        print("  ✗ Pillow 未安装")
        print("  安装: pip install pillow")
        return False

def test_opencv():
    """测试 OpenCV"""
    print("\n检查 OpenCV...")
    try:
        import cv2
        print(f"  OpenCV 版本: {cv2.__version__}")
        print("  ✓ OpenCV 可用")
        return True
    except ImportError:
        print("  ✗ OpenCV 未安装")
        print("  安装: pip install opencv-python")
        return False

def test_numpy():
    """测试 NumPy"""
    print("\n检查 NumPy...")
    try:
        import numpy
        print(f"  NumPy 版本: {numpy.__version__}")
        print("  ✓ NumPy 可用")
        return True
    except ImportError:
        print("  ✗ NumPy 未安装")
        print("  安装: pip install numpy")
        return False

def test_tool():
    """测试转换工具"""
    print("\n检查转换工具...")
    
    if os.path.exists("mixamotoopenpose"):
        script_path = "mixamotoopenpose/mixamo_to_openpose.py"
        if os.path.exists(script_path):
            print("  ✓ mixamotoopenpose 工具已安装")
            return True
        else:
            print("  ✗ 工具目录存在但脚本缺失")
            return False
    else:
        print("  ✗ mixamotoopenpose 未安装")
        print("  克隆: git clone https://github.com/Astropulse/mixamotoopenpose.git")
        return False

def test_gui_file():
    """测试 GUI 文件"""
    print("\n检查 GUI 程序...")
    
    if os.path.exists("pose_generator_gui.py"):
        print("  ✓ GUI 程序文件存在")
        return True
    else:
        print("  ✗ GUI 程序文件缺失")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("  环境测试")
    print("=" * 60)
    print("")
    
    tests = [
        ("Python 版本", test_python_version),
        ("Tkinter (GUI)", test_tkinter),
        ("Pillow (图像)", test_pillow),
        ("OpenCV (图像)", test_opencv),
        ("NumPy (数值)", test_numpy),
        ("转换工具", test_tool),
        ("GUI 程序", test_gui_file),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"  ✗ 测试出错: {e}")
            results.append((name, False))
    
    # 总结
    print("\n" + "=" * 60)
    print("  测试总结")
    print("=" * 60)
    print("")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓" if result else "✗"
        print(f"  {status} {name}")
    
    print(f"\n  通过: {passed}/{total}")
    
    if passed == total:
        print("\n  ✅ 所有测试通过！环境配置正确。")
        print("  可以运行: python pose_generator_gui.py")
    else:
        print("\n  ❌ 部分测试失败，请根据提示安装缺失的依赖。")
        print("  或运行: python install_dependencies.py")
    
    print("")
    input("按 Enter 退出...")

if __name__ == "__main__":
    main()
