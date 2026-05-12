import logging
import re

import requests

from .base import BaseScraper, Discount
from .galicia import infer_category

logger = logging.getLogger(__name__)

PAGE_URL = 'https://www.santander.com.ar/personas/beneficios'

HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}


class SantanderScraper(BaseScraper):
    bank_slug = 'santander'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        # Santander usa micro-frontend cargado via JS que requiere auth de sesión.
        # Pendiente: reverse-engineer API del MF o usar sesión autenticada.
        logger.warning('Santander: scraper pendiente, omitiendo')
        return []
