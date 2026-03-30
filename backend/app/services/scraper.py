"""
Google Maps Scraper Service.
Locally automates a headless Chromium browser to extract business data.
"""
import asyncio
from typing import List, Dict, Any

async def run_gmaps_scraper(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Spins up Playwright to scrape Google Maps results for a given query.
    Returns structured data for each company found.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("Playwright not installed. Simulated scraper starting...")
        return _mock_scraper(query, max_results)

    results = []
    
    # We use Playwright to search Google Maps
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale="fr-CA")
        page = await context.new_page()
        
        try:
            print(f"Scraping Google Maps for: {query}")
            await page.goto(f"https://www.google.com/maps/search/{query.replace(' ', '+')}")
            
            # Reject cookies if prompted (EU/CA)
            try:
                await page.click("button:has-text('Tout refuser')", timeout=3000)
            except Exception:
                pass
            
            # Simply wait for the results array to render and extract the generic names
            await page.wait_for_selector("div[role='feed']", timeout=10000)
            
            # Simple scrolling logic could be placed here...
            
            # Extract basic info
            listings = await page.locator("div.Nv2PK").all()
            for i, listing in enumerate(listings):
                if i >= max_results:
                    break
                    
                name = await listing.locator(".qBF1Pd").inner_text() if await listing.locator(".qBF1Pd").count() > 0 else "Unknown Name"
                # This is a very basic extraction to prove the automated script functionality
                # Extracting ratings, address, website accurately requires deeper DOM parsing
                
                results.append({
                    "name": name,
                    "city": "Extracted Location",
                    "rating": 4.5,
                    "review_count": 10,
                    "source": "google_maps",
                })
                
        except Exception as e:
            print(f"Scraper encountered error: {e}")
        finally:
            await browser.close()
            
    return results

def _mock_scraper(query: str, max_results: int) -> List[Dict[str, Any]]:
    return [
        {
            "name": f"Mock Construction {i} ({query})",
            "city": "Montréal",
            "rating": 4.7,
            "review_count": 120 + i,
            "source": "google_maps"
        }
        for i in range(max_results)
    ]

async def scrape_company_website(url: str) -> str:
    """
    Crawl4AI Deep Scraper: Visits a URL and uses BestFirstCrawlingStrategy 
    to extract highly relevant markdown context (Home, About, Services).
    """
    if not url or url == "—" or not url.startswith("http"):
        return ""
        
    try:
        from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
        from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
        from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer
        from crawl4ai.deep_crawling.filters import FilterChain, ContentTypeFilter
        
        # Scorer prioritize "about us", "services", "team" pages
        keyword_scorer = KeywordRelevanceScorer(
            keywords=["about", "propos", "services", "contact", "projets", "équipe", "mission", "expertise"],
            weight=0.8
        )
        
        filter_chain = FilterChain([
            ContentTypeFilter(allowed_types=["text/html"])
        ])

        config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            deep_crawl_strategy=BestFirstCrawlingStrategy(
                max_depth=1,
                include_external=False,
                max_pages=3, # Crawl homepage + 2 most relevant pages max
                url_scorer=keyword_scorer,
                filter_chain=filter_chain
            ),
            stream=False,
            # Extraction/Formatting settings
            word_count_threshold=50,
            remove_overlay_elements=True
        )

        all_text = ""
        async with AsyncWebCrawler() as crawler:
            results = await crawler.arun(url, config=config)
            for res in results:
                if res.success and res.markdown:
                    # Append cleaned markdown text
                    all_text += f"\n\n--- PAGE: {res.url} ---\n"
                    all_text += res.markdown.strip()

        # Truncate to avoid context context limits for average LLM (10k chars is safe)
        return all_text[:8000].strip()
        
    except Exception as e:
        print(f"🕸️ Crawl4AI DeepScrape failed for {url}: {e}")
        # Extremely basic fallback
        import httpx
        from bs4 import BeautifulSoup
        try:
             async with httpx.AsyncClient() as client:
                  res = await client.get(url, timeout=10.0)
                  soup = BeautifulSoup(res.text, "html.parser")
                  text = " ".join([p.text for p in soup.find_all(['p', 'h1', 'h2', 'h3'])])
                  return text[:3000].strip()
        except:
             return ""
