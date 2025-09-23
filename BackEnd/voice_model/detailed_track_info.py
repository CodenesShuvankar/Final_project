import requests
from dotenv import load_dotenv
import os
import base64
import json

load_dotenv()
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

def get_spotify_token():
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_bytes = auth_string.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
    
    url = "https://accounts.spotify.com/api/token"
    headers = {"Authorization": f"Basic {auth_base64}", "Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(url, headers=headers, data=data)
    return response.json()["access_token"] if response.status_code == 200 else None

def detailed_track_info(query, token):
    url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "track", "limit": 3, "market": "US"}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        tracks = response.json()["tracks"]["items"]
        for i, track in enumerate(tracks, 1):
            print(f"\n--- Track {i} ---")
            print(f"Name: {track['name']}")
            print(f"Artist: {track['artists'][0]['name']}")
            print(f"Album: {track['album']['name']}")
            print(f"Popularity: {track['popularity']}")
            print(f"Explicit: {track['explicit']}")
            print(f"Preview URL: {track.get('preview_url', 'None')}")
            print(f"External URL: {track['external_urls']['spotify']}")
            print(f"Available Markets: {len(track.get('available_markets', []))} markets")
            if track.get('available_markets'):
                print(f"First few markets: {track['available_markets'][:5]}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

token = get_spotify_token()
if token:
    print("=== Detailed Track Information ===")
    detailed_track_info("shape of you", token)