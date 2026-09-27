import { fulfillPackPurchase } from "@/lib/credits";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    const body = JSON.parse(rawBody);
    console.log("Received Razorpay Webhook Event:", body.event);

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

    // Process scan pack fulfillment on payment capture or order paid
    if (body.event === "payment.captured" || body.event === "order.paid") {
      const entity = body.payload?.payment?.entity || body.payload?.order?.entity;
      const notes = entity?.notes;
      const userId = notes?.userId;
      const paymentId = entity?.id || ("pay_" + Date.now());
      const packId = notes?.packId || notes?.planType || "pack_320";
      const amountPaid = entity?.amount ? Math.round(entity.amount / 100) : undefined;

      if (!userId) {
        console.error("No userId found in Razorpay payment notes");
        return NextResponse.json({ error: "No userId in notes" }, { status: 400 });
      }

      console.log(`Fulfilling pack purchase: user=${userId}, pack=${packId}, payment=${paymentId}, amount=₹${amountPaid}...`);

      // Idempotent fulfillment with credit ledger entry
      const fulfillment = await fulfillPackPurchase(userId, packId, paymentId, amountPaid);

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
