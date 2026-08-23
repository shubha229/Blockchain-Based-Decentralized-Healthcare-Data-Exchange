import hashlib

file_path = "../sample_records/medical_record_001.json"

with open(file_path, "rb") as file:
    data = file.read()

file_hash = hashlib.sha256(data).hexdigest()

print("SHA-256:")
print(file_hash)