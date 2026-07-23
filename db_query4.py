import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\samra\.local\share\mimocode\mimocode.db')
cursor = conn.cursor()

# Get SnapThought session details - all messages and parts
print("=== SNAPTHOUGHT SESSION MESSAGES ===")
cursor.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role, 
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.text') as text_preview,
           json_extract(p.data, '$.tool') as tool_name
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_099633c64ffepBa9VUhijExAiz'
    ORDER BY m.time_created
""")
for row in cursor.fetchall():
    role = row[1]
    ptype = row[2]
    text = str(row[3])[:300] if row[3] else None
    tool = row[4]
    print(f"[{role}] type={ptype} tool={tool}")
    if text:
        print(f"  text: {text}")

# Get tasks for SnapThought
print("\n=== SNAPTHOUGHT TASKS ===")
cursor.execute("SELECT id, status, summary, created_at FROM task WHERE session_id = 'ses_099633c64ffepBa9VUhijExAiz' ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(row)

# Get task events
print("\n=== SNAPTHOUGHT TASK EVENTS ===")
cursor.execute("SELECT session_id, task_id, kind, summary FROM task_event WHERE session_id = 'ses_099633c64ffepBa9VUhijExAiz' ORDER BY at DESC LIMIT 20")
for row in cursor.fetchall():
    print(row)

# Check all sessions for this project (directory = C:\mimo-projects\SnapThought)
print("\n=== ALL SNAPTHOUGHT PROJECT SESSIONS ===")
cursor.execute("SELECT id, title, time_created, directory FROM session WHERE directory LIKE '%SnapThought%' ORDER BY time_created DESC")
for row in cursor.fetchall():
    print(row)

conn.close()
