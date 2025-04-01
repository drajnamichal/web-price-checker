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

type Currency = 'EUR' | 'CZK';

interface PriceInfo {
  readonly price: number;
  readonly currency: Currency;
  readonly text: string;
}

function cleanPriceText(text: string): string {
  return text
    .replace(/[^\d,.\s€Kč]/g, '')
    .trim();
}

function parsePriceValue(priceText: string): number | null {
  try {
    const cleanPrice = priceText
      .replace(/\s/g, '')
      .replace(/(\d+)\.(\d{3})/g, '$1$2')
      .replace(/(\d+),(\d{3})/g, '$1$2');
    
    let price: number;
    if (cleanPrice.includes(',')) {
      const parts = cleanPrice.split(',');
      if (parts[1] && parts[1].length <= 2) {
        price = parseFloat(cleanPrice.replace(',', '.'));
      } else {
        price = parseFloat(cleanPrice.replace(',', ''));
      }
    } else if (cleanPrice.includes('.')) {
      const parts = cleanPrice.split('.');
      if (parts[1] && parts[1].length <= 2) {
        price = parseFloat(cleanPrice);
      } else {
        price = parseFloat(cleanPrice.replace('.', ''));
      }
    } else {
      price = parseFloat(cleanPrice);
    }

    return !isNaN(price) && price > 0 && price < 1000000 ? price : null;
  } catch (error) {
    console.error('Error parsing price:', { priceText, error });
    return null;
  }
}

function determineCurrency(text: string): Currency {
  return text.toLowerCase().includes('kč') || text.toLowerCase().includes('czk') 
    ? 'CZK' 
    : 'EUR';
}

function createPriceInfo(price: number, text: string): PriceInfo {
  return {
    price,
    currency: determineCurrency(text),
    text
  };
}

export function findPrice($: cheerio.CheerioAPI): { price: number; currency: Currency } | null {
  console.log('Starting price extraction...');
  
  const priceSelectors = [
    '.price-wrapper .price',
    '.product-price .price',
    '.price.actual-price',
    '.special-price .price',
    '[data-price-type="finalPrice"] .price',
    '[itemprop="price"]',
    '.product-info-price .price',
    '.product-price',
    '.current-price',
    '.price:not(.old-price)',
    'strong:contains("€")',
    'strong:contains("Kč")',
    'span:contains("€"):not(.old-price)',
    'span:contains("Kč"):not(.old-price)',
    '.cena[id^="variant_price"]',
    '.product__price--final',
    '.price-box',
    '[class*="price"]:not([class*="old"]):not([class*="regular"])',
    '[class*="cena"]:not([class*="old"]):not([class*="regular"])',
    '[class*="cost"]:not([class*="old"]):not([class*="regular"])',
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]'
  ];

  const pricePattern = /(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč|EUR|CZK)/i;
  let currentBestPrice: PriceInfo | null = null;

  function processText(text: string, source: string): void {
    const cleanText = cleanPriceText(text);
    if (!cleanText || cleanText.startsWith('(') && cleanText.endsWith(')')) {
      return;
    }

    const match = cleanText.match(pricePattern);
    if (!match) {
      return;
    }

    const parsedPrice = parsePriceValue(match[1]);
    if (parsedPrice === null) {
      return;
    }

    const newPriceInfo = createPriceInfo(parsedPrice, cleanText);
    
    if (!currentBestPrice || newPriceInfo.price < currentBestPrice.price) {
      currentBestPrice = newPriceInfo;
      console.log('Found new best price:', newPriceInfo);
    }
  }

  // Check meta tags first
  $('meta[property="product:price:amount"], meta[property="og:price:amount"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      processText(content, 'meta-tag');
    }
  });

  // Then check specific selectors
  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const element = $(el);
      if (element.parents('.price, [itemprop="price"]').length > 0) {
        return;
      }
      
      const content = element.attr('content');
      if (content) {
        processText(content, `${selector} [content]`);
      }
      
      processText(element.text(), selector);
    });
  }

  // Broad search if no price found
  if (!currentBestPrice) {
    $('*').each((_, el) => {
      const element = $(el);
      if (element.children().length === 0) {
        const text = element.text().trim();
        if (text.match(/\d+(?:[\s,.]\d+)*\s*[€KčEURCZK]/i)) {
          processText(text, 'broad-search');
        }
      }
    });
  }

  if (currentBestPrice) {
    return {
      price: currentBestPrice.price,
      currency: currentBestPrice.currency
    };
  }

  console.log('No valid price found');
  return null;
}

export function isValidPrice(price: number): boolean {
  return price > 0 && price < 1000000;
} 