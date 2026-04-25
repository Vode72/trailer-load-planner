import sqlite3

conn = sqlite3.connect("loads.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS loads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    weight REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    pallet_width REAL NOT NULL,
    pallet_length REAL NOT NULL,
    pallet_height REAL NOT NULL,
    loading_meters REAL NOT NULL,
    volume REAL NOT NULL,
    required_trailer_type TEXT NOT NULL,
    needs_side_loading INTEGER NOT NULL DEFAULT 0,
    required_delivery_site TEXT NOT NULL,
    min_temperature REAL,
    max_temperature REAL,
    required_compartment TEXT NOT NULL
)
""")

conn.commit()
conn.close()

print("Tietokanta alustettu onnistuneesti.")