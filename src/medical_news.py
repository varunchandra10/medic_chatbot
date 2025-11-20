# src/medical_news.py
import requests

# PUT YOUR REAL KEY HERE (the one that worked in Postman)
API_KEY = "pub_18151aa02e5642d7a42a25d813e510ca"   # ← PASTE YOUR WORKING KEY

def fetch_latest_medical_news(lang="en", max_items=10):
    url = "https://newsdata.io/api/1/latest"   # ← CHANGED TO /latest (more reliable)
    
    params = {
        "apikey": API_KEY,
        "q": "health OR medical OR diabetes OR cancer OR covid OR hypertension",
        "country": "in",
        "language": lang,
        "category": "health",
        "size": 10
    }

    try:
        print(f"Fetching {lang.upper()} medical news from India...")
        response = requests.get(url, params=params, timeout=25)
        response.raise_for_status()
        data = response.json()

        print(f"Raw API Response: {data.get('totalResults', 0)} total, {len(data.get('results', []))} returned")

        if data.get("status") != "success" and data.get("status") != "ok":
            print("API Error:", data)
            return []

        results = []
        for item in data.get("results", []):
            results.append({
                "title": item.get("title", "Health Update"),
                "summary": (item.get("description") or item.get("content") or "Latest medical news from India...")[:200] + "...",
                "link": item.get("link", "#"),
                "published": item.get("pubDate", "")[:10],
                "image": item.get("image_url") or "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"
            })

        print(f"SUCCESS → {len(results)} REAL articles loaded!")
        return results[:max_items]

    except Exception as e:
        print("Request failed:", e)
        return []