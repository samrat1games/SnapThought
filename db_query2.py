import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\samra\.local\share\mimocode\mimocode.db')
cursor = conn.cursor()

# Get ALL user statements from the main KChat session to find durable facts
print("=== ALL USER STATEMENTS (KChat session, last 100) ===")
cursor.execute("""
    SELECT m.time_created, substr(json_extract(p.data, '$.text'), 1, 300) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0b3dd6e7dffe2ldlb6vi7jYuCY'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND length(json_extract(p.data, '$.text')) > 5
    ORDER BY m.time_created DESC
    LIMIT 100
""")
for row in cursor.fetchall():
    print(f"[{row[0]}] {row[1]}")

# Check if there are tasks for this session
print("\n=== TASKS FOR KCHAT SESSION ===")
cursor.execute("SELECT id, status, summary, created_at, ended_at FROM task WHERE session_id = 'ses_0b3dd6e7dffe2ldlb6vi7jYuCY' ORDER BY created_at DESC LIMIT 10")
for row in cursor.fetchall():
    print(row)

# Check for SnapThought-specific sessions
print("\n=== ALL SNAPTHOUGHT SESSIONS ===")
cursor.execute("SELECT id, title, time_created, directory FROM session WHERE title LIKE '%SnapThought%' OR directory LIKE '%SnapThought%' ORDER BY time_created DESC")
for row in cursor.fetchall():
    print(row)

# Get SnapThought session messages
print("\n=== SNAPTHOUGHT MESSAGES ===")
cursor.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role, substr(json_extract(p.data, '$.text'), 1, 300) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_099633c64ffepBa9VUhijExAiz'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created
""")
for row in cursor.fetchall():
    print(f"[{row[1]}] {row[2]}")

# Search for error patterns across all sessions
print("\n=== ERROR PATTERNS (Supabase/cookie/auth) ===")
cursor.execute("""
    SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 200) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(p.data, '$.type') = 'text'
      AND (json_extract(p.data, '$.text') LIKE '%error%'
           OR json_extract(p.data, '$.text') LIKE '%ошибк%'
           OR json_extract(p.data, '$.text') LIKE '%баг%'
           OR json_extract(p.data, '$.text') LIKE '%не работает%'
           OR json_extract(p.data, '$.text') LIKE '%broken%')
    ORDER BY m.time_created DESC
    LIMIT 20
""")
for row in cursor.fetchall():
    print(f"[{row[0]}] {row[1]}")

conn.close()
