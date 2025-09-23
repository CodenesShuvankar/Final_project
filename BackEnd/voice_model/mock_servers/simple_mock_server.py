from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Simple mock server running"}

@app.get("/spotify/search")
async def search_music(q: str = "test"):
    return {
        "tracks": [
            {
                "id": "1",
                "name": "Happy Song",
                "artists": ["Happy Artist"],
                "album": "Happy Album",
                "duration_ms": 210000,
                "preview_url": "https://www.soundjay.com/misc/sounds/success-1.mp3",
                "external_urls": {"spotify": "https://open.spotify.com/track/1"},
                "image_url": "https://via.placeholder.com/300x300?text=Happy+Song"
            }
        ],
        "total": 1
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)