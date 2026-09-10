import { NextResponse } from 'next/server';

// Razorpay module removed to fix build error.
export async function POST(request: Request) {
  return NextResponse.json({ error: 'Razorpay integration disabled.' }, { status: 404 });
}