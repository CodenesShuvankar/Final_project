# Multimodal Mood → Music: DDP Training + Realtime App (OpenFace + openSMILE)

End‑to‑end skeleton: multi‑GPU training on pre‑extracted features and a realtime Streamlit app that fuses webcam + mic for mood detection and pushes Spotify recommendations.

---

## 0) Project layout
```
multimodal-mood-music/
├── env_setup.md
├── requirements.txt
├── data/
│   ├── features/
│   │   ├── face_feats.npy        # [N, Ff]  (e.g., OpenFace AU statistics)
│   │   ├── audio_feats.npy       # [N, Fa]  (e.g., openSMILE emobase)
│   │   └── labels.npy            # [N]      (string/int labels)
│   └── raw/                      # original audio/video for extraction
├── extract/
│   ├── extract_openface.py
│   └── extract_opensmile.py
├── train/
│   ├── dataset.py
│   ├── model.py
│   ├── train_ddp.py
│   └── inference.py
├── realtime/
│   └── streamlit_app.py
└── utils/
    ├── fusion.py
    └── mapping.py
```

---

## 1) requirements.txt
```txt
# Core
numpy
pandas
scikit-learn
scipy
joblib

# DL
torch>=2.1
torchvision

# Audio
librosa
sounddevice
pyaudio

# Video
opencv-python

# App
streamlit
streamlit-webrtc
spotipy
python-dotenv

# Misc
tqdm
```

> You also need **OpenFace** and **openSMILE** binaries installed and on PATH. See `env_setup.md`.

---

## 2) env_setup.md
```md
# OpenFace
# Build and place FeatureExtraction on PATH
# Example:
#   git clone https://github.com/TadasBaltrusaitis/OpenFace.git
#   cd OpenFace && ./download_models.sh && mkdir build && cd build && cmake .. && make -j
#   export PATH="$PWD/bin:$PATH"

# openSMILE
#   git clone https://github.com/audeering/opensmile.git
#   cd opensmile && mkdir build && cd build && cmake .. && make -j
#   export PATH="$PWD/progsrc/smilextract:$PATH"

# Verify
#   which FeatureExtraction
#   which SMILExtract
```

---

## 3) Feature extraction

### `extract/extract_openface.py`
```python
import os, sys, subprocess, csv, numpy as np, pandas as pd
from pathlib import Path

"""Run OpenFace FeatureExtraction to get per-frame AUs then aggregate to clip-level features."""

OF_BIN = os.environ.get("OPENFACE_BIN", "FeatureExtraction")  # on PATH

AU_KEEP = [
    "AU01_r","AU02_r","AU04_r","AU05_r","AU06_r","AU07_r",
    "AU09_r","AU10_r","AU12_r","AU14_r","AU15_r","AU17_r",
    "AU20_r","AU23_r","AU25_r","AU26_r","AU45_r"
]

STAT_FUNCS = {
    "mean": np.mean,
    "std": np.std,
    "p90": lambda x: np.percentile(x, 90),
    "max": np.max,
}

def extract_openface(video_path: str, out_csv_dir: str) -> str:
    Path(out_csv_dir).mkdir(parents=True, exist_ok=True)
    cmd = [OF_BIN, "-f", video_path, "-aus", "-out_dir", out_csv_dir]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # OpenFace writes <basename>.csv in out_csv_dir
    base = Path(video_path).stem + ".csv"
    return str(Path(out_csv_dir) / base)

def aggregate(csv_path: str) -> np.ndarray:
    df = pd.read_csv(csv_path)
    # guard for empty
    if df.shape[0] == 0:
        return np.zeros(len(AU_KEEP) * len(STAT_FUNCS), dtype=np.float32)
    feats = []
    for au in AU_KEEP:
        if au not in df.columns:
            feats.extend([0.0]*len(STAT_FUNCS))
            continue
        x = df[au].values
        for _, fn in STAT_FUNCS.items():
            feats.append(float(fn(x)))
    return np.asarray(feats, dtype=np.float32)

if __name__ == "__main__":
    vid_dir = sys.argv[1]  # e.g., data/raw/videos
    out_csv = sys.argv[2]  # e.g., data/features/openface_csv
    out_npy = sys.argv[3]  # e.g., data/features/face_feats.npy

    rows = []
    for p in sorted(Path(vid_dir).glob("*.mp4")):
        csv_path = extract_openface(str(p), out_csv)
        rows.append(aggregate(csv_path))
    X = np.vstack(rows) if rows else np.zeros((0, len(AU_KEEP)*len(STAT_FUNCS)), dtype=np.float32)
    np.save(out_npy, X)
    print("face_feats:", X.shape)
```

### `extract/extract_opensmile.py`
```python
import os, sys, subprocess, numpy as np
from pathlib import Path

"""Run openSMILE emobase config and aggregate to clip-level features (it already outputs global functionals)."""

SMILE_BIN = os.environ.get("SMILExtract_BIN", "SMILExtract")
SMILE_CONF = os.environ.get("SMILE_CONF", "config/emobase.conf")  # adjust to your build

def run_smile(wav_path: str, out_csv: str):
    cmd = [SMILE_BIN, "-C", SMILE_CONF, "-I", wav_path, "-O", out_csv]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    wav_dir = sys.argv[1]   # e.g., data/raw/wavs
    out_dir = sys.argv[2]   # e.g., data/features/opensmile_csv
    out_npy = sys.argv[3]   # e.g., data/features/audio_feats.npy

    Path(out_dir).mkdir(parents=True, exist_ok=True)
    rows = []
    for wav in sorted(Path(wav_dir).glob("*.wav")):
        out_csv = Path(out_dir) / (wav.stem + ".csv")
        run_smile(str(wav), str(out_csv))
        # openSMILE emobase usually outputs one row per file with many columns
        import pandas as pd
        df = pd.read_csv(out_csv, sep=";") if str(out_csv).endswith(".csv") else pd.read_csv(out_csv)
        rows.append(df.iloc[0].select_dtypes(include=[float,int]).values.astype(np.float32))
    import numpy as np
    X = np.vstack(rows) if rows else np.zeros((0, len(rows[0])), dtype=np.float32) if rows else np.zeros((0, 1), dtype=np.float32)
    np.save(out_npy, X)
    print("audio_feats:", X.shape)
```

---

## 4) Dataset and model

### `train/dataset.py`
```python
import numpy as np
import torch
from torch.utils.data import Dataset

class FeaturePairDataset(Dataset):
    def __init__(self, face_npy, audio_npy, labels_npy):
        self.face = np.load(face_npy)
        self.audio = np.load(audio_npy)
        self.labels = np.load(labels_npy)
        assert len(self.face) == len(self.audio) == len(self.labels)
        self.classes, self.y = np.unique(self.labels, return_inverse=True)
        self.y = self.y.astype("int64")
    def __len__(self):
        return len(self.y)
    def __getitem__(self, idx):
        xf = torch.from_numpy(self.face[idx]).float()
        xa = torch.from_numpy(self.audio[idx]).float()
        y  = torch.tensor(self.y[idx]).long()
        return xf, xa, y
```

### `train/model.py`
```python
import torch
import torch.nn as nn

class Branch(nn.Module):
    def __init__(self, in_dim, hidden=256, out_dim=128, p=0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.LayerNorm(in_dim),
            nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(p),
            nn.Linear(hidden, out_dim), nn.ReLU()
        )
    def forward(self, x):
        return self.net(x)

class FusionHead(nn.Module):
    def __init__(self, feat_dim, n_classes):
        super().__init__()
        self.cls = nn.Sequential(
            nn.LayerNorm(feat_dim),
            nn.Linear(feat_dim, feat_dim//2), nn.ReLU(),
            nn.Linear(feat_dim//2, n_classes)
        )
    def forward(self, z):
        return self.cls(z)

class AVFusion(nn.Module):
    def __init__(self, in_face, in_audio, n_classes):
        super().__init__()
        self.face = Branch(in_face)
        self.audio = Branch(in_audio)
        self.fuse = FusionHead(128+128, n_classes)
    def forward(self, xf, xa):
        zf = self.face(xf)
        za = self.audio(xa)
        z = torch.cat([zf, za], dim=-1)
        logits = self.fuse(z)
        return logits
```

---

## 5) Multi‑GPU training (PyTorch DDP)

### `train/train_ddp.py`
```python
import os, argparse, torch, torch.distributed as dist
from torch.utils.data import DataLoader, DistributedSampler
from torch.nn.parallel import DistributedDataParallel as DDP
import torch.nn.functional as F
from tqdm import tqdm
from dataset import FeaturePairDataset
from model import AVFusion

# Usage: python -m torch.distributed.run --nproc_per_node=NUM train_ddp.py \
#   --face data/features/face_feats.npy --audio data/features/audio_feats.npy \
#   --labels data/features/labels.npy --epochs 30 --lr 1e-3 --out model.pt

def setup():
    dist.init_process_group(backend="nccl")
    torch.cuda.set_device(int(os.environ["LOCAL_RANK"]))

def cleanup():
    dist.destroy_process_group()

@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    correct = total = 0
    for xf, xa, y in loader:
        xf, xa, y = xf.to(device), xa.to(device), y.to(device)
        logits = model(xf, xa)
        pred = logits.argmax(1)
        correct += (pred==y).sum().item()
        total += y.numel()
    return correct/total if total else 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--face', required=True)
    parser.add_argument('--audio', required=True)
    parser.add_argument('--labels', required=True)
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch', type=int, default=128)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--out', type=str, default='model.pt')
    args = parser.parse_args()

    setup()
    rank = dist.get_rank()
    device = torch.device('cuda', int(os.environ['LOCAL_RANK']))

    ds = FeaturePairDataset(args.face, args.audio, args.labels)
    n_classes = len(ds.classes)
    in_face = ds[0][0].numel()
    in_audio = ds[0][1].numel()

    train_size = int(0.8 * len(ds))
    val_size = len(ds) - train_size
    torch.manual_seed(42)
    train_ds, val_ds = torch.utils.data.random_split(ds, [train_size, val_size])

    train_samp = DistributedSampler(train_ds, shuffle=True)
    val_samp   = DistributedSampler(val_ds, shuffle=False)

    train_ld = DataLoader(train_ds, batch_size=args.batch, sampler=train_samp, num_workers=4, pin_memory=True)
    val_ld   = DataLoader(val_ds, batch_size=args.batch, sampler=val_samp, num_workers=4, pin_memory=True)

    model = AVFusion(in_face, in_audio, n_classes).to(device)
    model = DDP(model, device_ids=[device.index], output_device=device.index)

    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)
    best = 0.0

    for epoch in range(1, args.epochs+1):
        model.train()
        train_samp.set_epoch(epoch)
        pbar = tqdm(train_ld, disable=(rank!=0))
        for xf, xa, y in pbar:
            xf, xa, y = xf.to(device), xa.to(device), y.to(device)
            logits = model(xf, xa)
            loss = F.cross_entropy(logits, y)
            opt.zero_grad(); loss.backward(); opt.step()
            if rank==0:
                pbar.set_description(f"ep{epoch} loss={loss.item():.4f}")
        val_acc = evaluate(model, val_ld, device)
        if rank==0:
            print(f"epoch {epoch} val_acc {val_acc:.4f}")
            if val_acc > best:
                best = val_acc
                torch.save({
                    'model_state': model.module.state_dict(),
                    'classes': ds.classes,
                }, args.out)
    cleanup()

if __name__ == '__main__':
    main()
```

---

## 6) Offline inference utility

### `train/inference.py`
```python
import torch, numpy as np
from model import AVFusion

class Inference:
    def __init__(self, ckpt_path, in_face, in_audio):
        blob = torch.load(ckpt_path, map_location='cpu')
        self.classes = blob['classes']
        self.model = AVFusion(in_face, in_audio, len(self.classes))
        self.model.load_state_dict(blob['model_state'])
        self.model.eval()
    @torch.no_grad()
    def predict_proba(self, face_vec, audio_vec):
        xf = torch.from_numpy(face_vec).float().unsqueeze(0)
        xa = torch.from_numpy(audio_vec).float().unsqueeze(0)
        logits = self.model(xf, xa)
        return torch.softmax(logits, dim=1).numpy()[0]
```

---

## 7) Fusion rules and mapping to music

### `utils/fusion.py`
```python
import numpy as np

def confidence_weighted(face_probs, audio_probs, face_conf=None, audio_conf=None, w_face=0.5, w_audio=0.5):
    # Optional dynamic weighting by entropy or max prob
    if face_conf is None: face_conf = float(np.max(face_probs))
    if audio_conf is None: audio_conf = float(np.max(audio_probs))
    wf = w_face * face_conf / max(1e-6, (face_conf + audio_conf))
    wa = w_audio * audio_conf / max(1e-6, (face_conf + audio_conf))
    probs = wf * face_probs + wa * audio_probs
    probs = probs / probs.sum()
    return probs
```

### `utils/mapping.py`
```python
# Map emotion → Spotify audio features target ranges
# Adjust per evaluation
EMOTION_TO_SPOTIFY = {
    'happy': dict(target_valence=0.9, min_energy=0.6, market='IN'),
    'sad':   dict(target_valence=0.2, max_energy=0.4, market='IN'),
    'angry': dict(target_valence=0.3, min_energy=0.7, market='IN'),
    'neutral': dict(target_valence=0.5, market='IN'),
    'fear':  dict(target_valence=0.2, min_tempo=80, market='IN'),
    'surprise': dict(target_valence=0.7, min_energy=0.5, market='IN'),
}

ORDERED = list(EMOTION_TO_SPOTIFY.keys())
```

---

## 8) Realtime app

### `realtime/streamlit_app.py`
```python
import os, time, queue, threading, io
import numpy as np
import streamlit as st
import cv2
import sounddevice as sd
import librosa
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

from utils.fusion import confidence_weighted
from utils.mapping import EMOTION_TO_SPOTIFY, ORDERED

# ---- Config ----
st.set_page_config(page_title="Mood → Music", layout="wide")
load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
sp = None
if SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET:
    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID, client_secret=SPOTIFY_CLIENT_SECRET))

# ---- Load model ----
import torch
from train.model import AVFusion

CKPT = os.getenv("CKPT", "model.pt")
blob = torch.load(CKPT, map_location='cpu')
classes = [str(x) for x in blob['classes']]
# Infer input dims from checkpoint by storing them when saving or infer from feature extractors
# For demo assume dims known via env or small probe vectors
IN_FACE = int(os.getenv('IN_FACE', '68'))
IN_AUDIO = int(os.getenv('IN_AUDIO', '1582'))
model = AVFusion(IN_FACE, IN_AUDIO, len(classes))
model.load_state_dict(blob['model_state'])
model.eval()

# ---- Helpers ----

def face_feature_from_frame(frame_bgr) -> np.ndarray:
    # Minimal proxy: use a precomputed OpenFace per-frame AU via subprocess is too slow in realtime.
    # Here we approximate with a placeholder vector (replace with a fast AU estimator or a lightweight FER model).
    # You can integrate OpenFace in daemon mode and read stdout for AUs.
    h, w, _ = frame_bgr.shape
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    m = float(gray.mean())
    s = float(gray.std())
    vec = np.array([m, s] + [0.0]*(IN_FACE-2), dtype=np.float32)
    return vec


def audio_feature_from_buffer(wave, sr) -> np.ndarray:
    # Use librosa MFCCs + stats as a quick proxy to approximate openSMILE features for demo
    mfcc = librosa.feature.mfcc(y=wave, sr=sr, n_mfcc=40)
    feats = np.concatenate([
        mfcc.mean(axis=1),
        mfcc.std(axis=1),
    ])
    pad = IN_AUDIO - feats.size
    if pad > 0:
        feats = np.pad(feats, (0,pad))
    else:
        feats = feats[:IN_AUDIO]
    return feats.astype(np.float32)


def predict(face_vec, audio_vec):
    import torch
    with torch.no_grad():
        xf = torch.from_numpy(face_vec).float().unsqueeze(0)
        xa = torch.from_numpy(audio_vec).float().unsqueeze(0)
        logits = model(xf, xa)
        probs = torch.softmax(logits, dim=1).numpy()[0]
    return probs


def recommend(emotion: str, sp: spotipy.Spotify):
    if sp is None:
        return []
    params = EMOTION_TO_SPOTIFY.get(emotion, {"market":"IN"}).copy()
    # Use recommendations with generic seeds (popular artists/genres). Replace with user history.
    seeds = dict(seed_genres=['pop','rock','edm','acoustic','indian'])
    rec = sp.recommendations(limit=10, **params, **seeds)
    items = rec.get('tracks', [])
    return [
        {
            'name': t['name'],
            'artists': ", ".join([a['name'] for a in t['artists']]),
            'url': t['external_urls']['spotify'],
            'preview': t.get('preview_url')
        }
        for t in items
    ]

# ---- UI ----
st.title("Multimodal Mood → Music")
col1, col2 = st.columns(2)

# Webcam loop
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    st.error("Webcam not accessible")

AUDIO_SR = 16000
AUDIO_SEC = 2.0

placeholder_img = col1.empty()
status = st.empty()

# Audio buffer capture

def record_audio(seconds=AUDIO_SEC, sr=AUDIO_SR):
    audio = sd.rec(int(seconds*sr), samplerate=sr, channels=1, dtype='float32')
    sd.wait()
    return audio[:,0]

btn = st.button("Start Live Loop")

if btn and cap.isOpened():
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame = cv2.flip(frame, 1)
        placeholder_img.image(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), channels="RGB")

        # Extract features
        fvec = face_feature_from_frame(frame)
        awav = record_audio(AUDIO_SEC, AUDIO_SR)
        avec = audio_feature_from_buffer(awav, AUDIO_SR)

        # Predict with model
        probs = predict(fvec, avec)
        emo = classes[int(np.argmax(probs))]
        status.markdown(f"**Detected:** {emo} | probs: {np.round(probs,3)}")

        # Recommend
        recs = recommend(emo, sp)
        with col2:
            st.subheader("Songs")
            for r in recs:
                st.write(f"{r['name']} — {r['artists']}")
                st.write(r['url'])
        # modest rate
        time.sleep(0.5)
```

> Note: In realtime we replaced heavy extractors with fast proxies. For production, run OpenFace as a persistent process and parse AUs, and use an on‑device SER model trained on openSMILE features.

---

## 9) Preparing labels
Create `data/features/labels.npy` as integer or string class labels aligned to rows in `face_feats.npy` and `audio_feats.npy`.

Example:
```python
import numpy as np
labels = np.array(["happy","sad","angry","neutral", ...], dtype=object)
np.save("data/features/labels.npy", labels)
```

---

## 10) Commands

```bash
# 1) Extract features (offline)
python extract/extract_openface.py data/raw/videos data/features/openface_csv data/features/face_feats.npy
python extract/extract_opensmile.py data/raw/wavs   data/features/opensmile_csv data/features/audio_feats.npy

# 2) Save labels -> data/features/labels.npy

# 3) Train multi-GPU (DDP)
python -m torch.distributed.run --nproc_per_node=2 train/train_ddp.py \
  --face data/features/face_feats.npy \
  --audio data/features/audio_feats.npy \
  --labels data/features/labels.npy \
  --epochs 30 --batch 256 --lr 1e-3 --out model.pt

# 4) Realtime app
export SPOTIFY_CLIENT_ID=...; export SPOTIFY_CLIENT_SECRET=...
streamlit run realtime/streamlit_app.py
```

---

## 11) Notes and upgrades
- Replace the realtime face proxy with actual AU stream: run `FeatureExtraction -cam_id 0 -aus` and read CSV/stdout.
- Swap audio proxy with a small on‑device SER classifier trained on openSMILE features.
- Use entropy‑based dynamic weights in `utils/fusion.py`.
- Cache Spotify recommendations by emotion to reduce API calls.
- Add user feedback loop to fine‑tune fusion weights per user.
- For mobile/web, move inference to a small ONNX model and use WebRTC for streams.
```

