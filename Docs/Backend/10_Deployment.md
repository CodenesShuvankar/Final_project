# Deployment Guide

## Overview
Complete guide to deploying the backend API server in development and production environments.

---

## Prerequisites


### Software Dependencies

```bash
# Python 3.10+
python --version

# pip (latest)
python -m pip install --upgrade pip

# FFmpeg (for audio processing)
ffmpeg -version

# Git (for cloning)
git --version
```

---

## Installation Steps

### Step 1: Clone Repository

```bash
# Clone the project
cd G:\My_Projects\
git clone <repository_url> Final_year
cd Final_year/BackEnd
```

### Step 2: Create Virtual Environment

**Windows (PowerShell):**
```powershell
# Create virtual environment
python -m venv venv

# Activate
.\venv\Scripts\Activate.ps1

# If execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Linux/Mac:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate
```

### Step 3: Install Python Dependencies

```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

**requirements.txt:**
```
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# ML/AI Libraries
torch==2.1.0
torchaudio==2.1.0
transformers==4.35.0
safetensors==0.4.0
librosa==0.10.1
soundfile==0.12.1
numpy==1.24.3

# Computer Vision
opencv-python==4.8.1.78
deepface==0.0.79
tensorflow==2.14.0  # Required by DeepFace

# External APIs
requests==2.31.0
python-dotenv==1.0.0

# Utilities
pillow==10.1.0
psutil==5.9.6
```

### Step 4: Install FFmpeg

**Windows:**
```powershell
# Download from: https://ffmpeg.org/download.html
# Or use chocolatey:
choco install ffmpeg

# Verify:
ffmpeg -version
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg

# Verify:
ffmpeg -version
```

**Mac:**
```bash
brew install ffmpeg

# Verify:
ffmpeg -version
```

See [INSTALL_FFMPEG.md](../BackEnd/INSTALL_FFMPEG.md) for detailed instructions.

### Step 5: Download Model Files

```bash
# Navigate to voice model directory
cd BackEnd/voice_model/final_voice_model

# If models not included, download from:
# - Hugging Face: https://huggingface.co/<your-model>
# Or use provided files

# Verify files exist:
ls -la
# Should see:
# - config.json
# - model.safetensors
# - preprocessor_config.json
```

### Step 6: Configure Environment Variables

```bash
# Create .env file in BackEnd/
cd BackEnd/
touch .env  # Windows: type nul > .env

# Edit .env
nano .env  # Or use any text editor
```

**.env contents:**
```bash
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Optional: Server Configuration
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=info

# Optional: CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Get Spotify Credentials:**
1. Go to https://developer.spotify.com/dashboard
2. Log in with Spotify account
3. Click "Create an App"
4. Fill in app name and description
5. Copy Client ID and Client Secret
6. Paste into `.env` file

---

## Running the Server

### Development Mode

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\Activate.ps1  # Windows

# Navigate to BackEnd
cd BackEnd/

# Run with auto-reload
uvicorn server_api:app --reload --host 0.0.0.0 --port 8000
```

**Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Loading voice model from ./voice_model/final_voice_model
INFO:     Voice model loaded successfully (device: cuda)
INFO:     Application startup complete.
```

**Access:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs (Swagger UI)
- ReDoc: http://localhost:8000/redoc

### Production Mode

```bash
# Run without auto-reload (more stable)
uvicorn server_api:app --host 0.0.0.0 --port 8000 --workers 4

# Or use gunicorn (better for production)
gunicorn server_api:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log
```

**Worker Recommendation:**
- **Without GPU:** 4-8 workers (based on CPU cores)
- **With GPU:** 1-2 workers (GPU is shared, more workers = OOM)

---

## Running as a Service

### Windows Service

**Option 1: NSSM (Non-Sucking Service Manager)**

```powershell
# Download NSSM: https://nssm.cc/download

# Install service
nssm install EmotionAPI "G:\My_Projects\Final_year\BackEnd\venv\Scripts\python.exe"

# Set parameters
nssm set EmotionAPI AppParameters "-m uvicorn server_api:app --host 0.0.0.0 --port 8000"
nssm set EmotionAPI AppDirectory "G:\My_Projects\Final_year\BackEnd"
nssm set EmotionAPI DisplayName "Emotion Detection API"
nssm set EmotionAPI Description "Multimodal emotion detection backend"
nssm set EmotionAPI Start SERVICE_AUTO_START

# Start service
nssm start EmotionAPI

# Check status
nssm status EmotionAPI

# Logs
nssm set EmotionAPI AppStdout "G:\My_Projects\Final_year\BackEnd\logs\service_out.log"
nssm set EmotionAPI AppStderr "G:\My_Projects\Final_year\BackEnd\logs\service_err.log"
```

### Linux Service (systemd)

```bash
# Create service file
sudo nano /etc/systemd/system/emotion-api.service
```

**Service file:**
```ini
[Unit]
Description=Emotion Detection API
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/Final_year/BackEnd
Environment="PATH=/home/youruser/Final_year/BackEnd/venv/bin"
ExecStart=/home/youruser/Final_year/BackEnd/venv/bin/uvicorn server_api:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable emotion-api

# Start service
sudo systemctl start emotion-api

# Check status
sudo systemctl status emotion-api

# View logs
sudo journalctl -u emotion-api -f
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# BackEnd/Dockerfile
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "server_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
# BackEnd/docker-compose.yml
version: '3.8'

services:
  emotion-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
    volumes:
      - ./logs:/app/logs
      - ./voice_model:/app/voice_model
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t emotion-api .

# Run container
docker run -d \
    --name emotion-api \
    --gpus all \
    -p 8000:8000 \
    -e SPOTIFY_CLIENT_ID=your_id \
    -e SPOTIFY_CLIENT_SECRET=your_secret \
    -v $(pwd)/logs:/app/logs \
    emotion-api

# Or use docker-compose
docker-compose up -d

# Check logs
docker logs -f emotion-api

# Stop
docker stop emotion-api
```

---

## Cloud Deployment

### AWS EC2

**1. Choose Instance:**
- **CPU-only:** t3.xlarge (4 vCPU, 16 GB RAM) - ~$0.17/hr
- **GPU:** g4dn.xlarge (4 vCPU, 16 GB RAM, 1 T4 GPU) - ~$0.53/hr

**2. Setup:**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv ffmpeg

# Clone repository
git clone <your-repo-url>
cd Final_year/BackEnd

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Configure .env
nano .env

# Run with gunicorn
gunicorn server_api:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

**3. Configure Security Group:**
- Allow inbound TCP on port 8000
- Or use nginx reverse proxy on port 80/443

### Google Cloud Platform (Cloud Run)

**1. Prepare Dockerfile** (same as above)

**2. Build and Deploy:**
```bash
# Build image
gcloud builds submit --tag gcr.io/your-project/emotion-api

# Deploy to Cloud Run
gcloud run deploy emotion-api \
    --image gcr.io/your-project/emotion-api \
    --platform managed \
    --region us-central1 \
    --memory 4Gi \
    --timeout 300 \
    --set-env-vars SPOTIFY_CLIENT_ID=xxx,SPOTIFY_CLIENT_SECRET=xxx
```

**Note:** Cloud Run doesn't support GPU yet (as of 2024). Use Compute Engine with GPU for GPU inference.

### Azure

**Azure Container Instances:**
```bash
# Create resource group
az group create --name emotion-api-rg --location eastus

# Create container
az container create \
    --resource-group emotion-api-rg \
    --name emotion-api \
    --image your-dockerhub-user/emotion-api:latest \
    --cpu 4 \
    --memory 8 \
    --ports 8000 \
    --environment-variables \
        SPOTIFY_CLIENT_ID=xxx \
        SPOTIFY_CLIENT_SECRET=xxx
```

---

## Nginx Reverse Proxy

### Configuration

```nginx
# /etc/nginx/sites-available/emotion-api
server {
    listen 80;
    server_name api.yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Max upload size
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

**Enable:**
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/emotion-api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

---

## Monitoring

### Health Checks

```bash
# Check if server is running
curl http://localhost:8000/

# Expected response:
# {"status":"healthy","gpu_available":true,...}

# Check specific endpoint
curl -X POST http://localhost:8000/analyze-voice \
    -F "audio_file=@test.wav"
```

### Prometheus Metrics

**Add to server_api.py:**
```python
from prometheus_client import Counter, Histogram, generate_latest

# Metrics
request_count = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')

@app.middleware("http")
async def add_metrics(request, call_next):
    request_count.inc()
    with request_duration.time():
        response = await call_next(request)
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Log Aggregation

**Using Logstash/ELK:**
```bash
# Configure filebeat
sudo nano /etc/filebeat/filebeat.yml

# Add:
filebeat.inputs:
- type: log
  paths:
    - /path/to/Final_year/BackEnd/logs/*.log
  fields:
    service: emotion-api

output.logstash:
  hosts: ["logstash:5044"]
```

---

## Performance Optimization

### 1. Model Optimization

**Quantization (reduce memory):**
```python
# Convert model to half precision
model = model.half()  # FP16

# Or use quantization
import torch.quantization
model_quantized = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
```

### 2. Caching

**Cache Spotify recommendations:**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_mood_recommendations_cached(mood: str, limit: int):
    return spotify_service.get_mood_recommendations(mood, limit)

# Clear cache every hour
import threading
import time

def clear_cache_periodically():
    while True:
        time.sleep(3600)  # 1 hour
        get_mood_recommendations_cached.cache_clear()

threading.Thread(target=clear_cache_periodically, daemon=True).start()
```

### 3. Async Processing

**Parallel voice and face analysis:**
```python
import asyncio

async def analyze_multimodal(audio_path, image_path):
    # Run in parallel
    voice_task = asyncio.to_thread(voice_api.analyze_audio_upload, audio_path)
    face_task = asyncio.to_thread(face_expression.detect_expression, image_path)
    
    voice_result, face_result = await asyncio.gather(voice_task, face_task)
    
    return voice_result, face_result
```

### 4. Connection Pooling

**Reuse HTTP connections:**
```python
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=0.3)
adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
session.mount('http://', adapter)
session.mount('https://', adapter)

# Use session instead of requests
response = session.get(url)
```

---

## Security

### 1. Environment Variables

**Never commit .env to git:**
```bash
# .gitignore
.env
*.pyc
__pycache__/
venv/
logs/
```

### 2. API Key Protection

**Use API keys for authentication:**
```python
from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader

API_KEY = os.getenv("API_KEY", "your-secret-key")
api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(..., api_key: str = Security(verify_api_key)):
    # Protected endpoint
    pass
```

### 3. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/analyze-voice-and-face")
@limiter.limit("10/minute")
async def analyze_voice_and_face(request: Request, ...):
    pass
```

### 4. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

# Restrict origins
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Don't use ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## Troubleshooting

### Issue 1: Port Already in Use

```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000

# Linux:
lsof -i :8000

# Kill process
# Windows:
taskkill /PID <process_id> /F

# Linux:
kill -9 <process_id>

# Or use different port:
uvicorn server_api:app --port 8001
```

### Issue 2: Module Import Errors

```bash
# Ensure virtual environment is activated
which python  # Should show venv path

# Reinstall requirements
pip install --force-reinstall -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"
```

### Issue 3: GPU Not Detected

```bash
# Check CUDA installation
nvidia-smi

# Check PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Reinstall PyTorch with CUDA
pip uninstall torch torchaudio
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Issue 4: Model Loading Failed

```bash
# Verify model files
ls -la BackEnd/voice_model/final_voice_model/

# Should see:
# config.json
# model.safetensors
# preprocessor_config.json

# Check file permissions
chmod 644 BackEnd/voice_model/final_voice_model/*
```

---

## Backup & Recovery

### Backup

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/emotion-api"

# Create backup
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='logs/*.log' \
    /path/to/Final_year/BackEnd

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

### Recovery

```bash
# Extract backup
tar -xzf backup_20240115.tar.gz -C /restore/location

# Recreate virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Restore .env (from secure storage)
cp /secure/location/.env BackEnd/.env

# Start server
uvicorn server_api:app --host 0.0.0.0 --port 8000
```

---

## Testing Deployment

### Smoke Tests

```bash
# 1. Health check
curl http://localhost:8000/
# Expected: {"status":"healthy",...}

# 2. Voice analysis
curl -X POST http://localhost:8000/analyze-voice \
    -F "audio_file=@test.wav"
# Expected: {"success":true,"prediction":{...}}

# 3. Face analysis
curl -X POST http://localhost:8000/analyze-face \
    -F "image_file=@test.jpg"
# Expected: {"success":true,"emotion":"happy",...}

# 4. Multimodal
curl -X POST http://localhost:8000/analyze-voice-and-face \
    -F "audio_file=@test.wav" \
    -F "image_file=@test.jpg" \
    -F "limit=20"
# Expected: {"success":true,"analysis":{...},"recommendations":[...]}

# 5. Spotify recommendations
curl http://localhost:8000/mood-recommendations/happy?limit=10
# Expected: {"success":true,"tracks":[...]}

# 6. Search
curl "http://localhost:8000/search?query=happy&type=track&limit=5"
# Expected: {"success":true,"results":{...}}
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test endpoint
ab -n 100 -c 10 http://localhost:8000/

# Results:
# Requests per second: ~XX
# Time per request: ~XXms
# Failed requests: 0
```

---

## Maintenance

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Update dependencies | Monthly | `pip list --outdated` |
| Check logs | Daily | `tail -f logs/backend.log` |
| Monitor disk space | Weekly | `df -h` |
| Check GPU health | Daily | `nvidia-smi` |
| Backup data | Daily | Run backup script |
| Update SSL certs | Automatic | Certbot auto-renewal |

### Upgrading

```bash
# Stop service
sudo systemctl stop emotion-api

# Backup current version
cp -r BackEnd BackEnd.backup

# Pull latest code
git pull origin main

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Test
uvicorn server_api:app --reload

# If success, restart service
sudo systemctl start emotion-api

# If failure, rollback
rm -rf BackEnd
mv BackEnd.backup BackEnd
sudo systemctl start emotion-api
```

---

## Cost Estimation

### Cloud Costs (Monthly)

| Service | Instance | Hours | Cost |
|---------|----------|-------|------|
| **AWS EC2 (GPU)** | g4dn.xlarge | 730 | ~$387 |
| **AWS EC2 (CPU)** | t3.xlarge | 730 | ~$124 |
| **GCP Cloud Run** | 4 vCPU, 8GB | 100k requests | ~$50 |
| **Azure Container** | 4 vCPU, 8GB | 730 | ~$140 |
| **DigitalOcean** | 8GB, 4 vCPU | 730 | ~$48 |

**Recommendation:** Start with CPU instance (~$50-125/month), upgrade to GPU if needed

### Self-Hosted Costs

| Component | One-time | Monthly |
|-----------|----------|---------|
| Server (Dell R720) | $500 | $30 (electricity) |
| GPU (RTX 3060) | $300 | $0 |
| Domain | $15/year | $1.25 |
| **Total** | **~$815** | **~$31** |

**ROI:** Self-hosted breaks even after 7-15 months

---

## Next Steps

- **[Testing Guide](../../TESTING_GUIDE.md)** - How to test the system
- **[Error Handling](./09_Error_Handling.md)** - Debugging issues
- **[Overview](./01_Overview.md)** - Back to documentation index

---

## Support

For deployment issues:
1. Check logs: `tail -f logs/backend.log`
2. Review error handling: [09_Error_Handling.md](./09_Error_Handling.md)
3. Check system resources: `htop`, `nvidia-smi`
4. Test with curl commands above
5. Contact support with request ID

**Happy Deploying! 🚀**
