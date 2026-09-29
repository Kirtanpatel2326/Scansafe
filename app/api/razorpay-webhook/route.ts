import { fulfillOrderPayment } from "@/lib/credits";
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
      console.error("Payment webhook signing key is not configured on the server.");
      return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
    }

    if (!signature) {
      console.error("x-razorpay-signature header is missing");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(rawBody);
    const expectedSignature = shasum.digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      console.error("Invalid Razorpay Webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    console.log("Verified Razorpay Webhook Event:", body.event);

    // Process scan pack fulfillment on payment capture or order paid
    if (body.event === "payment.captured" || body.event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const orderEntity = body.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      if (!orderId) {
        console.error("No valid order_id found in webhook payload. Rejecting payment without server order association.");
        return NextResponse.json({ error: "Missing order association" }, { status: 400 });
      }

      // Canonical internal purchase reference identity: tied strictly to the stored server order
      const canonicalFulfillmentRef = orderId;
      const providerPaymentId = paymentEntity?.id || null;

      // Verify payment status: MUST be strictly 'captured' for payment events or 'paid' for order events
      if (body.event === "payment.captured") {
        if (paymentEntity?.status !== "captured") {
          console.warn(`Payment status '${paymentEntity?.status}' is not captured. Skipping fulfillment.`);
          return NextResponse.json({ message: `Payment not captured: status ${paymentEntity?.status}` }, { status: 200 });
        }
      } else if (body.event === "order.paid") {
        if (orderEntity?.status !== "paid") {
          console.warn(`Order status '${orderEntity?.status}' is not paid. Skipping fulfillment.`);
          return NextResponse.json({ message: `Order not paid: status ${orderEntity?.status}` }, { status: 200 });
        }
      }

      // Require server-side payment_orders lookup
      const adminClient = createAdminClient();
      const { data: serverOrder, error: orderErr } = await adminClient
        .from("payment_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderErr || !serverOrder) {
        console.error(`Server order '${orderId}' not found in database:`, orderErr);
        return NextResponse.json({ error: "Invalid or untrusted order ID. Server association required." }, { status: 400 });
      }

      const packId = serverOrder.pack_id;
      const pack = getScanPack(packId);

      if (!pack) {
        console.error(`Invalid server packId '${packId}' for order '${orderId}'`);
        return NextResponse.json({ error: `Invalid pack configured: ${packId}` }, { status: 400 });
      }

      // Verify currency is provided in event payload and matches server order
      const actualCurrency = (paymentEntity?.currency || orderEntity?.currency || "").toUpperCase();
      if (!actualCurrency) {
        console.error(`Missing currency in webhook payload for order '${orderId}'`);
        return NextResponse.json({ error: "Missing currency in webhook event payload" }, { status: 400 });
      }
      if (actualCurrency !== serverOrder.currency.toUpperCase()) {
        console.error(`Currency mismatch for order '${orderId}'. Expected: ${serverOrder.currency}, Received: ${actualCurrency}`);
        return NextResponse.json({ error: "Currency mismatch with server order" }, { status: 400 });
      }

      // Verify exact amount is provided in event payload and matches server catalog
      const actualAmountUnits = paymentEntity?.amount !== undefined ? paymentEntity.amount : (orderEntity?.amount_paid !== undefined ? orderEntity.amount_paid : null);
      if (actualAmountUnits === null || actualAmountUnits === undefined) {
        console.error(`Missing actual amount in webhook payload for order '${orderId}'`);
        return NextResponse.json({ error: "Missing actual payment amount in webhook event payload" }, { status: 400 });
      }

      const isUsd = serverOrder.currency.toUpperCase() === "USD";
      const expectedAmountUnits = isUsd 
        ? (pack.priceCents || (pack.priceUsd ? pack.priceUsd * 100 : 900)) 
        : (pack.pricePaise || pack.priceInr * 100);

      if (actualAmountUnits !== expectedAmountUnits || actualAmountUnits !== serverOrder.amount_paise) {
        console.error(`Amount mismatch for order '${orderId}'. Expected: ${expectedAmountUnits} (${isUsd ? 'USD cents' : 'INR paise'}), Received: ${actualAmountUnits}.`);
        return NextResponse.json({ error: "Payment amount mismatch with server catalog" }, { status: 400 });
      }

      const priceDisplay = isUsd ? `$${pack.priceUsd || (expectedAmountUnits / 100)}` : `₹${pack.priceInr}`;

      // Atomically fulfill order in database via single PostgreSQL transaction
      const fulfillment = await fulfillOrderPayment(
        orderId,
        providerPaymentId,
        pack.scans,
        pack.id,
        `Purchased ${pack.name} (${pack.scans} scans) for ${priceDisplay}`
      );

      if (!fulfillment.success) {
        console.error("Failed to fulfill pack purchase in DB:", fulfillment.error);
        return NextResponse.json({ error: fulfillment.error || "DB fulfillment failed" }, { status: 500 });
      }

      console.log("Pack successfully fulfilled for canonical order:", orderId, fulfillment);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Razorpay Webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
