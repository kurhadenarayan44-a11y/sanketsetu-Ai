import httpx
from typing import Dict, Any, Optional

USER_AGENT = "SankatSetu-AI-Operations-Dashboard/1.0 (Hackathon societal benefit agent)"

async def resolve_location(
    location_query: str,
    user_coords: Optional[tuple[float, float]] = None
) -> Dict[str, Any]:
    """
    Resolves a location description to geographical coordinates using OpenStreetMap Nominatim.
    Does NOT invent coordinates.
    If the query is too vague (e.g. 'near college' without a name or city), it flags it honestly.
    """
    if user_coords and user_coords[0] and user_coords[1]:
        lat, lon = user_coords
        return {
            "resolved": True,
            "source": "USER_GPS",
            "display_name": f"User GPS Fix ({lat:.5f}, {lon:.5f})",
            "latitude": float(lat),
            "longitude": float(lon),
            "verified": True,
            "note": "Coordinates directly supplied by user browser geolocation."
        }

    cleaned = (location_query or "").strip()
    if not cleaned or len(cleaned) < 3:
        return {
            "resolved": False,
            "source": "NONE",
            "display_name": None,
            "latitude": None,
            "longitude": None,
            "verified": False,
            "note": "No valid location query provided."
        }

    # If it's a relative/vague phrase without city or proper noun
    lower = cleaned.lower()
    if lower in ["my college", "near my college", "my street", "outside", "here", "nearby"]:
        return {
            "resolved": False,
            "source": "NOMINATIM_OSM",
            "display_name": cleaned,
            "latitude": None,
            "longitude": None,
            "verified": False,
            "note": f"'{cleaned}' is relative and lacks a specific municipality, road, or college name."
        }

    # Query OpenStreetMap Nominatim
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": cleaned,
        "format": "json",
        "limit": 1,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": USER_AGENT
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                if results and len(results) > 0:
                    best = results[0]
                    return {
                        "resolved": True,
                        "source": "OPENSTREETMAP_NOMINATIM",
                        "display_name": best.get("display_name"),
                        "latitude": float(best.get("lat")),
                        "longitude": float(best.get("lon")),
                        "verified": True,
                        "osm_id": best.get("osm_id"),
                        "note": "Resolved through official OpenStreetMap Nominatim directory."
                    }
                else:
                    return {
                        "resolved": False,
                        "source": "OPENSTREETMAP_NOMINATIM",
                        "display_name": cleaned,
                        "latitude": None,
                        "longitude": None,
                        "verified": False,
                        "note": f"Location '{cleaned}' not indexed in OpenStreetMap database. Clarification required."
                    }
            else:
                return {
                    "resolved": False,
                    "source": "OPENSTREETMAP_NOMINATIM",
                    "display_name": cleaned,
                    "latitude": None,
                    "longitude": None,
                    "verified": False,
                    "note": f"OpenStreetMap service returned HTTP {response.status_code}."
                }
    except Exception as e:
        # Transparent error logging — DO NOT INVENT COORDINATES
        return {
            "resolved": False,
            "source": "OPENSTREETMAP_NOMINATIM",
            "display_name": cleaned,
            "latitude": None,
            "longitude": None,
            "verified": False,
            "note": f"Location lookup network call unavailable ({type(e).__name__}). Coordinates remained uninvented."
        }
