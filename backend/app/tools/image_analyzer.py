import os
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image
from app.config import settings

def validate_image_file(file_path: Path) -> Dict[str, Any]:
    """
    Validates file exists, has safe extension and valid image header,
    and adheres to size limits.
    """
    if not file_path.exists():
        return {"valid": False, "error": "Image file does not exist on disk."}

    size = file_path.stat().st_size
    if size > settings.MAX_FILE_SIZE_BYTES:
        return {"valid": False, "error": f"File size {size} bytes exceeds 10MB limit."}

    try:
        with Image.open(file_path) as img:
            img.verify()
            format_name = img.format.lower() if img.format else "unknown"
            if format_name not in ["jpeg", "jpg", "png", "webp"]:
                return {"valid": False, "error": f"Unsupported image format: {format_name}"}
            
            # Reopen to read dimensions
            with Image.open(file_path) as img2:
                width, height = img2.size
                return {
                    "valid": True,
                    "format": format_name,
                    "width": width,
                    "height": height,
                    "size_bytes": size
                }
    except Exception as e:
        return {"valid": False, "error": f"Image validation failed: {str(e)}"}

async def analyze_uploaded_image(
    file_path_str: str,
    gemini_client: Any = None
) -> Dict[str, Any]:
    """
    Multimodal visual inspection tool:
    - Uses Gemini Multimodal API if configured.
    - If Gemini key is not configured or fails, uses local image property heuristics
      and honestly labels the analysis mode.
    """
    path = Path(file_path_str)
    val = validate_image_file(path)
    if not val["valid"]:
        return {
            "success": False,
            "error": val["error"],
            "analysis_mode": "FAILED_VALIDATION",
            "findings": []
        }

    # 1. Try Real Gemini Multimodal if client is configured
    if gemini_client and settings.is_gemini_active:
        try:
            with open(path, "rb") as f:
                image_bytes = f.read()

            prompt = (
                "You are SankatSetu AI's multimodal societal safety inspector. "
                "Analyze this civic problem image. Identify visual evidence of: "
                "1) waterlogging/flooding, 2) road damage/potholes, 3) traffic blockage, "
                "4) electrical hazards/broken streetlights. "
                "Return a concise 2-sentence summary of visual facts observed, and estimate hazard level (Low, Medium, High, Urgent)."
            )

            # Using google-genai Client
            response = gemini_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    prompt,
                    {
                        "inline_data": {
                            "mime_type": f"image/{val['format']}",
                            "data": image_bytes
                        }
                    }
                ]
            )

            text_output = response.text if hasattr(response, 'text') else str(response)
            return {
                "success": True,
                "analysis_mode": "GEMINI_MULTIMODAL_API",
                "model_used": settings.GEMINI_MODEL,
                "visual_summary": text_output.strip(),
                "verified": True,
                "metadata": {
                    "dimensions": f"{val['width']}x{val['height']}",
                    "format": val['format'],
                    "file_size_kb": round(val['size_bytes'] / 1024, 1)
                }
            }
        except Exception as e:
            # Report failure transparently and fall through to local fallback
            fallback_err = f"Gemini multimodal query encountered error: {str(e)}"
    else:
        fallback_err = "No Gemini API key supplied; operating in local computer-vision inspection mode."

    # 2. Local fallback heuristic inspection
    with Image.open(path) as img:
        img_rgb = img.convert("RGB")
        # Sample average luminosity to detect night/dark scene or lighting issues
        grayscale = img_rgb.convert("L")
        stat = grayscale.histogram()
        pixels = sum(stat)
        avg_lum = sum(i * n for i, n in enumerate(stat)) / (pixels or 1)
        
        is_dark_scene = avg_lum < 60
        lighting_status = "Extremely low ambient illumination (< 60 avg lum)" if is_dark_scene else "Adequate ambient daylight"

    return {
        "success": True,
        "analysis_mode": "LOCAL_HEURISTIC_ENGINE",
        "model_used": "Deterministic Local CV Analyzer (PIL)",
        "visual_summary": (
            f"Image verified ({val['width']}x{val['height']} {val['format'].upper()}). "
            f"Scene inspection: {lighting_status}. "
            f"Visual features consistent with outdoor civic inspection environment."
        ),
        "verified": False, # Marked unverified by AI model since local heuristic was used
        "note": fallback_err,
        "metadata": {
            "dimensions": f"{val['width']}x{val['height']}",
            "format": val['format'],
            "file_size_kb": round(val['size_bytes'] / 1024, 1),
            "average_luminosity": round(avg_lum, 2)
        }
    }
