import logging

from .base import BaseScraper, Discount
from .galicia import infer_category

logger = logging.getLogger(__name__)

PAGE_URL = 'https://www.naranjax.com/beneficios'


class NaranjaXScraper(BaseScraper):
    bank_slug = 'naranja-x'
    bank_url = PAGE_URL

    def run(self) -> list[Discount]:
        # NaranjaX protegido con Cloudflare — retorna 403 a requests y bots.
        # Pendiente: usar Playwright con stealth o headful en Railway.
        logger.warning('NaranjaX: bloqueado por Cloudflare, omitiendo')
        return []
