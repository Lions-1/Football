import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { customerName, customerEmail, customerPhone, address, notes, items } = body;

  if (!customerName || !customerPhone || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const total = items.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
    0
  );

  const order = await prisma.order.create({
    data: {
      customerName,
      customerEmail: customerEmail || null,
      customerPhone,
      address: address || null,
      notes: notes || null,
      total,
      items: {
        create: items.map((item: {
          productId: string;
          quantity: number;
          size: string;
          customName?: string;
          customNumber?: string;
          price: number;
        }) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          customName: item.customName || null,
          customNumber: item.customNumber || null,
          price: item.price,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(order, { status: 201 });
}
