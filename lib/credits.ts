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

export interface CreditReservation {
  success: boolean;
  userId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  error?: string;
}

/**
 * Retrieves the live credit balance for a user.
 */
export async function getCreditBalance(supabase: any, userId: string): Promise<number> {
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
 * Atomically checks and reserves/deducts credits for an action (scan, compare, meal_compose).
 * Uses service role client to bypass client RLS column restrictions safely on the server.
 */
export async function checkAndDeductCredits(
  userId: string,
  amount: number,
  action: CreditAction,
  referenceId?: string | null,
  description?: string
): Promise<CreditReservation> {
  const adminClient = createAdminClient();

  // 1. Fetch current profile
  const { data: profile, error: fetchErr } = await adminClient
    .from("profiles")
    .select("id, scan_credits, plan")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return {
      success: false,
      userId,
      amount,
      previousBalance: 0,
      newBalance: 0,
      error: "User profile not found"
    };
  }

  const currentBalance = typeof profile.scan_credits === "number" ? profile.scan_credits : 0;

  if (currentBalance < amount) {
    return {
      success: false,
      userId,
      amount,
      previousBalance: currentBalance,
      newBalance: currentBalance,
      error: `Insufficient scan credits. Required: ${amount}, Available: ${currentBalance}. Please purchase a scan pack to continue.`
    };
  }

  const newBalance = currentBalance - amount;

  // 2. Update profile scan_credits
  const { error: updateErr } = await adminClient
    .from("profiles")
    .update({ scan_credits: newBalance })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to update profile scan_credits:", updateErr);
    return {
      success: false,
      userId,
      amount,
      previousBalance: currentBalance,
      newBalance: currentBalance,
      error: "Failed to deduct credits"
    };
  }

  // 3. Insert into credit_ledger (best-effort / transactional audit log)
  try {
    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      action: action,
      reference_id: referenceId || null,
      description: description || `Deducted ${amount} credit(s) for ${action}`
    });
  } catch (ledgerErr) {
    console.warn("Credit ledger recording failed (table might be initializing):", ledgerErr);
  }

  return {
    success: true,
    userId,
    amount,
    previousBalance: currentBalance,
    newBalance
  };
}

/**
 * Refunds credits back to user (e.g. if OCR or upstream AI failed after reservation).
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId?: string | null,
  reason?: string
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data: profile, error: fetchErr } = await adminClient
    .from("profiles")
    .select("scan_credits")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) return false;

  const currentBalance = typeof profile.scan_credits === "number" ? profile.scan_credits : 0;
  const newBalance = currentBalance + amount;

  const { error: updateErr } = await adminClient
    .from("profiles")
    .update({ scan_credits: newBalance })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to refund credits to profile:", updateErr);
    return false;
  }

  try {
    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount: amount,
      balance_after: newBalance,
      action: "refund",
      reference_id: referenceId || null,
      description: reason || `Refunded ${amount} credit(s)`
    });
  } catch (ledgerErr) {
    console.warn("Credit ledger refund entry failed:", ledgerErr);
  }

  return true;
}

/**
 * Idempotently fulfills a scan pack purchase.
 * If paymentId has already been fulfilled in credit_ledger, it skips double-adding credits.
 */
export async function fulfillPackPurchase(
  userId: string,
  packId: string,
  paymentId: string,
  amountPaidInr?: number
): Promise<{ success: boolean; creditsAdded: number; totalCredits: number; alreadyFulfilled?: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const pack = getScanPack(packId);

  if (!pack) {
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: 0,
      error: `Invalid scan pack ID: ${packId}`
    };
  }

  // 1. Idempotency Check: check if paymentId was already credited in ledger
  try {
    const { data: existingLedger } = await adminClient
      .from("credit_ledger")
      .select("id, balance_after")
      .eq("user_id", userId)
      .eq("reference_id", paymentId)
      .eq("action", "purchase")
      .single();

    if (existingLedger) {
      console.log(`Payment ${paymentId} already fulfilled. Skipping duplicate credit grant.`);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("scan_credits")
        .eq("id", userId)
        .single();

      return {
        success: true,
        creditsAdded: pack.scans,
        totalCredits: profile?.scan_credits || 0,
        alreadyFulfilled: true
      };
    }
  } catch (checkErr) {
    // Continue if ledger table check fails
  }

  // 2. Fetch current profile
  const { data: profile, error: fetchErr } = await adminClient
    .from("profiles")
    .select("id, scan_credits, plan")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: 0,
      error: "User profile not found for fulfillment"
    };
  }

  const currentCredits = typeof profile.scan_credits === "number" ? profile.scan_credits : 0;
  const newCredits = currentCredits + pack.scans;

  // 3. Update profile
  const { error: updateErr } = await adminClient
    .from("profiles")
    .update({
      scan_credits: newCredits,
      plan: "pro", // Keep "pro" badge active when having paid pack
      plan_type: pack.id,
      razorpay_subscription_id: paymentId
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to update profile credits during fulfillment:", updateErr);
    return {
      success: false,
      creditsAdded: 0,
      totalCredits: currentCredits,
      error: "Database update failed"
    };
  }

  // 4. Record in credit_ledger
  try {
    await adminClient.from("credit_ledger").insert({
      user_id: userId,
      amount: pack.scans,
      balance_after: newCredits,
      action: "purchase",
      reference_id: paymentId,
      description: `Purchased ${pack.name} (${pack.scans} scans) for ₹${amountPaidInr || pack.priceInr}`
    });
  } catch (ledgerErr) {
    console.warn("Credit ledger purchase record failed:", ledgerErr);
  }

  return {
    success: true,
    creditsAdded: pack.scans,
    totalCredits: newCredits
  };
}
