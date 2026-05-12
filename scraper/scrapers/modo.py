import logging
import re

import requests

from .base import BaseScraper, Discount

logger = logging.getLogger(__name__)

PAGE_URL = 'https://www.modo.com.ar/promos'

SLOTS = [
    'web-modo-hub-destacadas',
    'web-modo-hub-supermercados',
    'web-modo-hub-exclusivas-online',
]

HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'referer': PAGE_URL,
    'accept': 'application/json',
}

CATEGORY_MAP = {
    'super': 'supermercado',
    'jumbo': 'supermercado',
    'coto': 'supermercado',
    'disco': 'supermercado',
    'chango': 'supermercado',
    'makro': 'supermercado',
    'anónim': 'supermercado',
    'anonima': 'supermercado',
    'vea': 'supermercado',
    'toledo': 'supermercado',
    'aiello': 'supermercado',
    'altué': 'supermercado',
    'farmac': 'farmacia',
    'farmacia': 'farmacia',
    'ypf': 'combustible',
    'shell': 'combustible',
    'combust': 'combustible',
    'combus': 'combustible',
    'ropa': 'indumentaria',
    'indument': 'indumentaria',
    'nike': 'indumentaria',
    'adidas': 'indumentaria',
    'viaje': 'viajes',
    'hotel': 'viajes',
    'turismo': 'viajes',
    'electro': 'electronica',
    'cine': 'entretenimiento',
    'teatro': 'entretenimiento',
    'gastrono': 'gastronomia',
    'restaurant': 'gastronomia',
    'freddo': 'gastronomia',
    'starbucks': 'gastronomia',
}


def infer_category(text: str) -> str:
    t = text.lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in t:
            return cat
    return 'otros'


class ModoScraper(BaseScraper):
    bank_slug = 'modo'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        discounts: list[Discount] = []
        seen: set[str] = set()

        for slot in SLOTS:
            try:
                url = (
                    f'https://www.modo.com.ar/promos/api/rewards/slots'
                    f'?slots={slot}&limit=9&page=1&source=web_modo&banks='
                    f'&fcalcstatus=running%2Cfinished_for_product%2Cnext_for_product'
                    f'&slot_info=true&origin=web_modo&categories='
                )
                resp = requests.get(url, headers=HEADERS, timeout=15)
                resp.raise_for_status()
                cards = resp.json().get('data', {}).get('cards', [])

                for card in cards:
                    rows = card.get('content', {}).get('row', [])
                    texts = [r.get('text', '') for r in rows if r.get('text', '').strip()]
                    if not texts:
                        continue

                    title = texts[0].strip()
                    if not title or title in seen:
                        continue
                    seen.add(title)

                    desc = texts[1].strip() if len(texts) > 1 else None

                    pct: int | None = None
                    if desc:
                        m = re.search(r'(\d+)%', desc)
                        if m:
                            try:
                                pct = int(m.group(1))
                            except ValueError:
                                pass

                    discounts.append(Discount(
                        title=title,
                        bank_slug=self.bank_slug,
                        source_url=PAGE_URL,
                        description=desc,
                        percentage=pct,
                        category=infer_category(f'{title} {desc or ""}'),
                    ))

            except Exception as e:
                logger.warning(f'Modo slot {slot} failed: {e}')

        return discounts
