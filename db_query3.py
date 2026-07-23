import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\samra\.local\share\mimocode\mimocode.db')
cursor = conn.cursor()

# Get SnapThought session details
print("=== SNAPTHOUGHT SESSION (ses_099633c64ffepBa9VUhijExAiz) MESSAGES ===")
cursor.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role, 
           json_extract(p.data, '$.type') as part_type,
           substr(json_extract(p.data, '$.text'), 1, 400) as preview,
           substr(json_extract(p.data, '$.tool'), 0, 100) as tool
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_099633c64ffepBa9VUhijExAiz'
    ORDER BY m.time_created
""")
for row in cursor.fetchall():
    print(f"[{row[1]}] type={row[2]} tool={row[4]} preview={row[3][:200]}")

# Check tasks for SnapThought
print("\n=== SNAPTHOUGHT TASKS ===")
cursor.execute("SELECT id, status, summary, created_at FROM task WHERE session_id = 'ses_099633c64ffepBa9VUhijExAiz' ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(row)

# Find all sessions in the last 7 days
print("\n=== ALL SESSIONS (last 7 days) ===")
import time
seven_days_ago = int((time.time() - 7*24*3600) * 1000)
cursor.execute("SELECT id, title, time_created, directory FROM session WHERE time_created > ? ORDER BY time_created DESC", (seven_days_ago,))
for row in cursor.fetchall():
    print(row)

# Search for SnapThought-related user statements
print("\n=== SNAPTHOUGHT USER STATEMENTS ===")
cursor.execute("""
    SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 300) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND (json_extract(p.data, '$.text') LIKE '%SnapThought%'
           OR json_extract(p.data, '$.text') LIKE '%соцсеть%'
           OR json_extract(p.data, '$.text') LIKE '%Instagram%'
           OR json_extract(p.data, '$.text') LIKE '%X%')
    ORDER BY m.time_created DESC
    LIMIT 20
""")
for row in cursor.fetchall():
    print(f"[{row[0]}] {row[1]}")

# Check all user rules/preferences
print("\n=== USER RULES/PREFERENCES ===")
cursor.execute("""
    SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 300) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND (json_extract(p.data, '$.text') LIKE '%всегда%'
           OR json_extract(p.data, '$.text') LIKE '%никогда%'
           OR json_extract(p.data, '$.text') LIKE '%не надо%'
           OR json_extract(p.data, '$.text') LIKE '%надо%'
           OR json_extract(p.data, '$.text') LIKE '%правило%'
           OR json_extract(p.data, '$.text') LIKE '%требовани%'
           OR json_extract(p.data, '$.text') LIKE '%хочу чтоб%')
    ORDER BY m.time_created DESC
    LIMIT 30
""")
for row in cursor.fetchall():
    print(f"[{row[0]}] {row[1]}")

conn.close()
