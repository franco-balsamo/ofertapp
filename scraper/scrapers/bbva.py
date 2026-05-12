import logging
import re

import requests

from .base import BaseScraper, Discount

logger = logging.getLogger(__name__)

API_URL = 'https://go.bbva.com.ar/willgo/fgo/API/v3/communications?destacado=true&pager=0'
PAGE_URL = 'https://www.bbva.com.ar/beneficios/'

CATEGORY_MAP = {
    'super': 'supermercado',
    'jumbo': 'supermercado',
    'coto': 'supermercado',
    'disco': 'supermercado',
    'farmac': 'farmacia',
    'combust': 'combustible',
    'ypf': 'combustible',
    'shell': 'combustible',
    'ropa': 'indumentaria',
    'indument': 'indumentaria',
    'moda': 'indumentaria',
    'viaje': 'viajes',
    'hotel': 'viajes',
    'turismo': 'viajes',
    'electro': 'electronica',
    'tecnolog': 'electronica',
    'gastro': 'gastronomia',
    'restaurant': 'gastronomia',
    'helader': 'gastronomia',
    'caf': 'gastronomia',
    'bonvivir': 'gastronomia',
    'beauty': 'otros',
    'belleza': 'otros',
}


def infer_category(text: str) -> str:
    t = text.lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in t:
            return cat
    return 'otros'


class BbvaScraper(BaseScraper):
    bank_slug = 'bbva'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        discounts: list[Discount] = []
        try:
            resp = requests.get(API_URL, timeout=15)
            resp.raise_for_status()
            data = resp.json().get('data', [])

            for item in data:
                title = item.get('cabecera', '').strip()
                if not title:
                    continue

                subcab = item.get('subcabecera', '') or ''
                pct: int | None = None
                pct_matches = re.findall(r'(\d+)%', subcab)
                if pct_matches:
                    try:
                        pct = int(pct_matches[0])
                    except ValueError:
                        pass

                discounts.append(Discount(
                    title=title,
                    bank_slug=self.bank_slug,
                    source_url=PAGE_URL,
                    description=subcab,
                    percentage=pct,
                    category=infer_category(f'{title} {subcab}'),
                    valid_from=item.get('fechaDesde'),
                    valid_to=item.get('fechaHasta'),
                ))

        except Exception as e:
            logger.error(f'BBVA scraper failed: {e}')

        return discounts
