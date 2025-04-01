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

interface PriceInfo {
  price: number;
  currency: 'EUR' | 'CZK';
  text: string;
}

function cleanPriceText(text: string): string {
  // Remove any non-essential characters
  return text
    .replace(/[^\d,.\s€Kč]/g, '') // Keep only numbers, comma, dot, space, and currency symbols
    .trim();
}

function parsePriceValue(priceText: string): number | null {
  try {
    // Remove any spaces and normalize decimal separators
    const cleanPrice = priceText
      .replace(/\s/g, '')
      .replace(/(\d+)\.(\d{3})/g, '$1$2') // Remove thousand separators if they're dots
      .replace(/(\d+),(\d{3})/g, '$1$2'); // Remove thousand separators if they're commas
    
    // Try to determine the decimal separator based on position
    let price: number;
    if (cleanPrice.includes(',')) {
      const parts = cleanPrice.split(',');
      if (parts[1] && parts[1].length <= 2) {
        // Comma is likely a decimal separator (e.g., 123,45)
        price = parseFloat(cleanPrice.replace(',', '.'));
      } else {
        // Comma is likely a thousand separator (e.g., 1,234)
        price = parseFloat(cleanPrice.replace(',', ''));
      }
    } else if (cleanPrice.includes('.')) {
      const parts = cleanPrice.split('.');
      if (parts[1] && parts[1].length <= 2) {
        // Dot is likely a decimal separator (e.g., 123.45)
        price = parseFloat(cleanPrice);
      } else {
        // Dot is likely a thousand separator (e.g., 1.234)
        price = parseFloat(cleanPrice.replace('.', ''));
      }
    } else {
      // No separators
      price = parseFloat(cleanPrice);
    }

    return !isNaN(price) && price > 0 && price < 1000000 ? price : null;
  } catch (error) {
    console.error('Error parsing price:', { priceText, error });
    return null;
  }
}

export function findPrice($: cheerio.CheerioAPI): { price: number; currency: 'EUR' | 'CZK' } | null {
  console.log('Starting price extraction...');
  
  // Common price selectors
  const priceSelectors = [
    // Specific price elements
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
    // Generic price containers
    'strong:contains("€")',
    'strong:contains("Kč")',
    'span:contains("€"):not(.old-price)',
    'span:contains("Kč"):not(.old-price)',
    // Specific site selectors
    '.cena[id^="variant_price"]',
    '.product__price--final',
    '.price-box',
    // Additional selectors for common patterns
    '[class*="price"]:not([class*="old"]):not([class*="regular"])',
    '[class*="cena"]:not([class*="old"]):not([class*="regular"])',
    '[class*="cost"]:not([class*="old"]):not([class*="regular"])',
    // Meta tags
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]'
  ];

  const pricePattern = /(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč|EUR|CZK)/i;
  let bestPrice: PriceInfo | null = null;

  // Helper function to process text and update best price
  const processText = (text: string, source: string): void => {
    text = cleanPriceText(text);
    if (!text) return;
    
    console.log('Processing price text:', { text, source });
    
    // Skip secondary currency in parentheses
    if (text.startsWith('(') && text.endsWith(')')) {
      console.log('Skipping secondary currency:', text);
      return;
    }
    
    const match = text.match(pricePattern);
    if (!match) {
      console.log('No price pattern match:', text);
      return;
    }

    const priceText = match[1];
    const currency = text.toLowerCase().includes('kč') || text.toLowerCase().includes('czk') ? 'CZK' as const : 'EUR' as const;
    const price = parsePriceValue(priceText);
    
    if (price !== null) {
      console.log('Found valid price:', { text, price, currency, source });
      if (!bestPrice || price < bestPrice.price) {
        bestPrice = { price, currency, text };
      }
    } else {
      console.log('Invalid price value:', { text, priceText });
    }
  };

  // First check meta tags
  $('meta[property="product:price:amount"], meta[property="og:price:amount"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      processText(content, 'meta-tag');
    }
  });

  // Then try specific selectors
  for (const selector of priceSelectors) {
    console.log('Trying selector:', selector);
    $(selector).each((_, el) => {
      const element = $(el);
      // Skip if this element is inside another price element
      if (element.parents('.price, [itemprop="price"]').length > 0) {
        return;
      }
      
      // Try content attribute first (for meta tags)
      const content = element.attr('content');
      if (content) {
        processText(content, `${selector} [content]`);
      }
      
      // Then try text content
      const text = element.text();
      processText(text, selector);
    });
  }

  // If no price found, try a broader search
  if (!bestPrice) {
    console.log('No price found with specific selectors, trying broader search...');
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

  if (bestPrice) {
    console.log('Final price found:', bestPrice);
    if ('price' in bestPrice && 'currency' in bestPrice) {
      const result: { price: number; currency: 'EUR' | 'CZK' } = {
        price: bestPrice.price,
        currency: bestPrice.currency
      };
      return result;
    }
  }

  console.log('No valid price found');
  return null;
}

export function isValidPrice(price: number): boolean {
  return price > 0 && price < 1000000;
} 