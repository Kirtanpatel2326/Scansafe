import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fulfillPackPurchase } from "@/lib/credits";

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

      // Update status in pending_payments
      const { error: updatePayErr } = await supabase
        .from("pending_payments")
        .update({ status: "approved" })
        .eq("id", paymentId);

      if (updatePayErr) throw updatePayErr;

      // Idempotently fulfill credits in credit_ledger and profiles
      const fulfillment = await fulfillPackPurchase(
        payment.user_id,
        payment.plan_type,
        payment.utr || paymentId,
        payment.amount
      );

      if (!fulfillment.success) {
        console.error("Fulfillment failed on admin approval:", fulfillment.error);
      }

      return NextResponse.json({ success: true, fulfillment });
    } else if (action === "reject") {
      const { error: updatePayErr } = await supabase
        .from("pending_payments")
        .update({ status: "rejected" })
        .eq("id", paymentId);

      if (updatePayErr) throw updatePayErr;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action specifier" }, { status: 400 });
  } catch (err: any) {
    console.error("Payment console action error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
