# Download MediaPipe Face Landmarker Model

The face detection model needs to be downloaded manually.

## Steps:

1. Download the model file from:
   https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

2. Save it as `face_landmarker.task` in this `public` folder

3. The file is ~2.9MB and will be loaded by the application

## Alternative (automatic download):

Run this command in your terminal:

```powershell
cd g:\My_Projects\Final_year\VibeTune\Frontend\public
Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" -OutFile "face_landmarker.task"
```
