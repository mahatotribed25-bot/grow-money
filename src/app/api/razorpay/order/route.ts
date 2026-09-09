import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const { amount, currency, receipt } = await request.json();

    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Amount is required and must be at least 100 paise' }, { status: 400 });
    }

    const options = {
      amount: Math.round(amount), // in paise
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}