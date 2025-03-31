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
    const { url, priceSelector, name } = await request.json();

    if (!url || !priceSelector || !name) {
      return NextResponse.json(
        { error: 'URL, price selector, and name are required' },
        { status: 400 }
      );
    }

    // Check price before adding
    const currentPrice = await checkPrice(url, priceSelector);

    const product = {
      id: Date.now().toString(),
      url,
      priceSelector,
      name,
      currentPrice,
      previousPrice: null,
      lastChecked: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await addProduct(product);

    // Add initial price history
    await addPriceHistory({
      productId: product.id,
      price: currentPrice,
      timestamp: new Date().toISOString()
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