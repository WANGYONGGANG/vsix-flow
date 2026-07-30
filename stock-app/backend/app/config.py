from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PORT: int = 8000
    CORS_ORIGINS: str = "*"
    CACHE_TTL_SECONDS: int = 300
    NEWS_API_BASE: str = "https://np-listapi.eastmoney.com"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
