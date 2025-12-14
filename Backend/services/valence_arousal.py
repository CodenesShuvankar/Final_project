"""Utilities for mapping discrete emotions into valence/arousal coordinates."""
from __future__ import annotations

from typing import Tuple
import math
import random

EMOTION_COORDINATES = {
    "happy": (0.9, 0.7),
    "sad": (-0.7, -0.4),
    "angry": (-0.7, 0.8),
    "fear": (-0.8, 0.9),
    "disgust": (-0.8, 0.3),   # adjusted arousal (moderate, not extreme)
    "surprise": (0.6, 0.8),
    "neutral": (0.0, 0.0),   # true neutral should be centered
}

EMOTION_ALIASES = {
    "calm": "neutral",
    "relaxed": "neutral",
    "bored": "sad",
    "tired": "sad",
    "excited": "surprise",
    "energetic": "happy",
    "stressed": "fear",
}


def compute_valence_arousal(
    emotion: str,
    confidence: float,
    jitter: float = 0.0,
) -> Tuple[float, float]:
    """Return valence/arousal scaled by confidence and optional jitter."""
    emotion_key = (emotion or "neutral").strip().lower()
    canonical = EMOTION_ALIASES.get(emotion_key, emotion_key)
    base_valence, base_arousal = EMOTION_COORDINATES.get(
        canonical, EMOTION_COORDINATES["neutral"]
    )

    confidence_clamped = max(0.0, min(1.0, confidence or 0.0))

    # scale emotion strength by confidence (closer to origin when uncertain)
    scale = 0.2 + (confidence_clamped * 0.8)
    valence = base_valence * scale
    arousal = base_arousal * scale

    if jitter > 0.0:
        jitter = max(0.0, min(0.2, jitter))
        # jitter proportional to emotion magnitude (avoid noisy neutral)
        magnitude = math.sqrt(valence * valence + arousal * arousal)
        noise = jitter * magnitude
        valence += random.uniform(-noise, noise)
        arousal += random.uniform(-noise, noise)

    valence = max(-1.0, min(1.0, valence))
    arousal = max(-1.0, min(1.0, arousal))
    return round(valence, 3), round(arousal, 3)
