import hashlib
import os

# Project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Path to the sample medical record
file_path = os.path.join(
    BASE_DIR,
    "sample_records",
    "medical_record_001.json"
)

try:
    with open(file_path, "rb") as file:
        file_hash = hashlib.sha256(file.read()).hexdigest()

    print("File:", file_path)
    print("SHA-256 Hash:", file_hash)

except FileNotFoundError:
    print("Error: Medical record file not found.")
    print("Expected location:", file_path)