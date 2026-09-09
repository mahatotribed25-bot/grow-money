import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      return NextResponse.json({ status: 'ok' });
    } else {
      return NextResponse.json({ status: 'verification_failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Razorpay Verification Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}