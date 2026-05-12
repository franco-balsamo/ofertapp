import logging

import requests

from .base import BaseScraper, Discount

logger = logging.getLogger(__name__)

API_URL = 'https://apipublic.macro.com.ar/v1/card-benefits/provinces/AR-C'
API_KEY = 'xoQHgmQk50pnZtGXLOxHowzjBEl4z0E7677knlgnD4iEL6sm'
PAGE_URL = 'https://www.macro.com.ar/beneficios'

SECTOR_MAP = {
    'Automotor y Combustible': 'combustible',
    'Gastronomia': 'gastronomia',
    'Indumentaria': 'indumentaria',
    'Supermercados': 'supermercado',
    'Farmacia': 'farmacia',
    'Electro y Tecnologia': 'electronica',
    'Entretenimiento': 'entretenimiento',
    'Turismo': 'viajes',
    'Hogar y Deco': 'otros',
    'Librerias': 'otros',
    'Jugueterias': 'otros',
    'Bicicleterias': 'otros',
}


class MacroScraper(BaseScraper):
    bank_slug = 'macro'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        discounts: list[Discount] = []
        try:
            resp = requests.get(
                API_URL,
                headers={
                    'apikey': API_KEY,
                    'accept': 'application/json',
                    'referer': 'https://www.macro.com.ar/',
                },
                timeout=15,
            )
            resp.raise_for_status()
            promos = resp.json().get('promotions', [])

            seen_names: set[str] = set()
            for item in promos:
                name = item.get('name', '').strip()
                if not name or name in seen_names:
                    continue
                seen_names.add(name)

                discount = item.get('discount')
                pct: int | None = None
                if discount is not None:
                    try:
                        pct = int(discount)
                    except (ValueError, TypeError):
                        pass

                sector = item.get('sector', '')
                category = SECTOR_MAP.get(sector, 'otros')

                discounts.append(Discount(
                    title=name,
                    bank_slug=self.bank_slug,
                    source_url=PAGE_URL,
                    percentage=pct,
                    category=category,
                ))

        except Exception as e:
            logger.error(f'Macro scraper failed: {e}')

        return discounts
