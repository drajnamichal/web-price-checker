import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { findPrice, findProductName } from '@/utils/price-extraction';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL je povinná' },
        { status: 400 }
      );
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract product name
      const name = findProductName($);
      if (!name) {
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť názov produktu',
            debug: { url }
          },
          { status: 404 }
        );
      }

      // Extract price
      const priceInfo = findPrice($);
      if (!priceInfo) {
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť cenu produktu',
            debug: { url, name }
          },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const product: Product = {
        id: uuidv4(),
        name,
        url,
        price: priceInfo.price,
        currency: priceInfo.currency,
        lastChecked: now,
        priceHistory: [
          { price: priceInfo.price, date: now }
        ],
        createdAt: now
      };

      // Save to KV store
      await kv.set(`product:${product.id}`, JSON.stringify(product));

      return NextResponse.json(product);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return NextResponse.json(
            { error: 'Vypršal časový limit požiadavky. Webová stránka môže byť pomalá alebo blokuje naše požiadavky.' },
            { status: 408 }
          );
        }
        return NextResponse.json(
          { error: 'Nepodarilo sa načítať webovú stránku. Stránka môže blokovať naše požiadavky.' },
          { status: error.response?.status || 500 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa spracovať požiadavku.' },
      { status: 500 }
    );
  }
} 