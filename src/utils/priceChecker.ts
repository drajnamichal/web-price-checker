import axios from 'axios';

export async function checkPrice(url: string): Promise<{ price: number; currency: 'EUR' | 'CZK' }> {
  try {
    const response = await axios.post('/api/check-price', { url });
    
    if (!response.data || typeof response.data.price !== 'number' || !response.data.currency) {
      throw new Error('Neplatné údaje o cene prijaté zo servera');
    }
    
    return {
      price: response.data.price,
      currency: response.data.currency
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || 'Nepodarilo sa skontrolovať cenu';
      throw new Error(errorMessage);
    }
    throw error;
  }
} 