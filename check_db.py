import urllib.request
import json

SUPABASE_URL = "https://ttglprrkuwsnfinodzfh.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Z2xwcnJrdXdzbmZpbm9kemZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjQ2OTYsImV4cCI6MjA5OTcwMDY5Nn0.c665QX1r0_3XpOUWlG7m3ytGJLUZ6h1LXSx3pcmcc48"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
}

# Check profiles
req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/profiles?select=*",
    headers=headers
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    print(f"PROFILES ({len(data)} rows):")
    for p in data:
        print(f"  id={p['id']}, username={p['username']}, display_name={p['display_name']}")
except Exception as e:
    print(f"PROFILES ERROR: {e}")

# Check posts
req2 = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc&limit=5",
    headers=headers
)
try:
    resp2 = urllib.request.urlopen(req2)
    data2 = json.loads(resp2.read())
    print(f"\nPOSTS ({len(data2)} rows):")
    for p in data2:
        print(f"  id={p['id']}, content={p.get('content','')[:50]}")
except Exception as e:
    print(f"POSTS ERROR: {e}")
