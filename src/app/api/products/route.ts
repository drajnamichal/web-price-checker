import { NextResponse } from 'next/server';
import { addProduct, getProducts, deleteProduct, addPriceHistory } from '@/db';
import { checkPrice } from '@/utils/priceChecker';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, priceSelector, name } = body;

    if (!url || !priceSelector || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: url, priceSelector, and name are required' },
        { status: 400 }
      );
    }

    // Check initial price
    let initialPrice;
    try {
      initialPrice = await checkPrice(url, priceSelector);
    } catch (error) {
      console.error('Error checking initial price:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to check price' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Create product object
    const product = {
      id: crypto.randomUUID(),
      url,
      priceSelector,
      name,
      currentPrice: initialPrice,
      previousPrice: null,
      lastChecked: now,
      createdAt: now
    };

    try {
      await addProduct(product);
    } catch (error) {
      console.error('Error adding product to database:', error);
      return NextResponse.json(
        { error: 'Failed to save product to database. Please try again later.' },
        { status: 500 }
      );
    }

    try {
      // Add initial price history
      await addPriceHistory({
        productId: product.id,
        price: initialPrice,
        timestamp: now
      });
    } catch (error) {
      console.error('Error adding price history:', error);
      // Don't fail the request if price history fails
      // We already have the product saved
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        lastChecked: product.lastChecked.toISOString(),
        createdAt: product.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      { error: 'Failed to add product. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
} 