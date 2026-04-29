import logging
import random
import time

from playwright.sync_api import sync_playwright

from .base import BaseScraper, Discount

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    'supermercado': 'supermercado',
    'super': 'supermercado',
    'gastronomia': 'gastronomia',
    'restaurant': 'gastronomia',
    'farmacia': 'farmacia',
    'combustible': 'combustible',
    'ropa': 'indumentaria',
    'indumentaria': 'indumentaria',
    'viaje': 'viajes',
    'turismo': 'viajes',
    'electro': 'electronica',
}


def infer_category(text: str) -> str:
    text_lower = text.lower()
    for keyword, category in CATEGORY_MAP.items():
        if keyword in text_lower:
            return category
    return 'otros'


class GaliciaScraper(BaseScraper):
    bank_slug = 'galicia'
    bank_url = 'https://www.galicia.ar/personas/beneficios'

    def run(self) -> list[Discount]:
        discounts: list[Discount] = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                        'AppleWebKit/537.36 (KHTML, like Gecko) '
                        'Chrome/120.0.0.0 Safari/537.36'
                    )
                )
                page = context.new_page()
                page.goto(self.bank_url, wait_until='networkidle', timeout=30000)
                time.sleep(random.uniform(1.5, 3))

                # Wait for benefit cards to load
                try:
                    page.wait_for_selector('[class*="benefit"], [class*="promo"], article', timeout=10000)
                except Exception:
                    logger.warning('Galicia: selector not found, trying generic')

                items = page.query_selector_all('[class*="benefit-card"], [class*="promo-card"], .card-beneficio')

                for item in items:
                    try:
                        title_el = item.query_selector('h2, h3, [class*="title"], [class*="nombre"]')
                        pct_el = item.query_selector('[class*="descuento"], [class*="percent"], [class*="porcentaje"]')

                        if not title_el:
                            continue

                        title = title_el.inner_text().strip()
                        if not title:
                            continue

                        pct: int | None = None
                        if pct_el:
                            pct_text = pct_el.inner_text().strip().replace('%', '')
                            try:
                                pct = int(pct_text)
                            except ValueError:
                                pass

                        link_el = item.query_selector('a')
                        source = self.bank_url
                        if link_el:
                            href = link_el.get_attribute('href') or ''
                            source = href if href.startswith('http') else f'https://www.galicia.ar{href}'

                        discounts.append(
                            Discount(
                                title=title,
                                bank_slug=self.bank_slug,
                                source_url=source,
                                percentage=pct,
                                category=infer_category(title),
                            )
                        )
                    except Exception as e:
                        logger.warning(f'Galicia: error parsing item: {e}')

                browser.close()
        except Exception as e:
            logger.error(f'Galicia scraper failed: {e}')

        return discounts
