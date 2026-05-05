"""
Debug inspector para scrapers. Corre un scraper en modo headful, guarda HTML y screenshot.
Uso: python debug_inspect.py <bank_slug> [--headless]

Ejemplo: python debug_inspect.py galicia
"""
import argparse
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BANK_URLS = {
    'galicia':    'https://www.galicia.ar/personas/beneficios',
    'santander':  'https://www.santander.com.ar/banco/online/beneficios',
    'bbva':       'https://www.bbva.com.ar/personas/descuentos-y-beneficios.html',
    'macro':      'https://www.macro.com.ar/beneficios',
    'naranja-x':  'https://www.naranjax.com/beneficios',
    'modo':       'https://www.modo.com.ar/beneficios',
}

UA = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/120.0.0.0 Safari/537.36'
)


def inspect(bank_slug: str, headless: bool = False):
    url = BANK_URLS.get(bank_slug)
    if not url:
        print(f'Bank slug desconocido: {bank_slug}')
        print(f'Disponibles: {", ".join(BANK_URLS)}')
        sys.exit(1)

    out_dir = Path('debug_output') / bank_slug
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'Inspeccionando {bank_slug} → {url}')
    print(f'Headless: {headless}')
    print(f'Output: {out_dir}/')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(user_agent=UA)
        page = context.new_page()

        # Capturar requests de red (buscar APIs internas)
        api_calls = []
        page.on('response', lambda r: api_calls.append(r.url) if 'json' in r.headers.get('content-type', '') else None)

        page.goto(url, wait_until='networkidle', timeout=30000)
        time.sleep(3)

        # Screenshot
        screenshot_path = str(out_dir / 'screenshot.png')
        page.screenshot(path=screenshot_path, full_page=True)
        print(f'Screenshot guardado: {screenshot_path}')

        # HTML completo
        html = page.content()
        html_path = out_dir / 'page.html'
        html_path.write_text(html, encoding='utf-8')
        print(f'HTML guardado: {html_path} ({len(html):,} bytes)')

        # Texto visible
        text = page.inner_text('body')
        text_path = out_dir / 'text.txt'
        text_path.write_text(text, encoding='utf-8')
        print(f'Texto guardado: {text_path}')

        # Imprimir primeras 3000 chars del texto visible
        print('\n--- TEXTO VISIBLE (primeros 3000 chars) ---')
        print(text[:3000])

        # APIs JSON detectadas
        if api_calls:
            print('\n--- API CALLS JSON DETECTADAS ---')
            for call in api_calls[:20]:
                print(f'  {call}')

        # Intentar detectar estructura de cards
        print('\n--- POSIBLES SELECTORES ---')
        for selector in ['article', '[class*="card"]', '[class*="benefit"]', '[class*="promo"]',
                         '[class*="descuento"]', 'li', '.item', '[data-testid]']:
            count = len(page.query_selector_all(selector))
            if count > 0:
                print(f'  {selector}: {count} elementos')

        browser.close()

    print('\nInspección completa.')
    print(f'Abrí {out_dir}/screenshot.png para ver la página.')
    print(f'Revisá {out_dir}/page.html para inspeccionar el DOM.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('bank_slug', help='Slug del banco a inspeccionar')
    parser.add_argument('--headless', action='store_true', help='Modo headless (sin ventana)')
    args = parser.parse_args()
    inspect(args.bank_slug, headless=args.headless)
