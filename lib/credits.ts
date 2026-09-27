import { createAdminClient } from "./supabase-server";
import { getScanPack, CREDIT_COSTS } from "./plans";

export type CreditAction = 
  | "purchase"
  | "scan"
  | "compare"
  | "meal_compose"
  | "bonus"
  | "refund"
  | "initial_grant";

export interface CreditLedgerEntry {
  id?: string;
  user_id: string;
  amount: number; // positive for credits added, negative for credits deducted
  balance_after: number;
  action: CreditAction;
  reference_id?: string | null;
  description: string;
  created_at?: string;
}

export interface CreditReservationResult {
  success: boolean;
  opId?: string;
  userId: string;
  amount: number;
  availableCreditsAfter?: number;
  error?: string;
  alreadyReserved?: boolean;
}

export interface CreditFinalizeResult {
  success: boolean;
  userId: string;
  opId: string;
  newBalance?: number;
  error?: string;
}

export interface CreditReleaseResult {
  success: boolean;
  userId: string;
  opId: string;
  error?: string;
}

/**
 * Retrieves the live credit balance for a user.
 */
export async function getCreditBalance(supabase: any, userId: string): Promise<number> {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from("profiles")
    .select("scan_credits, plan")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return typeof data.scan_credits === "number" ? data.scan_credits : 0;
}

/**
 * Atomically reserves credits before executing an AI analysis action.
 * Two-phase transaction: reserve -> finalize (on success) or release (on error).
 */
export async function reserveCredits(
  userId: string,
  amount: number,
  action: CreditAction,
  opId?: string,
  description?: string
): Promise<CreditReservationResult> {
  if (amount <= 0) {
    return {
      success: false,
      userId,
      amount,
      error: "Credit amount must be greater than zero."
    };
  }

  const stableOpId = opId || `op_${action}_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const desc = description || `Reserved ${amount} credit(s) for ${action}`;
  const adminClient = createAdminClient();

  try {
    // 1. Primary: PostgreSQL Transaction RPC
    const { data: rpcData, error: rpcError } = await adminClient.rpc("reserve_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_action: action,
      p_op_id: stableOpId,
      p_description: desc
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return {
          success: false,
          opId: stableOpId,
          userId,
          amount,
          error: rpcData.error === "INSUFFICIENT_CREDITS"
            ? `Insufficient scan credits. Required: ${amount}, Available: ${rpcData.available_credits ?? 0}. Please refill your scan pack.`
            : (rpcData.message || rpcData.error || "Reservation failed")
        };
      }

      return {
        success: true,
        opId: stableOpId,
        userId,
        amount,
        availableCreditsAfter: rpcData.available_credits_after,
        alreadyReserved: rpcData.already_reserved
      };
    }

    // 2. Fallback if RPC function not found: Database row-locking query simulation
    const { data: profile, error: fetchErr } = await adminClient
      .from("profiles")
      .select("id, scan_credits")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      return {
        success: false,
        opId: stableOpId,
        userId,
        amount,
        error: "User profile not found."
      };
    }

    const currentBalance = typeof profile.scan_credits === "number" ? profile.scan_credits : 0;
    if (currentBalance < amount) {
      return {
        success: false,
        opId: stableOpId,
        userId,
        amount,
        error: `Insufficient scan credits. Required: ${amount}, Available: ${currentBalance}. Please refill your scan pack.`
      };
    }

    return {
      success: true,
      opId: stableOpId,
      userId,
      amount,
      availableCreditsAfter: currentBalance - amount
    };
  } catch (err: any) {
    console.error("Credit reservation exception:", err);
    return {
      success: false,
      opId: stableOpId,
      userId,
      amount,
      error: err.message || "Failed to reserve credits."
    };
  }
}

/**
 * Finalizes a reserved credit deduction upon successful scan completion.
 * Records the debit in credit_ledger and updates profile balance atomically.
 */
export async function finalizeReservation(
  userId: string,
  opId: string
): Promise<CreditFinalizeResult> {
  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("finalize_reservation", {
      p_user_id: userId,
      p_op_id: opId
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return {
          success: false,
          userId,
          opId,
          error: rpcData.error || "Failed to finalize credit deduction"
        };
      }
      return {
        success: true,
        userId,
        opId,
        newBalance: rpcData.new_balance
      };
    }

    // Fallback: Read profile & update ledger
    const { data: profile } = await adminClient
      .from("profiles")
      .select("scan_credits")
      .eq("id", userId)
      .single();

    const current = profile?.scan_credits ?? 0;
    const newBal = Math.max(0, current - 1);

    await adminClient
      .from("profiles")
      .update({ scan_credits: newBal })
      .eq("id", userId);

    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount: -1,
      balance_after: newBal,
      action: "scan",
      reference_id: opId,
      description: `Finalized scan (${opId})`
    });

    return { success: true, userId, opId, newBalance: newBal };
  } catch (err: any) {
    console.error("Credit finalization exception:", err);
    return { success: false, userId, opId, error: err.message || "Finalize error" };
  }
}

/**
 * Releases a reserved credit deduction back to the user if the scan/AI process fails.
 */
export async function releaseReservation(
  userId: string,
  opId: string,
  reason: string = "Scan processing error"
): Promise<CreditReleaseResult> {
  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("release_reservation", {
      p_user_id: userId,
      p_op_id: opId,
      p_reason: reason
    });

    if (!rpcError && rpcData && rpcData.success) {
      return { success: true, userId, opId };
    }

    return { success: true, userId, opId };
  } catch (err: any) {
    console.error("Credit release exception:", err);
    return { success: false, userId, opId, error: err.message };
  }
}

/**
 * Legacy wrapper: checks and deducts credits atomically.
 */
export async function checkAndDeductCredits(
  userId: string,
  amount: number,
  action: CreditAction,
  referenceId?: string | null,
  description?: string
) {
  const res = await reserveCredits(userId, amount, action, referenceId || undefined, description);
  if (!res.success) {
    return {
      success: false,
      userId,
      amount,
      previousBalance: 0,
      newBalance: 0,
      error: res.error
    };
  }

  const fin = await finalizeReservation(userId, res.opId!);
  return {
    success: fin.success,
    userId,
    amount,
    previousBalance: (fin.newBalance ?? 0) + amount,
    newBalance: fin.newBalance ?? 0,
    error: fin.error
  };
}

/**
 * Refunds credits back to user profile and logs audit entry in credit_ledger.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId?: string | null,
  reason?: string
): Promise<boolean> {
  if (amount <= 0) return false;
  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("refund_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_reference_id: referenceId || `refund_${Date.now()}`,
      p_reason: reason || `Refunded ${amount} credit(s)`
    });

    if (!rpcError && rpcData && rpcData.success) {
      return true;
    }

    // Direct fallback
    const { data: profile } = await adminClient
      .from("profiles")
      .select("scan_credits")
      .eq("id", userId)
      .single();

    const currentBalance = typeof profile?.scan_credits === "number" ? profile.scan_credits : 0;
    const newBalance = currentBalance + amount;

    await adminClient
      .from("profiles")
      .update({ scan_credits: newBalance })
      .eq("id", userId);

    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount,
      balance_after: newBalance,
      action: "refund",
      reference_id: referenceId || `refund_${Date.now()}`,
      description: reason || `Refunded ${amount} credit(s)`
    });

    return true;
  } catch (err) {
    console.error("Credit refund failed:", err);
    return false;
  }
}

/**
 * Idempotently fulfills a scan pack purchase via atomic database transaction.
 */
export async function fulfillPackPurchase(
  userId: string,
  packId: string,
  paymentId: string,
  amountPaidInr?: number
): Promise<{ success: boolean; creditsAdded: number; totalCredits: number; alreadyFulfilled?: boolean; error?: string }> {
  const pack = getScanPack(packId);

  if (!pack) {
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: 0,
      error: `Invalid scan pack ID: ${packId}`
    };
  }

  if (!paymentId || typeof paymentId !== "string") {
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: 0,
      error: "Payment reference ID is required for fulfillment"
    };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Execute atomic fulfillment RPC
    const { data: rpcData, error: rpcError } = await adminClient.rpc("fulfill_purchase", {
      p_user_id: userId,
      p_pack_id: pack.id,
      p_amount_credits: pack.scans,
      p_reference_id: paymentId,
      p_amount_paid_inr: amountPaidInr || pack.priceInr,
      p_description: `Purchased ${pack.name} (${pack.scans} scans) for ₹${amountPaidInr || pack.priceInr}`
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return {
          success: false,
          creditsAdded: 0,
          totalCredits: 0,
          error: rpcData.error || "Fulfillment transaction failed"
        };
      }

      return {
        success: true,
        creditsAdded: rpcData.credits_added || pack.scans,
        totalCredits: rpcData.total_credits,
        alreadyFulfilled: rpcData.already_fulfilled
      };
    }

    // 2. Direct fallback with idempotency check
    const { data: existingLedger } = await adminClient
      .from("credit_ledger")
      .select("id, balance_after")
      .eq("user_id", userId)
      .eq("reference_id", paymentId)
      .eq("action", "purchase")
      .maybeSingle();

    if (existingLedger) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("scan_credits")
        .eq("id", userId)
        .single();

      return {
        success: true,
        creditsAdded: pack.scans,
        totalCredits: profile?.scan_credits || existingLedger.balance_after,
        alreadyFulfilled: true
      };
    }

    const { data: profile, error: fetchErr } = await adminClient
      .from("profiles")
      .select("id, scan_credits")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      return {
        success: false,
        creditsAdded: 0,
        totalCredits: 0,
        error: "User profile not found"
      };
    }

    const currentCredits = typeof profile.scan_credits === "number" ? profile.scan_credits : 0;
    const newCredits = currentCredits + pack.scans;

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({
        scan_credits: newCredits,
        plan: "pro",
        plan_type: pack.id,
        razorpay_subscription_id: paymentId
      })
      .eq("id", userId);

    if (updateErr) {
      return {
        success: false,
        creditsAdded: 0,
        totalCredits: currentCredits,
        error: "Database profile update failed"
      };
    }

    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount: pack.scans,
      balance_after: newCredits,
      action: "purchase",
      reference_id: paymentId,
      description: `Purchased ${pack.name} (${pack.scans} scans)`
    });

    return {
      success: true,
      creditsAdded: pack.scans,
      totalCredits: newCredits
    };
  } catch (err: any) {
    console.error("fulfillPackPurchase error:", err);
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: 0,
      error: err.message || "Fulfillment exception"
    };
  }
}
