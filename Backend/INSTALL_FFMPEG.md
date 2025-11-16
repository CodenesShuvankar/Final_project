# FFmpeg Installation Guide for Windows

FFmpeg is required to handle WebM audio format from browser recordings.

## Option 1: Using Chocolatey (Recommended)

1. Open PowerShell as Administrator
2. Run:
```powershell
choco install ffmpeg -y
```

## Option 2: Using Scoop

1. If you have Scoop installed:
```powershell
scoop install ffmpeg
```

## Option 3: Manual Installation

1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
2. Download the "ffmpeg-release-essentials.zip"
3. Extract to `C:\ffmpeg`
4. Add `C:\ffmpeg\bin` to System PATH:
   - Press Win + X, select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path"
   - Click "Edit" and add `C:\ffmpeg\bin`
   - Click OK on all dialogs
5. Restart your terminal/PowerShell

## Verify Installation

After installation, verify by running:
```powershell
ffmpeg -version
```

You should see FFmpeg version information.

## Restart Backend

After installing FFmpeg, restart your backend server:
```powershell
# Stop the current server (Ctrl+C)
# Then restart:
uvicorn server_api:app --reload
```

## Alternative: Quick Install with Chocolatey

If you don't have Chocolatey, install it first:

1. Open PowerShell as Administrator
2. Run:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```
3. Then install FFmpeg:
```powershell
choco install ffmpeg -y
```

## Testing

After installation, the backend will automatically use FFmpeg to convert WebM audio files from the browser to WAV format for processing.
