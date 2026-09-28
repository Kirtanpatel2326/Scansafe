import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fulfillPackPurchase } from "@/lib/credits";
import { getScanPack } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Can be ignored
            }
          },
        },
      }
    );

    // Verify admin session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = ["kirtanpatel2326@gmail.com", "kirtanpatel2305@gmail.com"];
    if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { paymentId, action } = await req.json();

    if (action === "approve") {
      const { data: payment } = await supabase
        .from("pending_payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
      }

      if (payment.status === "approved") {
        return NextResponse.json({ error: "Payment has already been approved" }, { status: 400 });
      }

      const pack = getScanPack(payment.plan_type);
      if (!pack) {
        return NextResponse.json({ error: `Invalid plan_type in payment request: ${payment.plan_type}` }, { status: 400 });
      }

      const creditsToGrant = pack.scans;

      // Execute atomic admin approval RPC (grants credits, logs ledger, updates status in single transaction)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("approve_manual_payment", {
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
        creditsGranted: creditsToGrant
      });
    } else if (action === "reject") {
      const { data: rejectRes, error: rejectErr } = await supabase.rpc("reject_manual_payment", {
        p_payment_id: paymentId,
        p_admin_id: user.id,
        p_reason: "Manual UPI transfer rejected by administrator"
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
