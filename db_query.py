import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\samra\.local\share\mimocode\mimocode.db')
cursor = conn.cursor()

# Find project
print("=== PROJECTS ===")
cursor.execute("SELECT id, name, worktree, time_created FROM project ORDER BY time_created DESC LIMIT 10")
for row in cursor.fetchall():
    print(row)

# Find all sessions for the main KChat project session
print("\n=== SESSIONS (main project) ===")
cursor.execute("SELECT id, project_id, title, time_created, directory FROM session WHERE id = 'ses_0b3dd6e7dffe2ldlb6vi7jYuCY' OR parent_id = 'ses_0b3dd6e7dffe2ldlb6vi7jYuCY' ORDER BY time_created DESC")
for row in cursor.fetchall():
    print(row)

# Find the SnapThought session
print("\n=== SNAPTHOUGHT SESSION ===")
cursor.execute("SELECT id, project_id, title, time_created, directory FROM session WHERE title LIKE '%SnapThought%' ORDER BY time_created DESC LIMIT 5")
for row in cursor.fetchall():
    print(row)

# Count messages per session for main session
print("\n=== MESSAGE COUNTS ===")
cursor.execute("SELECT session_id, COUNT(*) as msg_count FROM message WHERE session_id IN (SELECT id FROM session WHERE id = 'ses_0b3dd6e7dffe2ldlb6vi7jYuCY' OR title LIKE '%SnapThought%') GROUP BY session_id ORDER BY msg_count DESC")
for row in cursor.fetchall():
    print(row)

# Search for user statements with durable keywords
print("\n=== USER STATEMENTS WITH KEYWORDS ===")
cursor.execute("""
    SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 200) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND (json_extract(p.data, '$.text') LIKE '%Supabase%'
           OR json_extract(p.data, '$.text') LIKE '%всегда%'
           OR json_extract(p.data, '$.text') LIKE '%никогда%'
           OR json_extract(p.data, '$.text') LIKE '%надо%'
           OR json_extract(p.data, '$.text') LIKE '%не надо%'
           OR json_extract(p.data, '$.text') LIKE '%забыл%'
           OR json_extract(p.data, '$.text') LIKE '%хочу%'
           OR json_extract(p.data, '$.text') LIKE '%нужно%'
           OR json_extract(p.data, '$.text') LIKE '%бюджет%'
           OR json_extract(p.data, '$.text') LIKE '%бесплатн%')
    ORDER BY m.time_created DESC
    LIMIT 30
""")
for row in cursor.fetchall():
    print(f"[{row[0]}] {row[1]}")

conn.close()
