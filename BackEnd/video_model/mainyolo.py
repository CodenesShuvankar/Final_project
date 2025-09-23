# mainyolo.py - Final Version with Robust Re-Detection and Tracking

import cv2
from ultralytics import YOLO

try:
    face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    emotion_model = YOLO("best.pt") # <-- IMPORTANT: UPDATE THIS PATH
except Exception as e:
    print(f"---!!! ERROR: Could not load a required model !!!---")
    print(f"Please ensure 'haarcascade_frontalface_default.xml' is in the folder and the path to 'best.pt' is correct.")
    print(f"Error details: {e}")
    exit()
    
# --- INITIALIZE TRACKER AND VARIABLES ---
tracker = None
face_box = None

# --- START WEBCAM ---
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert frame to grayscale for the face detector
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # --- PRIMARY DETECTION LOGIC ---
    # Run the face detector on the grayscale frame
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))

    if len(faces) > 0:
        # If the detector finds a face, we trust it as the ground truth
        largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
        face_box = tuple(largest_face)

        # Initialize a new tracker with this accurate detection
        tracker = cv2.TrackerCSRT_create()
        tracker.init(frame, face_box)

    elif tracker is not None:
        # If detector fails, we fall back to the tracker
        success, face_box = tracker.update(frame)
        if not success:
            # If the tracker also fails, we reset everything
            face_box = None
            tracker = None
    
    # --- EMOTION CLASSIFICATION AND DRAWING ---
    # This part only runs if we have a valid face_box from either detection or tracking
    if face_box is not None:
        x, y, w, h = [int(v) for v in face_box]

        # Crop the face ROI for the emotion model
        face_roi = frame[y:y+h, x:x+w]

        if face_roi.size > 0:
            # Run emotion prediction on the cropped face
            results = emotion_model.predict(face_roi, verbose=False)

            if results[0].boxes:
                # Get the top prediction for the emotion
                best_detection = results[0].boxes[results[0].boxes.conf.argmax()]
                class_name = emotion_model.names[int(best_detection.cls[0])]
                conf = float(best_detection.conf[0])
                label = f"{class_name} {conf:.2f}"

                # Draw the bounding box and label on the original frame
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    # Display the final frame
    cv2.imshow("Emotion Detection", frame)

    # Exit on 'q' key press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()