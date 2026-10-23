import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load .env from backend or root directory
load_dotenv(BASE_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "SankatSetu AI — Turning Human Intent into Verified Action"
    VERSION: str = "1.0.0"
    
    # Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    
    # Database
    DATABASE_PATH: Path = BASE_DIR / os.getenv("DATABASE_PATH", "sanketsetu.db")
    
    # Uploads
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_MIMES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    
    # Server & CORS
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
        if origin.strip()
    ]
    
    @property
    def is_gemini_active(self) -> bool:
        return bool(self.GEMINI_API_KEY)

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
