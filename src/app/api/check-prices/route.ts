import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';
import { findPrice } from '@/utils/price-extraction';

const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds

async function checkPrice(product: Product): Promise<Product> {
  try {
    const response = await axios.get(product.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const priceInfo = findPrice($);
    
    if (!priceInfo) {
      console.error(`Failed to find price for product: ${product.name}`);
      return product;
    }

    const now = new Date().toISOString();
    const updatedProduct: Product = {
      ...product,
      price: priceInfo.price,
      currency: priceInfo.currency,
      lastChecked: now,
      priceHistory: [
        ...product.priceHistory,
        { price: priceInfo.price, date: now }
      ]
    };

    // Save updated product back to KV store
    await kv.set(`product:${product.id}`, JSON.stringify(updatedProduct));
    
    return updatedProduct;
  } catch (error) {
    console.error(`Error checking price for product: ${product.name}`, error);
    return product;
  }
}

export async function GET() {
  try {
    // Get all products from KV store
    const keys = await kv.keys('product:*');
    const products: Product[] = [];
    
    for (const key of keys) {
      const productJson = await kv.get(key);
      if (productJson) {
        products.push(JSON.parse(productJson as string));
      }
    }

    const now = Date.now();
    const updatedProducts: Product[] = [];

    // Check prices for products that haven't been checked in the last 30 minutes
    for (const product of products) {
      const lastChecked = new Date(product.lastChecked).getTime();
      if (now - lastChecked >= THIRTY_MINUTES) {
        const updatedProduct = await checkPrice(product);
        updatedProducts.push(updatedProduct);
      } else {
        updatedProducts.push(product);
      }
    }

    return NextResponse.json({ 
      message: 'Price check completed',
      updatedProducts 
    });

  } catch (error) {
    console.error('Error checking prices:', error);
    return NextResponse.json(
      { error: 'Failed to check prices' },
      { status: 500 }
    );
  }
} 