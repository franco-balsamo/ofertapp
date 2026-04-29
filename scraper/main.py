"""
Scraper runner. Deploy en Railway con cron: 0 */4 * * * (cada 4h).
Env vars requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import logging
import os
from datetime import datetime

from supabase import create_client

from scrapers import GaliciaScraper, SantanderScraper, BbvaScraper, MacroScraper, NaranjaXScraper, ModoScraper
from scrapers.base import Discount

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_ROLE_KEY'],
)

SCRAPERS = [
    GaliciaScraper(),
    SantanderScraper(),
    BbvaScraper(),
    MacroScraper(),
    NaranjaXScraper(),
    ModoScraper(),
]


def upsert_discount(discount: Discount, bank_id_map: dict[str, str], card_id_map: dict[str, list[str]]) -> bool:
    """Upsert a discount. Returns True if newly inserted."""
    row = {
        'title': discount.title,
        'description': discount.description,
        'percentage': discount.percentage,
        'max_reintegro': discount.max_reintegro,
        'category': discount.category,
        'days_of_week': discount.days_of_week,
        'valid_from': discount.valid_from,
        'valid_to': discount.valid_to,
        'terms': discount.terms,
        'source_url': discount.source_url,
        'scrape_hash': discount.scrape_hash(),
    }

    result = supabase.table('discounts').upsert(row, on_conflict='scrape_hash').execute()
    if not result.data:
        return False

    discount_id = result.data[0]['id']

    # Link to bank
    bank_id = bank_id_map.get(discount.bank_slug)
    if bank_id:
        supabase.table('discount_banks').upsert(
            {'discount_id': discount_id, 'bank_id': bank_id},
            on_conflict='discount_id,bank_id'
        ).execute()

    # Link to cards if specified
    card_ids = card_id_map.get(discount.bank_slug, [])
    for card_id in card_ids:
        supabase.table('discount_cards').upsert(
            {'discount_id': discount_id, 'card_id': card_id},
            on_conflict='discount_id,card_id'
        ).execute()

    return True


def load_bank_and_card_maps() -> tuple[dict[str, str], dict[str, list[str]]]:
    banks = supabase.table('banks').select('id, slug').execute().data or []
    bank_id_map = {b['slug']: b['id'] for b in banks}

    cards = supabase.table('cards').select('id, bank_id').execute().data or []
    bank_to_cards: dict[str, list[str]] = {}
    for c in cards:
        slug = next((s for s, bid in bank_id_map.items() if bid == c['bank_id']), None)
        if slug:
            bank_to_cards.setdefault(slug, []).append(c['id'])

    return bank_id_map, bank_to_cards


def main():
    logger.info('Scraper run started at %s', datetime.utcnow().isoformat())
    bank_id_map, card_id_map = load_bank_and_card_maps()

    for scraper in SCRAPERS:
        logger.info('Running scraper: %s', scraper.bank_slug)
        discounts_found = 0
        error_msg = None
        status = 'success'

        try:
            discounts = scraper.run()
            for d in discounts:
                upsert_discount(d, bank_id_map, card_id_map)
            discounts_found = len(discounts)
            logger.info('%s: %d discounts found', scraper.bank_slug, discounts_found)
        except Exception as e:
            status = 'error'
            error_msg = str(e)
            logger.error('%s: failed — %s', scraper.bank_slug, e)

        supabase.table('scraper_runs').insert({
            'bank_slug': scraper.bank_slug,
            'status': status,
            'discounts_found': discounts_found,
            'error_msg': error_msg,
        }).execute()

    logger.info('Scraper run complete')


if __name__ == '__main__':
    main()
