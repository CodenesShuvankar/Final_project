export interface MoodDetection {
  mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'angry' | 'romantic' | 'confident' | 'chill';
  confidence: number; // 0-1
  timestamp: Date;
}

export interface MoodHistory {
  detections: MoodDetection[];
  lastDetection: MoodDetection | null;
}

/**
 * Mock mood detection service
 * TODO: Replace with real camera/ML integration when backend is ready
 */
export class MoodService {
  private static instance: MoodService;
  private history: MoodDetection[] = [];
  private isDetecting = false;

  static getInstance(): MoodService {
    if (!MoodService.instance) {
      MoodService.instance = new MoodService();
    }
    return MoodService.instance;
  }

  async detectMood(): Promise<MoodDetection> {
    this.isDetecting = true;
    
    // Simulate camera processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock mood detection with some randomness
    const moods: MoodDetection['mood'][] = ['happy', 'sad', 'energetic', 'calm', 'angry', 'romantic', 'confident', 'chill'];
    const weights = [0.25, 0.1, 0.2, 0.15, 0.05, 0.1, 0.1, 0.05]; // Bias towards positive moods
    
    let randomValue = Math.random();
    let selectedMood: MoodDetection['mood'] = 'happy';
    
    for (let i = 0; i < moods.length; i++) {
      if (randomValue < weights[i]) {
        selectedMood = moods[i];
        break;
      }
      randomValue -= weights[i];
    }

    const detection: MoodDetection = {
      mood: selectedMood,
      confidence: 0.7 + Math.random() * 0.25, // 70-95% confidence
      timestamp: new Date(),
    };

    this.history.push(detection);
    this.isDetecting = false;
    
    return detection;
  }

  getLastDetection(): MoodDetection | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(): MoodHistory {
    return {
      detections: [...this.history],
      lastDetection: this.getLastDetection(),
    };
  }

  isCurrentlyDetecting(): boolean {
    return this.isDetecting;
  }

  clearHistory(): void {
    this.history = [];
  }

  // Mock camera preview state
  async startCameraPreview(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return true; // Mock success
  }

  async stopCameraPreview(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
