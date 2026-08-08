import sqlite3
conn = sqlite3.connect('/home/Bekzod/Desktop/baito-v3-/backend/baito_new.db')
c = conn.cursor()
try:
    c.execute("ALTER TABLE applications ADD COLUMN review VARCHAR;")
except sqlite3.OperationalError as e:
    print(e)
try:
    c.execute("ALTER TABLE applications ADD COLUMN bonus INTEGER;")
except sqlite3.OperationalError as e:
    print(e)
conn.commit()
conn.close()
print("DB updated")
