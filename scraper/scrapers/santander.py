import logging
import random
import time

from playwright.sync_api import sync_playwright

from .base import BaseScraper, Discount
from .galicia import infer_category

logger = logging.getLogger(__name__)


class SantanderScraper(BaseScraper):
    bank_slug = 'santander'
    bank_url = 'https://www.santander.com.ar/banco/online/personas/beneficios-y-descuentos'

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

                try:
                    page.wait_for_selector('[class*="benefit"], [class*="promo"], [class*="descuento"], article', timeout=10000)
                except Exception:
                    logger.warning('Santander: selector not found, trying generic')

                selectors = [
                    '[class*="benefit-card"]',
                    '[class*="promo-card"]',
                    '[class*="descuento-card"]',
                    '[class*="oferta"]',
                    'article[class*="card"]',
                    '.card',
                ]
                items = []
                for sel in selectors:
                    items = page.query_selector_all(sel)
                    if items:
                        break

                for item in items:
                    try:
                        title_el = item.query_selector('h2, h3, h4, [class*="title"], [class*="titulo"], [class*="nombre"]')
                        pct_el = item.query_selector('[class*="descuento"], [class*="percent"], [class*="porcentaje"], [class*="discount"]')

                        if not title_el:
                            continue

                        title = title_el.inner_text().strip()
                        if not title:
                            continue

                        pct: int | None = None
                        if pct_el:
                            pct_text = pct_el.inner_text().strip().replace('%', '').strip()
                            try:
                                pct = int(pct_text)
                            except ValueError:
                                pass

                        link_el = item.query_selector('a')
                        source = self.bank_url
                        if link_el:
                            href = link_el.get_attribute('href') or ''
                            source = href if href.startswith('http') else f'https://www.santander.com.ar{href}'

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
                        logger.warning(f'Santander: error parsing item: {e}')

                browser.close()
        except Exception as e:
            logger.error(f'Santander scraper failed: {e}')

        return discounts
