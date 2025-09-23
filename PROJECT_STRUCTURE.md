# Project Structure

This document outlines the organization of the Final Project.

## Directory Structure

```
Final_project/
├── BackEnd/
│   ├── generator_model/          # AI content generation model
│   ├── video_model/              # Video processing and emotion detection
│   │   ├── best.pt              # Trained model weights
│   │   ├── haarcascade_frontalface_default.xml
│   │   └── mainyolo.py          # Main YOLO implementation
│   └── voice_model/             # Voice emotion recognition
│       ├── docs/                # Documentation files
│       ├── scripts/             # Setup and utility scripts
│       ├── tests/               # Test files
│       ├── mock_servers/        # Mock server implementations
│       ├── wav2vec2-emotion-model/  # Pre-trained emotion model
│       ├── voice_api.py         # Main voice API
│       ├── spotify_service.py   # Spotify integration
│       ├── requirements.txt     # Python dependencies
│       └── multimodal_emotion_training.ipynb
└── frontend/                    # Next.js frontend application
    ├── src/
    │   ├── app/                 # Next.js app directory
    │   ├── components/          # React components
    │   └── lib/                 # Utility libraries
    ├── package.json
    └── README.md

## Key Files

### Backend
- `voice_api.py` - Main API for voice emotion recognition
- `spotify_service.py` - Spotify API integration
- `requirements.txt` - Python package dependencies

### Frontend
- `package.json` - Node.js dependencies and scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration

## Getting Started

### Backend Setup
1. Navigate to the voice_model directory
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment: `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run setup scripts in the `scripts/` directory as needed

### Frontend Setup
1. Navigate to the frontend directory
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

## Environment Files
- Backend: `.env` file in voice_model directory
- Frontend: `.env.local` file in frontend directory

## Models
- Voice emotion recognition: `wav2vec2-emotion-model/`
- Video processing: `video_model/best.pt`

## Testing
Test files are located in the `tests/` directory within each module.