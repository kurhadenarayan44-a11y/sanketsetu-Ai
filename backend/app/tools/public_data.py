import httpx
from typing import Dict, Any, Optional

async def check_available_public_data(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    simulate_failure: bool = False
) -> Dict[str, Any]:
    """
    Queries real public data sources:
    - Real-time weather conditions via Open-Meteo API (free, open, no auth key required).
    - Checks live rainfall, wind speed, temperature, and precipitation flags.
    - If simulate_failure is True, triggers a controlled network timeout error to demonstrate
      agent error recovery and safety protocol activation.
    """
    if simulate_failure:
        # Controlled failure for Scenario 3
        raise RuntimeError("Municipal Telemetry Network Gateway Timeout (HTTP 504) - Sensor grid unreachable.")

    if not latitude or not longitude:
        return {
            "source": "OPEN_METEO_API",
            "available": False,
            "status": "UNAVAILABLE_NO_COORDINATES",
            "message": "Live meteorological data requires verified GPS coordinates. Data remains uninvented.",
            "weather": None
        }

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "relative_humidity_2m", "precipitation", "rain", "wind_speed_10m"],
        "timezone": "auto"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                rain_val = current.get("rain", 0.0)
                precip_val = current.get("precipitation", 0.0)
                temp = current.get("temperature_2m")
                wind = current.get("wind_speed_10m")
                
                is_raining = rain_val > 0.0 or precip_val > 0.0

                return {
                    "source": "OPEN_METEO_API",
                    "available": True,
                    "status": "VERIFIED_LIVE_DATA",
                    "coordinates": {"latitude": latitude, "longitude": longitude},
                    "weather": {
                        "temperature_c": temp,
                        "rain_mm": rain_val,
                        "precipitation_mm": precip_val,
                        "wind_speed_kmh": wind,
                        "is_actively_precipitating": is_raining,
                        "condition_summary": (
                            f"Active rainfall ({rain_val} mm), Temperature {temp}°C, Wind {wind} km/h"
                            if is_raining else
                            f"Clear/Overcast without precipitation ({temp}°C, Wind {wind} km/h)"
                        )
                    },
                    "note": "Verified live meteorological telemetry from Open-Meteo."
                }
            else:
                return {
                    "source": "OPEN_METEO_API",
                    "available": False,
                    "status": "API_ERROR",
                    "message": f"Open-Meteo returned status {response.status_code}. Live data not available.",
                    "weather": None
                }
    except Exception as e:
        return {
            "source": "OPEN_METEO_API",
            "available": False,
            "status": "NETWORK_UNAVAILABLE",
            "message": f"Could not reach meteorological telemetry: {type(e).__name__}. Data remains uninvented.",
            "weather": None
        }
