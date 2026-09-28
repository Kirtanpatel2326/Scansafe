import { createClient, createAdminClient } from "@/lib/supabase-server";
import { razorpay } from "@/lib/razorpay";
import { getScanPack } from "@/lib/plans";
import { NextResponse } from "next/server";
import { z } from "zod";

const CheckoutPayloadSchema = z.object({
  packId: z.string().min(1, "Scan pack ID is required").max(50),
  planType: z.string().max(50).optional()
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = CheckoutPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "INVALID_PACK_ID", 
        message: "A valid, explicit scan pack ID must be provided." 
      }, { status: 400 });
    }

    const requestedId = parsed.data.packId || parsed.data.planType;
    const pack = getScanPack(requestedId);
    if (!pack) {
      return NextResponse.json({ 
        error: "UNKNOWN_PACK_ID", 
        message: `Unknown or unsupported scan pack ID: '${requestedId}'. Please select a valid pack from the pricing catalog.` 
      }, { status: 400 });
    }

    const isUsd = pack.id.startsWith("usd_") || pack.id.startsWith("pack_usd_");
    const amount = isUsd ? (pack.priceCents || 900) : pack.pricePaise;
    const currency = isUsd ? "USD" : "INR";

    const options = {
      amount,
      currency,
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user.id,
        email: user.email || "",
        packId: pack.id,
        planType: pack.id,
        scans: String(pack.scans)
      },
    };

    const order = await razorpay.orders.create(options);

    // Store server-side order association in payment_orders (strictly required for webhook verification)
    const adminClient = createAdminClient();
    const { error: orderSaveErr } = await adminClient
      .from("payment_orders")
      .insert({
        id: order.id,
        user_id: user.id,
        pack_id: pack.id,
        amount_paise: amount,
        currency: currency,
        status: "created"
      });

    if (orderSaveErr) {
      console.error("Failed to save payment_orders record:", orderSaveErr);
      return NextResponse.json({ error: "Failed to persist server order association" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      pack: {
        id: pack.id,
        name: pack.name,
        scans: pack.scans,
        priceInr: pack.priceInr
      },
      user: {
        email: user.email,
        name: user.user_metadata?.full_name || "",
      }
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json({ error: "Failed to initialize payment gateway. Please try again later." }, { status: 500 });
  }
}
