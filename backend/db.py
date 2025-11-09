import json
import os
from datetime import date
import uuid




def add_receipt(user,items):
    RECEIPTS_PATH = "data/receipts.json"
    

    # Build one receipt object
    new_receipt = {
        "entry_id": str(uuid.uuid4()),          # unique id
        "date": date.today().isoformat(),         # e.g. "2025-11-08"
        "items": items
    }

    data = []

    # If file exists, load it (expecting a JSON array)
    if os.path.exists(RECEIPTS_PATH):
        with open(RECEIPTS_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                data = json.loads(content)

    # Find existing user entry if present
    
    user_entry = None
    for entry in data:
        if entry.get("user") == user:
            user_entry = entry
            break

    # If user not present, create their structure
    if user_entry is None:
        user_entry = {
            "user": user,
            "receipts": []
        }
        data.append(user_entry)

    # Append the new receipt to this user's receipts
    user_entry["receipts"].append(new_receipt)

    # Save back to Receipts.json
    with open(RECEIPTS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("✅ Added shopping receipt for", user)


def add_energy(user,bill):
    PATH = "data/energy.json"

    

    # Build one receipt object
    new_entry = {
        "entry_id": str(uuid.uuid4()),          # unique id
        "date": date.today().isoformat(),         # e.g. "2025-11-08"
        "start_date": bill['startDate'],
        "end_date": bill['endDate'],
        "consumption_kwh": bill['energy'],
        "emissions": bill['carbonFootPrint']
    }

    data = []

    # If file exists, load it (expecting a JSON array)
    if os.path.exists(PATH):
        with open(PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                data = json.loads(content)

    # Find existing user entry if present
    
    user_entry = None
    for entry in data:
        if entry.get("user") == user:
            user_entry = entry
            break

    # If user not present, create their structure
    if user_entry is None:
        user_entry = {
            "user": user,
            "energy_bills": []
        }
        data.append(user_entry)

    # Append the new receipt to this user's receipts
    user_entry["energy_bills"].append(new_entry)

    # Save back to Receipts.json
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("✅ Added energy receipt for", user)

def add_rides(user,bill):
    PATH = "data/transport.json"

    

    # Build one receipt object
    new_entry = {
        "entry_id": str(uuid.uuid4()),          # unique id
        "date": date.today().isoformat(),         # e.g. "2025-11-08"
        "ride_date": bill['date'],
        "distance_miles": bill['distance_miles'],
        "vehicle_type": bill['vehicle_type'],
        "emissions": bill['carbonFootPrint']
    }

    data = []

    # If file exists, load it (expecting a JSON array)
    if os.path.exists(PATH):
        with open(PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                data = json.loads(content)

    # Find existing user entry if present
    
    user_entry = None
    for entry in data:
        if entry.get("user") == user:
            user_entry = entry
            break

    # If user not present, create their structure
    if user_entry is None:
        user_entry = {
            "user": user,
            "rides": []
        }
        data.append(user_entry)

    # Append the new receipt to this user's receipts
    user_entry["rides"].append(new_entry)

    # Save back to Receipts.json
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("✅ Added rides for", user)

if __name__ == "__main__":
    user="Aashnna Soni"
    items = [
        {
            "item_name": "NATURAL BNLS SKNLS CKN T",
            "emissions": 6.0
        },
        {
            "item_name": "NATURAL BNLS SKNLS CKN T",
            "emissions": 6.0
        },
        {
            "item_name": "ORGANIC CHICKEN DRUMSTIC",
            "emissions": 5.5
        }
    ]
    add_receipt(user, items)
