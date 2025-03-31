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
      { error: 'Failed to fetch products' },
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
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check initial price
    const initialPrice = await checkPrice(url, priceSelector);
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

    await addProduct(product);

    // Add initial price history
    await addPriceHistory({
      productId: product.id,
      price: initialPrice,
      timestamp: now
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      { error: 'Failed to add product' },
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