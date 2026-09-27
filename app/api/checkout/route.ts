import { createClient } from "@/lib/supabase-server";
import { razorpay } from "@/lib/razorpay";
import { getScanPack } from "@/lib/plans";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse plan / pack ID from request body
    let packId = "pack_320";
    try {
      const body = await request.json();
      if (body && (body.planType || body.packId)) {
        packId = body.packId || body.planType;
      }
    } catch (e) {
      // Default to pack_320
    }

    const pack = getScanPack(packId);
    if (!pack) {
      return NextResponse.json({ error: `Invalid scan pack ID: ${packId}` }, { status: 400 });
    }

    const isUsd = packId.startsWith("usd_") || packId.startsWith("pack_usd_");
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
