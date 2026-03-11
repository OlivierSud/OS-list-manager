from PIL import Image
import os

path = r"c:\Users\olivi\Documents\DEV\WORK_PERSO\OS-list-manager\public\icone_ListManager.jpg"
if os.path.exists(path):
    with Image.open(path) as img:
        print(f"Dimensions: {img.size}")
else:
    print("File not found")
