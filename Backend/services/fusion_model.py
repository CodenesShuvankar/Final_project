import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import librosa
import numpy as np
import torch
from transformers import Wav2Vec2FeatureExtractor

logger = logging.getLogger(__name__)

# Patch torch.load to allow trusted checkpoints (bypass weights_only strict mode)
original_load = torch.load
def safe_load_wrapper(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = safe_load_wrapper

EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


def _clean_state_dict_keys(state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    """Strip common wrappers (module./model.) from checkpoint keys."""
    cleaned = {}
    for k, v in state_dict.items():
        if k.startswith("module."):
            cleaned[k[len("module."):]] = v
        elif k.startswith("model."):
            cleaned[k[len("model."):]] = v
        else:
            cleaned[k] = v
    return cleaned


class NeuroSyncFusion(torch.nn.Module):
    """Audio+video fusion architecture aligned with last_checkpoint.pth."""

    def __init__(self, num_classes: int = 7):
        super().__init__()
        from transformers import Wav2Vec2Model
        from hsemotion.facial_emotions import HSEmotionRecognizer  # type: ignore

        self.audio_backbone = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-large-xlsr-53")

        # Visual backbone from HSEmotion; drop classifier head to expose features
        self.visual_interface = HSEmotionRecognizer(model_name="enet_b0_8_best_vgaf", device="cpu")
        self.video_backbone = self.visual_interface.model
        self.video_backbone.classifier = torch.nn.Identity()

        self.audio_proj = torch.nn.Linear(1024, 512)
        self.video_proj = torch.nn.Linear(1280, 512)
        self.cross_attn = torch.nn.MultiheadAttention(embed_dim=512, num_heads=8, batch_first=True, dropout=0.1)
        self.classifier = torch.nn.Sequential(
            torch.nn.LayerNorm(512),
            torch.nn.Linear(512, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(256, num_classes),
        )

    def forward(self, audio_values: torch.Tensor, video_values: torch.Tensor):
        with torch.no_grad():
            audio_out = self.audio_backbone(audio_values).last_hidden_state
        audio_feats = self.audio_proj(audio_out)

        b, f, c, h, w = video_values.shape
        video_values = video_values.view(b * f, c, h, w)
        video_feats = self.video_backbone(video_values)
        video_feats = video_feats.view(b, f, -1)
        video_feats = self.video_proj(video_feats)

        attn_out, _ = self.cross_attn(query=video_feats, key=audio_feats, value=audio_feats)
        context_vector = torch.mean(attn_out, dim=1)
        return self.classifier(context_vector)


class FusionPredictor:
    """Thin wrapper that loads the fusion model and runs inference on audio + frames."""

    def __init__(self, checkpoint_path: Path):
        self.checkpoint_path = checkpoint_path
        self.available = False
        self.model: Optional[NeuroSyncFusion] = None
        self.feature_extractor: Optional[Wav2Vec2FeatureExtractor] = None
        self.device = torch.device("cpu")
        self._load()

    def _load(self):
        if not self.checkpoint_path.exists():
            logger.warning("Fusion checkpoint not found at %s", self.checkpoint_path)
            return

        try:
            # Lazy import heavy deps inside try so we can fail gracefully
            self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained("facebook/wav2vec2-large-xlsr-53")
            self.model = NeuroSyncFusion(num_classes=len(EMOTIONS))

            state = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
            if isinstance(state, dict):
                if "state_dict" in state:
                    state = state["state_dict"]
                elif "model_state_dict" in state:
                    state = state["model_state_dict"]

            if isinstance(state, dict):
                state = _clean_state_dict_keys(state)
                missing, unexpected = self.model.load_state_dict(state, strict=False)
                if missing:
                    logger.info("Fusion checkpoint missing keys (ignored): %d keys", len(missing))
                if unexpected:
                    logger.info("Fusion checkpoint unexpected keys (ignored): %d keys", len(unexpected))
            else:
                logger.warning("Fusion checkpoint at %s not a state dict; skipping", self.checkpoint_path)
                return

            self.model.to(self.device)
            self.model.eval()
            self.available = True
            logger.info("✅ Fusion model (NeuroSyncFusion) loaded from %s", self.checkpoint_path)
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("Fusion model unavailable: %s", exc)
            self.available = False
            self.model = None
            self.feature_extractor = None

    def predict(self, audio_path: str, frames_bgr: List[np.ndarray]) -> Dict:
        """Run fusion model on audio + video frames. Requires both modalities."""
        if not self.available or not self.model or not self.feature_extractor:
            return {"success": False, "error": "Fusion model not available"}

        try:
            # Audio prep
            if not audio_path or not os.path.exists(audio_path):
                return {"success": False, "error": "Audio path missing or invalid"}
                
            audio, _ = librosa.load(audio_path, sr=16000, mono=True, duration=7.0)
            target_len = 112000  # ~7s at 16k
            if len(audio) < target_len:
                audio = np.pad(audio, (0, target_len - len(audio)))
            else:
                audio = audio[:target_len]

            audio_inputs = self.feature_extractor(
                audio,
                sampling_rate=16000,
                return_tensors="pt",
                padding="max_length",
                max_length=target_len,
                truncation=True,
            )
            audio_tensor = audio_inputs.input_values.to(self.device)

            # Video prep - sample up to 16 frames for efficiency
            processed_frames = []
            for frame in frames_bgr[:16]:
                if frame is None or frame.size == 0:
                    continue
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = cv2.resize(rgb, (224, 224))
                img = img.astype(np.float32) / 255.0
                img = np.transpose(img, (2, 0, 1))
                processed_frames.append(img)

            if not processed_frames:
                return {"success": False, "error": "No valid frames provided to fusion"}

            video_tensor = torch.tensor(np.array(processed_frames), dtype=torch.float32).unsqueeze(0).to(self.device)

            logger.info("Running fusion inference: audio=%s, frames=%d", audio_path, len(processed_frames))
            with torch.no_grad():
                logits = self.model(audio_tensor, video_tensor)
                probs = torch.softmax(logits, dim=1)[0]

            # DEBUG: Log raw logits before softmax to see if model is confident
            logits_np = logits[0].cpu().numpy()
            logits_str = ", ".join(f"{EMOTIONS[i]}={logits_np[i]:.3f}" for i in range(len(EMOTIONS)))
            logger.info("Fusion raw logits: %s", logits_str)
            
            probs_np = probs.cpu().numpy()
            best_idx = int(np.argmax(probs_np))
            emotion = EMOTIONS[best_idx]
            confidence = float(probs_np[best_idx])
            
            # DEBUG: Log ALL emotion probabilities from fusion model
            all_probs_str = ", ".join(f"{EMOTIONS[i]}={probs_np[i]:.2%}" for i in range(len(EMOTIONS)))
            logger.info("Fusion result: %s (%.2f%% confidence)", emotion, confidence * 100)
            logger.info("Fusion all probabilities: %s", all_probs_str)
            return {
                "success": True,
                "emotion": emotion,
                "confidence": confidence,
                "all_emotions": {EMOTIONS[i]: float(probs_np[i]) for i in range(len(EMOTIONS))},
            }
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Fusion inference failed: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}


# Convenience singleton helper
_fusion_predictor: Optional[FusionPredictor] = None


def get_fusion_predictor(checkpoint_path: Path) -> FusionPredictor:
    global _fusion_predictor
    if _fusion_predictor is None:
        _fusion_predictor = FusionPredictor(checkpoint_path)
    return _fusion_predictor
