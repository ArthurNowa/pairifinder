import json
import os
from pathlib import Path
import posixpath

DATA_DIR = Path("../data")
IMAGES_DIR = Path("../images")
ANIMALS_FILE = DATA_DIR / "animals.json"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DATA_LIST = dict()

MISSING_DATA = set()
DATA_TO_COMPLETE = set()



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
    
    
    
def check_photo_in_json (animal_id, category_dir, photo_id):
    assert type(animal_id) == str, "/!\\ Erreur avec l'animal_id pour la photo {}".format(photo_id)
    
    # Check if animal exists in json
    if animal_id not in DATA_LIST.keys():
        MISSING_DATA.add(json_filename)
        return

    # check if the photo is already registered, otherwise write it
    if not photo_id in DATA_LIST[json_filename]:
        file_data = None
        datafile = DATA_DIR.joinpath(category_dir, json_filename)
        last_place = "TBD"
        with open(datafile, "r", encoding="utf-8-sig") as f:
            file_data = json.load(f)
            photo_path = str(IMAGES_DIR).replace(os.sep, "/") + "/" + category_dir + "/" + photo_id
            # Removing "../" from path
            photo_path = photo_path[3:]
            place = input("La photo :\n{}\nva être ajoutée au fichier :\n{}\n --> indiquer le lieu de la photo (appuyer sur 'entrée' pour copier le dernier lieu, ou inscrire 'TBD' pour compléter plus tard) :\n> ".format(photo_id, photo_path))
            if place == "TBD":
                DATA_TO_COMPLETE.add(datafile)
            elif place == "":
                place = last_place
            photos = file_data["photos"] + [{"fichier": photo_path, "lieu": place, "date": extract_date(extract_filename_from_path(photo_path))}]
            photos.sort(key=lambda photo : photo["fichier"], reverse=True)
            file_data["photos"] = photos
        
        if file_data != None:
            with open(datafile, "w", encoding="utf-8-sig") as f:
                json.dump(file_data, f, ensure_ascii=False, indent=2)



## Register existing data files and associated photos
def register_data(filename, category_dir):
    registered_photos = []
    file_data = None
    is_data_ok = True
    with open(ANIMALS_FILE, "r", encoding="utf-8-sig") as f:
        file_data = json.load(f)
        for i in range (len(animal_data)):
            animal_data = file_data[i]
            animal_id = animal_data["id"]
            
            photo = extract_filename_from_path(photo_data["fichier"])
            registered_photos += [photo]
            
            # register "image" data if not already there
            if "image" not in animal_data.keys():
                animal_data["image"] = animal_id + ".jpg"
    
    DATA_LIST[filename] = registered_photos
    
    # write missing data
    if file_data != None and not is_data_ok:
        with open(datafile, "w", encoding="utf-8-sig") as f:
            json.dump(file_data, f, ensure_ascii=False, indent=2)





        
if __name__ == "__main__":
    generate_json_list()
    find_last_photo()
    
    if len(MISSING_DATA) > 0:
        print("\n#######################################################")
        print("Les fichiers json suivants n'ont pas encore été créés :")
        print(MISSING_DATA)
        print()
    
    if len(DATA_TO_COMPLETE) > 0:
        print("###################################################################################")
        print("Les fichiers json suivants ont besoin d'être complétés (lieux de photo manquants) :")
        print(DATA_TO_COMPLETE)
        print()
