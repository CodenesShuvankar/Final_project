"""
Environment verification script for Voice Emotion Detection API
Checks if all dependencies are properly installed
"""

import sys
import importlib
import subprocess

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required")
        return False
    else:
        print("✅ Python version compatible")
        return True

def check_package(package_name, import_name=None):
    """Check if a package is installed and importable"""
    if import_name is None:
        import_name = package_name
    
    try:
        module = importlib.import_module(import_name)
        if hasattr(module, '__version__'):
            version = module.__version__
        else:
            version = "unknown"
        print(f"✅ {package_name}: {version}")
        return True
    except ImportError:
        print(f"❌ {package_name}: Not installed")
        return False

def check_torch_setup():
    """Check PyTorch installation and device availability"""
    try:
        import torch
        print(f"✅ PyTorch: {torch.__version__}")
        
        # Check CUDA availability
        if torch.cuda.is_available():
            print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
        else:
            print("ℹ️  CUDA not available (using CPU)")
        
        return True
    except ImportError:
        print("❌ PyTorch: Not installed")
        return False

def check_model_files():
    """Check if model files exist"""
    import os
    
    model_path = "wav2vec2-emotion-model"
    encoder_path = os.path.join(model_path, "label_encoder.pkl")
    config_path = os.path.join(model_path, "config.json")
    
    if os.path.exists(model_path):
        print("✅ Model directory found")
        
        if os.path.exists(encoder_path):
            print("✅ Label encoder found")
        else:
            print("❌ Label encoder missing")
            return False
            
        if os.path.exists(config_path):
            print("✅ Model config found")
        else:
            print("⚠️  Model config not found (might be okay)")
            
        return True
    else:
        print("❌ Model directory not found")
        return False

def main():
    print("=" * 50)
    print("Voice Emotion API Environment Verification")
    print("=" * 50)
    print()
    
    # Check Python version
    print("1. Python Version Check:")
    python_ok = check_python_version()
    print()
    
    # Check core packages
    print("2. Core Packages:")
    packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("transformers", "transformers"),
        ("librosa", "librosa"),
        ("numpy", "numpy"),
        ("joblib", "joblib"),
        ("scipy", "scipy"),
        ("sklearn", "sklearn"),
    ]
    
    packages_ok = all(check_package(pkg, imp) for pkg, imp in packages)
    print()
    
    # Check PyTorch
    print("3. PyTorch Setup:")
    torch_ok = check_torch_setup()
    print()
    
    # Check model files
    print("4. Model Files:")
    model_ok = check_model_files()
    print()
    
    # Summary
    print("=" * 50)
    print("Summary:")
    print("=" * 50)
    
    all_ok = python_ok and packages_ok and torch_ok and model_ok
    
    if all_ok:
        print("🎉 All checks passed! Environment is ready.")
        print("\nYou can now run:")
        print("  python voice_api.py")
    else:
        print("❌ Some issues found. Please fix them before running the API.")
        print("\nTo fix package issues, run:")
        print("  pip install -r requirements.txt")
    
    return all_ok

if __name__ == "__main__":
    main()