import * as cheerio from 'cheerio';

export function findProductName($: cheerio.CheerioAPI): string {
  // Common selectors for product names
  const nameSelectors = [
    'h1',
    '[itemprop="name"]',
    '.product-name',
    '.product-title',
    '#product-title',
    '.product_title',
    'title'
  ];

  for (const selector of nameSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      if (text && text.length > 3) { // Ensure we have a meaningful name
        return text;
      }
    }
  }

  return '';
}

export type PriceInfo = {
  price: number;
  currency: 'EUR' | 'CZK';
  text: string;
};

export function findPrice($: cheerio.CheerioAPI): { price: number; currency: 'EUR' | 'CZK' } | null {
  // First try the main product price element
  const mainPriceElement = $('.cena[id^="variant_price"]');
  if (mainPriceElement.length) {
    const text = mainPriceElement.contents().first().text().trim();
    if (text) {
      const match = text.match(/(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč)/);
      if (match) {
        const priceText = match[1];
        const currency = text.includes('€') ? 'EUR' : 'CZK';
        const cleanPrice = priceText.replace(/\s/g, '');
        let price: number;
        
        if (cleanPrice.includes(',')) {
          price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
        } else {
          price = parseFloat(cleanPrice);
        }

        if (!isNaN(price) && price > 0 && price < 1000000) {
          console.log('Found main price:', { text, price, currency });
          return { price, currency };
        }
      }
    }
  }

  // Fallback to other price elements only if main price not found
  const pricePattern = /(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč)/i;
  let lowestPrice: { price: number; currency: 'EUR' | 'CZK' } | null = null;

  // Helper function to process text and update lowest price
  const processText = (text: string) => {
    text = text.trim();
    if (!text) return;
    
    // Skip secondary currency in parentheses
    if (text.startsWith('(') && text.endsWith(')')) return;
    
    const match = text.match(pricePattern);
    if (!match) return;

    const priceText = match[1];
    const currency = text.includes('€') ? 'EUR' : 'CZK';
    
    const cleanPrice = priceText.replace(/\s/g, '');
    let price: number;
    
    if (cleanPrice.includes(',')) {
      price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
    } else {
      price = parseFloat(cleanPrice);
    }

    if (!isNaN(price) && price > 0 && price < 1000000) {
      if (!lowestPrice || price < lowestPrice.price) {
        lowestPrice = { price, currency };
        console.log('Found fallback price:', { text, price, currency });
      }
    }
  };

  // Only check other elements if main price was not found
  const priceSelectors = [
    '[itemprop="price"]',
    '.product-price',
    '.current-price',
    '.price',
    'strong',
    'span:not(.secmena)'
  ];

  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const element = $(el);
      if (element.find('.price, [itemprop="price"]').length > 0) return;
      const text = element.text();
      processText(text);
    });
  }

  return lowestPrice;
}

export function isValidPrice(price: number): boolean {
  return price > 0 && price < 1000000;
} 