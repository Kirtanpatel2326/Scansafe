import { fulfillPackPurchase } from "@/lib/credits";
import { getScanPack } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
    }

    if (!signature) {
      console.error("x-razorpay-signature header is missing");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(rawBody);
    const expectedSignature = shasum.digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid Razorpay Webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    console.log("Verified Razorpay Webhook Event:", body.event);

    // Process scan pack fulfillment on payment capture or order paid
    if (body.event === "payment.captured" || body.event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const orderEntity = body.payload?.order?.entity;
      const entity = paymentEntity || orderEntity;

      if (!entity || !entity.id) {
        console.error("No valid payment or order entity in webhook payload");
        return NextResponse.json({ error: "Missing entity" }, { status: 400 });
      }

      // Canonical payment identifier: prefer payment id (pay_xxx), fallback to order id (order_xxx)
      const canonicalPaymentId = paymentEntity?.id || orderEntity?.id;
      const orderId = entity.order_id || orderEntity?.id;
      const notes = entity.notes || {};
      
      let userId = notes.userId;
      let packId = notes.packId || notes.planType;
      const amountPaise = entity.amount;
      const amountPaid = amountPaise ? Math.round(amountPaise / 100) : undefined;

      // Verify against server-side payment_orders association if available
      if (orderId) {
        try {
          const adminClient = createAdminClient();
          const { data: serverOrder } = await adminClient
            .from("payment_orders")
            .select("*")
            .eq("id", orderId)
            .maybeSingle();

          if (serverOrder) {
            userId = userId || serverOrder.user_id;
            packId = packId || serverOrder.pack_id;
            
            // Mark order as paid
            await adminClient
              .from("payment_orders")
              .update({ status: "paid" })
              .eq("id", orderId);
          }
        } catch (dbErr) {
          console.warn("Could not query server payment_orders:", dbErr);
        }
      }

      if (!userId) {
        console.error("No userId found in Razorpay webhook notes or server order association");
        return NextResponse.json({ error: "Unidentified user for payment" }, { status: 400 });
      }

      const pack = getScanPack(packId);
      if (!pack) {
        console.error(`Invalid or unmapped packId in payment: '${packId}'`);
        return NextResponse.json({ error: `Invalid pack: ${packId}` }, { status: 400 });
      }

      console.log(`Fulfilling pack purchase: user=${userId}, pack=${pack.id}, payment=${canonicalPaymentId}, amount=₹${amountPaid}...`);

      // Idempotent fulfillment with credit ledger entry
      const fulfillment = await fulfillPackPurchase(userId, pack.id, canonicalPaymentId, amountPaid);

      if (!fulfillment.success) {
        console.error("Failed to fulfill pack purchase in DB:", fulfillment.error);
        return NextResponse.json({ error: fulfillment.error || "DB fulfillment failed" }, { status: 500 });
      }

      console.log("Pack successfully fulfilled:", fulfillment);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Razorpay Webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
