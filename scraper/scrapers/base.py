import hashlib
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Discount:
    title: str
    bank_slug: str
    source_url: str
    description: Optional[str] = None
    percentage: Optional[int] = None
    max_reintegro: Optional[float] = None
    category: Optional[str] = None
    days_of_week: Optional[list[int]] = None
    valid_from: Optional[str] = None  # YYYY-MM-DD
    valid_to: Optional[str] = None    # YYYY-MM-DD
    terms: Optional[str] = None
    card_names: list[str] = field(default_factory=list)

    def scrape_hash(self) -> str:
        raw = f"{self.bank_slug}|{self.title}|{self.valid_from}|{self.valid_to}"
        return hashlib.md5(raw.encode()).hexdigest()


class BaseScraper:
    bank_slug: str
    bank_url: str

    def run(self) -> list[Discount]:
        raise NotImplementedError
