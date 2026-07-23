import sqlite3
conn = sqlite3.connect(r'C:\Users\samra\.local\share\mimocode\mimocode.db')
cursor = conn.cursor()

# List tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("=== TABLES ===")
for t in tables:
    print(t[0])

# Show schema for each table
for t in tables:
    cursor.execute(f"PRAGMA table_info({t[0]})")
    cols = cursor.fetchall()
    print(f"\n=== {t[0]} columns ===")
    for c in cols:
        print(f"  {c[1]} ({c[2]})")

# List recent sessions
print("\n=== RECENT SESSIONS ===")
cursor.execute("SELECT id, title, time_created FROM session ORDER BY time_created DESC LIMIT 10")
for row in cursor.fetchall():
    print(row)

conn.close()
