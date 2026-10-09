import json
import os
import fnmatch
from pathlib import Path
import posixpath


DATA_DIR = Path("../data")
IMAGES_DIR = Path("../images")
ANIMALS_FILE = DATA_DIR / "animals.json"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DATA_LIST = dict()
IMAGES_DATA = set()

ALL_NEEDED_IMAGES = set()

MISSING_IMAGES = set()
IMAGES_TO_FIX = set()



def extract_filename_from_path(path):
    return path.split("/")[-1]



def extract_animal_id_from_photo_filename(file_name):
    stem = Path(file_name).stem
    parts = stem.split("_")
    if len(parts) < 2:
        return None
        
    animal_words = parts[1].split("-")
    if animal_words[-1].isdigit():
        animal_words = animal_words[:-1]
    return "-".join(animal_words)
 
    

def register_images ():
    global IMAGES_DATA
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            IMAGES_DATA.add(file)


def find_images_by_id (animal_id):
    global IMAGES_DATA
    matches = []
    for filename in IMAGES_DATA:
        if fnmatch.fnmatch(filename, animal_id + ".*"):
            matches.append(filename)
    return matches

    
def check_images_in_json (animal_id, animal_image):
    global MISSING_IMAGES, IMAGES_TO_FIX
    assert type(animal_id) == str, "/!\\ Erreur de clé avec l'animal_id {}".format(animal_id)
    assert type(animal_image) == str, "/!\\ Erreur d'image avec l'animal_id {}".format(animal_id)


    res = find_images_by_id (animal_id)
    if len(res) == 0:
        MISSING_IMAGES.add(animal_id)
    elif len(res) > 1:
        IMAGES_TO_FIX.add(animal_id)
    elif res[0] != animal_image:
        IMAGES_TO_FIX.add(animal_id)
            


def check_photos_from_json ():
    global DATA_LIST
    for animal in DATA_LIST:
        animal_id = animal["id"]
        animal_image = animal["image"]
        check_images_in_json (animal_id, animal_image)
        

def rename_photos ():
    for photo in IMAGES_DIR.rglob("*"):
        # ignore folders
        if not photo.is_file():
            continue

        # ignore files that aren't images
        if photo.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        
        filename = photo.name
        name, ext = photo.name.split(".")
        
        new_filename = name.strip("0123456789_-") + "." + ext
        print(filename, new_filename)
        os.rename(IMAGES_DIR.joinpath(filename), IMAGES_DIR.joinpath(new_filename))



## Register existing data files and associated photos
def register_data():
    global DATA_LIST
    
    file_data = None
    with open(ANIMALS_FILE, "r", encoding="utf-8-sig") as f:
        file_data = json.load(f)
        for i in range (len(file_data)):
            animal_data = file_data[i]
            animal_id = animal_data["id"]
            
            # register "image" data if not already there
            if "image" not in animal_data.keys():
                animal_data["image"] = animal_id + ".jpg"
            ALL_NEEDED_IMAGES.add(animal_data["image"])
            
    DATA_LIST = file_data
    # write missing data
    if file_data != None:
        with open(ANIMALS_FILE, "w", encoding="utf-8-sig") as f:
            json.dump(file_data, f, ensure_ascii=False, indent=2)




        
if __name__ == "__main__":
    register_data()
    print("Data mise à jour avec les champs 'image'")
    print()
    
    rename_photos()
    print("Photos du dossier 'images' renommées au bon format")
    print()
    
    register_images()
    check_photos_from_json ()
    if len(MISSING_IMAGES) > 0:
        print("\n#######################################################")
        print("Les animaux suivants n'ont pas encore d'images :")
        print(MISSING_IMAGES)
        print()
    else:
        print("\n#######################################################")
        print("Toutes les images sont présentes.")
        print()
        
    
    if len(IMAGES_TO_FIX) > 0:
        print("###################################################################################")
        print("Les images suivantes ne correspondent pas aux données (mauvaise extension ou plusieurs images trouvées) :")
        print(IMAGES_TO_FIX)
        print()
