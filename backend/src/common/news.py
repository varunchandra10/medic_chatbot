# backend/src/common/news.py
import requests

try:
    from backend.config import Config
except ImportError:
    from backend.config import Config

FALLBACK_NEWS = {
    "in": [
        {
            "title": "India launches nationwide diabetes screening program",
            "summary": "Free testing camps in 500+ districts starting with point-of-care HbA1c testing and lifestyle counseling...",
            "link": "https://pib.gov.in",
            "source": "PIB Health India",
            "published": "2025-11-20",
            "image": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
        },
        {
            "title": "Breakthrough in affordable CAR-T cell immunotherapy",
            "summary": "Indian researchers and clinicians develop indigenous cancer immunotherapy with high accessibility...",
            "link": "https://thehindu.com/sci-tech/health",
            "source": "The Hindu Health",
            "published": "2025-11-19",
            "image": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80",
        },
        {
            "title": "ICMR releases updated hypertension lifestyle guidelines",
            "summary": "Target blood pressure standards updated to encourage early salt reduction, walking, and stress management...",
            "link": "https://icmr.gov.in",
            "source": "ICMR Guidelines",
            "published": "2025-11-18",
            "image": "https://images.unsplash.com/photo-1559757148-5c350d575016?w=800&q=80",
        },
    ],
    "us": [
        {
            "title": "CDC updates seasonal respiratory virus guidelines",
            "summary": "Centers for Disease Control advises updated vaccination for influenza and RSV ahead of winter peak...",
            "link": "https://www.cdc.gov",
            "source": "CDC Advisories",
            "published": "2025-11-20",
            "image": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&q=80",
        },
        {
            "title": "FDA approves breakthrough GLP-1 therapy for heart health",
            "summary": "Clinical trials demonstrate significant cardiovascular risk reduction in adults with pre-existing conditions...",
            "link": "https://www.fda.gov",
            "source": "FDA Announcements",
            "published": "2025-11-19",
            "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
        },
        {
            "title": "American Heart Association releases blood pressure report",
            "summary": "New epidemiological data shows benefits of 150 minutes of weekly moderate exercise in lowering stroke risks...",
            "link": "https://www.heart.org",
            "source": "AHA Journals",
            "published": "2025-11-17",
            "image": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
        },
    ],
    "gb": [
        {
            "title": "NHS rolls out AI-assisted early diagnostic scans across trusts",
            "summary": "National Health Service expands machine vision tools to detect early stage lung and cardiac conditions...",
            "link": "https://www.england.nhs.uk",
            "source": "NHS England",
            "published": "2025-11-20",
            "image": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80",
        },
        {
            "title": "NICE recommends continuous glucose monitoring for type 2 diabetes",
            "summary": "Guidance updated to expand CGM sensor access for patients with recurrent hypoglycemic episodes...",
            "link": "https://www.nice.org.uk",
            "source": "NICE UK",
            "published": "2025-11-18",
            "image": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
        },
    ],
    "global": [
        {
            "title": "WHO releases global alert on antimicrobial resistance awareness",
            "summary": "World Health Organization urges prudent antibiotic stewardship to preserve critical frontline medicines...",
            "link": "https://www.who.int",
            "source": "WHO Geneva",
            "published": "2025-11-20",
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
        },
        {
            "title": "Global Coalition expands maternal health ultrasound access",
            "summary": "Portable point-of-care ultrasound devices deployed to underserved rural clinics across multiple continents...",
            "link": "https://www.unicef.org",
            "source": "UNICEF Health",
            "published": "2025-11-19",
            "image": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
        },
    ],
}


def get_fallback_news(country: str = "in", max_items: int = 10):
    c = (country or "in").lower()
    items = FALLBACK_NEWS.get(c) or FALLBACK_NEWS.get("global") or FALLBACK_NEWS["in"]
    return items[:max_items]


def fetch_latest_medical_news(lang: str = "en", country: str = "in", max_items: int = 10):
    """Fetch health news from NewsAPI.org or NewsData.io dynamically by country, or return location-based fallback."""
    country_code = (country or "in").lower().strip()
    is_global = country_code in ("global", "all", "world", "")

    # 1. Try NewsAPI.org if NEWS_API_KEY is configured
    news_api_key = getattr(Config, "NEWS_API_KEY", None)
    if news_api_key:
        try:
            if is_global:
                url = "https://newsapi.org/v2/top-headlines"
                params = {
                    "apiKey": news_api_key,
                    "category": "health",
                    "language": lang if lang in ("en",) else "en",
                    "pageSize": max_items,
                }
            else:
                url = "https://newsapi.org/v2/top-headlines"
                params = {
                    "apiKey": news_api_key,
                    "category": "health",
                    "country": country_code,
                    "pageSize": max_items,
                }
            res = requests.get(url, params=params, timeout=8)
            if res.status_code == 200:
                data = res.json()
                articles = data.get("articles", [])
                results = []
                for item in articles:
                    results.append(
                        {
                            "title": item.get("title") or "Health Update",
                            "summary": (
                                item.get("description")
                                or item.get("content")
                                or "Latest health and disease research update..."
                            )[:220]
                            + "...",
                            "link": item.get("url", "#"),
                            "source": (item.get("source") or {}).get("name", "Medical News"),
                            "published": (item.get("publishedAt") or "")[:10],
                            "image": item.get("urlToImage")
                            or "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
                        }
                    )
                if results:
                    return results[:max_items]
        except Exception as e:
            print(f"[news] NewsAPI request failed: {e}")

    # 2. Try NewsData.io if NEWS_DATA_API_KEY is configured
    news_data_key = getattr(Config, "NEWS_DATA_API_KEY", None)
    if news_data_key:
        url = "https://newsdata.io/api/1/latest"
        params = {
            "apikey": news_data_key,
            "q": "health OR medical OR diabetes OR cancer OR covid OR hypertension",
            "category": "health",
            "size": 10,
        }
        if not is_global:
            params["country"] = country_code

        try:
            response = requests.get(url, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()

            if data.get("status") in ("success", "ok"):
                results = []
                for item in data.get("results", []):
                    results.append(
                        {
                            "title": item.get("title", "Health Update"),
                            "summary": (
                                item.get("description")
                                or item.get("content")
                                or "Latest health research and wellness report..."
                            )[:220]
                            + "...",
                            "link": item.get("link", "#"),
                            "source": item.get("source_id") or "Health Advisory",
                            "published": (item.get("pubDate") or "")[:10],
                            "image": item.get("image_url")
                            or "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
                        }
                    )
                if results:
                    return results[:max_items]
        except Exception as e:
            print(f"[news] NewsData request failed: {e}. Serving location fallback.")

    # 3. Fallback to country-specific curated news with images
    return get_fallback_news(country_code, max_items)
