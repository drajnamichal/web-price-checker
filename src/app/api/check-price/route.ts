import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { findPrice, findProductName } from '@/utils/price-extraction';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request with body:', body);

    const { url } = body;
    if (!url) {
      return NextResponse.json(
        { error: 'URL je povinná' },
        { status: 400 }
      );
    }

    try {
      console.log('Fetching URL:', url);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10000,
        maxRedirects: 5
      });

      if (!response.data) {
        console.error('No data received from URL');
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa načítať webovú stránku',
            debug: { url }
          },
          { status: 500 }
        );
      }

      console.log('Successfully fetched URL, parsing HTML...');
      const $ = cheerio.load(response.data);
      
      // Extract product name
      console.log('Extracting product name...');
      const name = findProductName($);
      if (!name) {
        console.log('Failed to find product name');
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť názov produktu',
            debug: { url, html: response.data.substring(0, 200) }
          },
          { status: 404 }
        );
      }
      console.log('Found product name:', name);

      // Extract price
      console.log('Extracting price...');
      const priceInfo = findPrice($);
      if (!priceInfo) {
        console.log('Failed to find price');
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť cenu produktu',
            debug: { url, name, html: response.data.substring(0, 200) }
          },
          { status: 404 }
        );
      }
      console.log('Found price:', priceInfo);

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
      console.log('Saving product to KV store:', product);
      try {
        await kv.set(`product:${product.id}`, JSON.stringify(product));
      } catch (kvError) {
        console.error('Error saving to KV store:', kvError);
        // Continue even if KV store fails
      }

      return NextResponse.json(product);

    } catch (error) {
      console.error('Error in URL processing:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return NextResponse.json(
            { 
              error: 'Vypršal časový limit požiadavky. Webová stránka môže byť pomalá alebo blokuje naše požiadavky.',
              debug: { url, errorCode: error.code }
            },
            { status: 408 }
          );
        }
        if (error.response) {
          return NextResponse.json(
            { 
              error: 'Nepodarilo sa načítať webovú stránku. Stránka môže blokovať naše požiadavky.',
              debug: { 
                url, 
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers
              }
            },
            { status: error.response.status }
          );
        }
        if (error.request) {
          return NextResponse.json(
            { 
              error: 'Nepodarilo sa načítať webovú stránku.',
              debug: { 
                url, 
                errorCode: error.code,
                errorMessage: error.message,
                request: {
                  method: error.request.method,
                  path: error.request.path,
                  headers: error.request.headers
                }
              }
            },
            { status: 500 }
          );
        }
      }
      return NextResponse.json(
        { 
          error: 'Nepodarilo sa načítať webovú stránku.',
          debug: { 
            url,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { 
        error: 'Nepodarilo sa spracovať požiadavku.',
        debug: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
} 