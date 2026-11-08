import os
import requests
from typing import List, Dict, Any, Optional

PLACES_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"

def search_businesses_google_places(
    query: str,
    api_key: Optional[str] = None,
    min_reviews: int = 50,
    min_rating: float = 4.0,
    page_size: int = 20
) -> List[Dict[str, Any]]:
    """
    Genuine Google Places API (New) integration.
    Discovers authentic businesses, filters by review threshold, and captures Place ID for deduplication.
    """
    key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        raise ValueError("Google Places API Key is missing. Connect the Google Places connector in the dashboard.")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.businessStatus"
    }

    payload = {
        "textQuery": query,
        "pageSize": min(page_size, 20),
        "minRating": min_rating
    }

    response = requests.post(PLACES_SEARCH_ENDPOINT, headers=headers, json=payload, timeout=20)
    if not response.ok:
        raise RuntimeError(f"Google Places API responded with {response.status_code}: {response.text}")

    data = response.json()
    places = data.get("places", [])
    qualified_leads = []

    for p in places:
        # Check active status
        if p.get("businessStatus") and p.get("businessStatus") != "OPERATIONAL":
            continue

        review_count = p.get("userRatingCount", 0)
        if review_count < min_reviews:
            continue

        name = p.get("displayName", {}).get("text", "")
        lead = {
            "place_id": p.get("id"),
            "business_name": name,
            "address": p.get("formattedAddress", ""),
            "rating": p.get("rating", 0.0),
            "review_count": review_count,
            "phone": p.get("nationalPhoneNumber", ""),
            "website": p.get("websiteUri", ""),
            "has_website": bool(p.get("websiteUri")),
            "discovery_source": "google_places_new",
            "qualification_status": "needs_research"
        }
        qualified_leads.append(lead)

    return qualified_leads
