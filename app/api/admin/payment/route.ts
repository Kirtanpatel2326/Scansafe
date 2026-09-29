import { createClient, createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { getScanPack } from "@/lib/plans";
import { z } from "zod";

const AdminPaymentActionSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(255).optional()
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate with normal session client
    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize admin
    const adminEmails = ["kirtanpatel2326@gmail.com", "kirtanpatel2305@gmail.com"];
    if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = AdminPaymentActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
    }

    const { paymentId, action, rejectionReason } = parsed.data;

    // 3. Execute privileged actions through separate server-only admin client
    const adminClient = createAdminClient();

    if (action === "approve") {
      const { data: payment, error: fetchErr } = await adminClient
        .from("pending_payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (fetchErr || !payment) {
        return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
      }

      if (payment.status === "approved") {
        return NextResponse.json({ 
          success: true, 
          message: "Payment has already been approved", 
          alreadyApproved: true 
        });
      }

      const pack = getScanPack(payment.plan_type);
      if (!pack) {
        return NextResponse.json({ error: `Invalid plan_type in payment request: ${payment.plan_type}` }, { status: 400 });
      }

      const creditsToGrant = pack.scans;

      // Execute atomic admin approval RPC (grants credits, logs ledger, updates status in single transaction)
      const { data: rpcRes, error: rpcErr } = await adminClient.rpc("approve_manual_payment", {
        p_payment_id: paymentId,
        p_admin_id: user.id,
        p_credits_to_grant: creditsToGrant
      });

      if (rpcErr) {
        console.error("Admin approval RPC error:", rpcErr);
        return NextResponse.json({ error: `Approval transaction failed: ${rpcErr.message}` }, { status: 500 });
      }

      if (!rpcRes || !rpcRes.success) {
        const errMsg = rpcRes?.error || "Failed to approve payment";
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        totalCredits: rpcRes.total_credits,
        creditsGranted: creditsToGrant,
        alreadyApproved: rpcRes.already_approved
      });
    } else if (action === "reject") {
      const reason = rejectionReason || "Manual UPI transfer rejected by administrator";
      const { data: rejectRes, error: rejectErr } = await adminClient.rpc("reject_manual_payment", {
        p_payment_id: paymentId,
        p_admin_id: user.id,
        p_reason: reason
      });

      if (rejectErr) {
        console.error("Admin rejection RPC error:", rejectErr);
        return NextResponse.json({ error: `Rejection transaction failed: ${rejectErr.message}` }, { status: 500 });
      }

      if (!rejectRes || !rejectRes.success) {
        const errMsg = rejectRes?.error || "Failed to reject payment";
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, status: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action specifier" }, { status: 400 });
  } catch (err: any) {
    console.error("Payment console action error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
