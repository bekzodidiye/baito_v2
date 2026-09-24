import sys
import os
import pytesseract
from PIL import Image

def analyze_image(filepath):
    try:
        img = Image.open(filepath)
        text = pytesseract.image_to_string(img)
        print(f"--- {os.path.basename(filepath)} ---")
        print("Text detected:")
        print(text[:500])
        print("-------------------")
    except Exception as e:
        print(f"Error on {filepath}: {e}")

if __name__ == "__main__":
    directory = "/home/Bekzod/.gemini/antigravity-ide/brain/91b1342a-ad91-4970-b0f6-310f0b5e857a/.user_uploaded"
    files = sorted([f for f in os.listdir(directory) if f.startswith("media_178954")])
    for f in files:
        analyze_image(os.path.join(directory, f))
