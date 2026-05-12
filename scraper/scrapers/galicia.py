import logging
import re

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper, Discount

logger = logging.getLogger(__name__)

MODEL_URL = 'https://www.galicia.ar/personas/promociones.model.json'
PAGE_URL = 'https://www.galicia.ar/personas/promociones'

HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'referer': PAGE_URL,
    'accept': 'application/json',
}

INFER_MAP = {
    'super': 'supermercado',
    'jumbo': 'supermercado',
    'coto': 'supermercado',
    'farmac': 'farmacia',
    'combust': 'combustible',
    'ypf': 'combustible',
    'shell': 'combustible',
    'ropa': 'indumentaria',
    'indument': 'indumentaria',
    'viaje': 'viajes',
    'hotel': 'viajes',
    'turismo': 'viajes',
    'electro': 'electronica',
    'gastro': 'gastronomia',
    'restaurant': 'gastronomia',
    'caf': 'gastronomia',
    'entrete': 'entretenimiento',
    'espect': 'entretenimiento',
}


def infer_category(text: str) -> str:
    t = text.lower()
    for kw, cat in INFER_MAP.items():
        if kw in t:
            return cat
    return 'otros'


EYEBROW_CATEGORY = {
    'gastronomí': 'gastronomia',
    'gastronom': 'gastronomia',
    'supermercado': 'supermercado',
    'indumentaria': 'indumentaria',
    'farmacia': 'farmacia',
    'combustible': 'combustible',
    'viaje': 'viajes',
    'turismo': 'viajes',
    'electro': 'electronica',
    'espectáculo': 'entretenimiento',
    'espectaculo': 'entretenimiento',
    'hogar': 'otros',
    'vehículo': 'otros',
    'vehiculo': 'otros',
}


def category_from_eyebrow(eyebrow: str) -> str:
    low = eyebrow.lower().replace('﻿', '').replace('​', '')
    for kw, cat in EYEBROW_CATEGORY.items():
        if kw in low:
            return cat
    return 'otros'


def parse_pct(html: str) -> int | None:
    text = BeautifulSoup(html, 'html.parser').get_text()
    matches = re.findall(r'(\d+)%', text)
    if matches:
        try:
            return int(matches[0])
        except ValueError:
            pass
    return None


def walk(obj, comp_suffix, results):
    if isinstance(obj, dict):
        if obj.get(':type', '').endswith(comp_suffix):
            results.append(obj)
            return
        for v in obj.values():
            walk(v, comp_suffix, results)
    elif isinstance(obj, list):
        for item in obj:
            walk(item, comp_suffix, results)


class GaliciaScraper(BaseScraper):
    bank_slug = 'galicia'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        discounts: list[Discount] = []
        try:
            resp = requests.get(MODEL_URL, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            vsm_nodes: list[dict] = []
            walk(data, 'verticalsecondarymodule', vsm_nodes)

            for node in vsm_nodes:
                mod = node.get('verticalSecondaryModule', {})
                eyebrow = (mod.get('eyebrow') or '').strip()
                if 'PROMO' not in eyebrow.upper():
                    continue

                title = (mod.get('title') or '').strip()
                if not title:
                    continue

                desc_html = mod.get('description', '') or ''
                pct = parse_pct(desc_html)
                desc_text = BeautifulSoup(desc_html, 'html.parser').get_text(' ').strip() or None

                discounts.append(Discount(
                    title=title,
                    bank_slug=self.bank_slug,
                    source_url=PAGE_URL,
                    description=desc_text,
                    percentage=pct,
                    category=category_from_eyebrow(eyebrow),
                ))

        except Exception as e:
            logger.error(f'Galicia scraper failed: {e}')

        return discounts
