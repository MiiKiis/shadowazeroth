// API route for QR Bolivia payment method
import { NextResponse } from 'next/server';

let qrBoliviaData = {
  imageUrl: '',
  instructions: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: '',
  whatsappUrl: '',
};

export async function GET() {
  return NextResponse.json(qrBoliviaData);
}

export async function POST(request: Request) {
  const data = await request.json();
  qrBoliviaData = { 
    imageUrl: data.imageUrl || '', 
    instructions: data.instructions || '',
    bankName: data.bankName || '',
    accountHolder: data.accountHolder || '',
    accountNumber: data.accountNumber || '',
    accountType: data.accountType || '',
    whatsappUrl: data.whatsappUrl || '',
  };
  return NextResponse.json({ success: true });
}
