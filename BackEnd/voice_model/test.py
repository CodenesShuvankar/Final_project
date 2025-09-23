def predict_single_audio(audio_path, model_path="/kaggle/working/wav2vec2-emotion-model"):
    """
    Predict emotion for a single audio file
    """
    import joblib
    
    print(f"🎵 Predicting emotion for: {audio_path}")
    
    # Load model and processor
    model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
    processor = Wav2Vec2Processor.from_pretrained(model_path)
    label_encoder = joblib.load(os.path.join(model_path, 'label_encoder.pkl'))
    
    try:
        # Load and preprocess audio
        audio_array, sample_rate = librosa.load(audio_path, sr=16000)
        
        # Process audio
        inputs = processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
            truncation=False
        )
        
        # Make prediction
        with torch.no_grad():
            logits = model(**inputs).logits
            probabilities = torch.softmax(logits, dim=-1)
            predicted_class_id = logits.argmax().item()
            predicted_emotion = label_encoder.inverse_transform([predicted_class_id])[0]
            confidence = probabilities.max().item()
        
        # Get all class probabilities
        all_probs = probabilities.squeeze().numpy()
        emotion_probs = {
            emotion: prob for emotion, prob in zip(label_encoder.classes_, all_probs)
        }
        
        print(f"   🎯 Predicted: {predicted_emotion}")
        print(f"   📊 Confidence: {confidence:.4f}")
        print(f"   📈 All probabilities:")
        for emotion, prob in sorted(emotion_probs.items(), key=lambda x: x[1], reverse=True):
            print(f"      {emotion}: {prob:.4f}")
        
        return predicted_emotion, confidence, emotion_probs
        
    except Exception as e:
        print(f"❌ Error processing audio: {str(e)}")
        return None, 0.0, {}

def batch_predict_with_progress(audio_paths, model_path="./wav2vec2-emotion-model"):
    """
    Predict emotions for multiple audio files with progress tracking
    """
    print(f"🔄 Processing {len(audio_paths)} audio files...")
    
    predictions = []
    
    for audio_path in tqdm(audio_paths, desc="Predicting emotions"):
        try:
            emotion, confidence, probs = predict_single_audio(audio_path, model_path)
            predictions.append({
                'audio_path': audio_path,
                'predicted_emotion': emotion,
                'confidence': confidence,
                **{f'prob_{emotion}': prob for emotion, prob in probs.items()}
            })
        except Exception as e:
            print(f"⚠️  Error processing {audio_path}: {str(e)}")
            predictions.append({
                'audio_path': audio_path,
                'predicted_emotion': 'Error',
                'confidence': 0.0
            })
    
    results_df = pd.DataFrame(predictions)
    print("✅ Batch prediction completed!")
    
    return results_df

# Example usage (uncomment and modify paths as needed)
# single_prediction = predict_single_audio("/path/to/your/audio.wav")