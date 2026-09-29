import { createAdminClient } from "./supabase-server";
import { getScanPack, CREDIT_COSTS } from "./plans";

export type CreditAction = 
  | "purchase"
  | "scan"
  | "compare"
  | "meal_compose"
  | "meal_composer"
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
  alreadyFinalized?: boolean;
}

export interface CreditFinalizeResult {
  success: boolean;
  userId: string;
  opId: string;
  newBalance?: number;
  error?: string;
  alreadyFinalized?: boolean;
}

export interface CreditReleaseResult {
  success: boolean;
  userId: string;
  opId: string;
  error?: string;
  alreadyReleased?: boolean;
}

export interface OperationClaimResult {
  success: boolean;
  opId: string;
  status?: "pending" | "processing" | "completed" | "failed" | "accounting_pending";
  claimed?: boolean;
  alreadyCompleted?: boolean;
  accountingPending?: boolean;
  inProgress?: boolean;
  conflict?: boolean;
  result?: any;
  accountingStatus?: string;
  fencingToken?: number;
  error?: string;
  message?: string;
  availableCredits?: number;
}

export interface OperationSaveResult {
  success: boolean;
  newBalance?: number;
  alreadyCompleted?: boolean;
  alreadyFinalized?: boolean;
  error?: string;
  message?: string;
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
 * Retrieves reservation record by user ID and operation ID.
 */
export async function getReservationRecord(userId: string, opId: string): Promise<{
  exists: boolean;
  status?: "reserved" | "finalized" | "released" | "expired";
  amount?: number;
  action?: string;
  expiresAt?: string;
}> {
  if (!userId || !opId) return { exists: false };
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("credit_reservations")
    .select("status, amount, action, expires_at")
    .eq("user_id", userId)
    .eq("op_id", opId)
    .maybeSingle();

  if (error || !data) {
    return { exists: false };
  }

  return {
    exists: true,
    status: data.status,
    amount: data.amount,
    action: data.action,
    expiresAt: data.expires_at
  };
}

/**
 * Atomically reserves credits before executing an AI analysis action.
 * Two-phase transaction: reserve -> finalize (on success) or release (on error).
 * Fails closed immediately on RPC error without non-transactional client-side fallbacks.
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
    const { data: rpcData, error: rpcError } = await adminClient.rpc("reserve_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_action: action,
      p_op_id: stableOpId,
      p_description: desc
    });

    if (rpcError) {
      console.error("reserve_credits RPC error:", rpcError);
      return {
        success: false,
        opId: stableOpId,
        userId,
        amount,
        error: `Database reservation failed: ${rpcError.message || "RPC execution error"}`
      };
    }

    if (!rpcData || !rpcData.success) {
      const errMsg = rpcData?.error === "INSUFFICIENT_CREDITS"
        ? `Insufficient scan credits. Required: ${amount}, Available: ${rpcData.available_credits ?? 0}. Please refill your scan pack.`
        : (rpcData?.message || rpcData?.error || "Credit reservation failed");

      return {
        success: false,
        opId: stableOpId,
        userId,
        amount,
        error: errMsg
      };
    }

    return {
      success: true,
      opId: stableOpId,
      userId,
      amount,
      availableCreditsAfter: rpcData.available_credits_after,
      alreadyReserved: rpcData.already_reserved,
      alreadyFinalized: rpcData.already_finalized
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
 * Uses the reservation's stored amount, user, and action; never assumes 1 credit.
 */
export async function finalizeReservation(
  userId: string,
  opId: string
): Promise<CreditFinalizeResult> {
  if (!userId || !opId) {
    return {
      success: false,
      userId,
      opId,
      error: "User ID and Operation ID are required for finalization"
    };
  }

  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("finalize_reservation", {
      p_user_id: userId,
      p_op_id: opId
    });

    if (rpcError) {
      console.error("finalize_reservation RPC error:", rpcError);
      return {
        success: false,
        userId,
        opId,
        error: `Database finalization error: ${rpcError.message}`
      };
    }

    if (!rpcData || !rpcData.success) {
      return {
        success: false,
        userId,
        opId,
        error: rpcData?.message || rpcData?.error || "Failed to finalize credit deduction"
      };
    }

    return {
      success: true,
      userId,
      opId,
      newBalance: rpcData.new_balance,
      alreadyFinalized: rpcData.already_finalized
    };
  } catch (err: any) {
    console.error("Credit finalization exception:", err);
    return {
      success: false,
      userId,
      opId,
      error: err.message || "Finalize error"
    };
  }
}

/**
 * Releases a reserved credit deduction back to the user if the scan/AI process fails.
 * Returns strict failure if database release cannot be confirmed.
 */
export async function releaseReservation(
  userId: string,
  opId: string,
  reason: string = "Scan processing error"
): Promise<CreditReleaseResult> {
  if (!userId || !opId) {
    return {
      success: false,
      userId,
      opId,
      error: "User ID and Operation ID are required for release"
    };
  }

  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("release_reservation", {
      p_user_id: userId,
      p_op_id: opId,
      p_reason: reason
    });

    if (rpcError) {
      console.error("release_reservation RPC error:", rpcError);
      return {
        success: false,
        userId,
        opId,
        error: `Database release error: ${rpcError.message}`
      };
    }

    if (!rpcData || !rpcData.success) {
      return {
        success: false,
        userId,
        opId,
        error: rpcData?.error || "Failed to release reservation"
      };
    }

    return {
      success: true,
      userId,
      opId,
      alreadyReleased: rpcData.already_released
    };
  } catch (err: any) {
    console.error("Credit release exception:", err);
    return {
      success: false,
      userId,
      opId,
      error: err.message || "Failed to release reservation."
    };
  }
}

/**
 * Atomically claims an operation lease before running expensive AI/OCR/Network work.
 * Enforces payload hash binding (returns conflict on mismatch) and single worker execution.
 */
export async function claimOperation(
  userId: string,
  opId: string,
  action: CreditAction,
  creditCost: number,
  payloadHash: string,
  workerId: string,
  leaseSeconds: number = 120
): Promise<OperationClaimResult> {
  const adminClient = createAdminClient();
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("claim_operation", {
      p_user_id: userId,
      p_op_id: opId,
      p_action: action,
      p_credit_cost: creditCost,
      p_payload_hash: payloadHash,
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds
    });

    if (rpcError) {
      console.error("claim_operation RPC error:", rpcError);
      return {
        success: false,
        opId,
        error: "CLAIM_RPC_ERROR",
        message: rpcError.message
      };
    }

    if (!rpcData || !rpcData.success) {
      return {
        success: false,
        opId,
        error: rpcData?.error || "OPERATION_CLAIM_FAILED",
        conflict: rpcData?.error === "IDEMPOTENCY_CONFLICT",
        message: rpcData?.message || rpcData?.error || "Failed to claim operation",
        availableCredits: rpcData?.available_credits
      };
    }

    return {
      success: true,
      opId,
      status: rpcData.status,
      claimed: rpcData.claimed,
      alreadyCompleted: rpcData.already_completed,
      accountingPending: rpcData.accounting_pending,
      result: rpcData.result,
      accountingStatus: rpcData.accounting_status,
      fencingToken: rpcData.fencing_token
    };
  } catch (err: any) {
    console.error("claimOperation exception:", err);
    return {
      success: false,
      opId,
      error: "CLAIM_EXCEPTION",
      message: err.message || "Failed to claim operation"
    };
  }
}

/**
 * Atomically stores durable operation result and finalizes credit accounting.
 */
export async function saveOperationResultAndFinalize(
  userId: string,
  opId: string,
  workerId: string,
  result: any,
  fencingToken?: number | null
): Promise<OperationSaveResult> {
  if (!workerId || typeof fencingToken !== "number") {
    return {
      success: false,
      error: "INVALID_WORKER_PARAMS",
      message: "Worker ID and fencing token are strictly required for operation finalization."
    };
  }

  const adminClient = createAdminClient();
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("save_operation_result_and_finalize", {
      p_user_id: userId,
      p_op_id: opId,
      p_worker_id: workerId,
      p_result: result,
      p_fencing_token: fencingToken
    });

    if (rpcError) {
      console.error("save_operation_result_and_finalize RPC error:", rpcError);
      return {
        success: false,
        error: "SAVE_RPC_ERROR",
        message: rpcError.message
      };
    }

    if (!rpcData || !rpcData.success) {
      return {
        success: false,
        error: rpcData?.error || "SAVE_FINALIZATION_FAILED",
        message: rpcData?.message || rpcData?.error || "Failed to save result and finalize accounting"
      };
    }

    return {
      success: true,
      newBalance: rpcData.new_balance,
      alreadyCompleted: rpcData.already_completed,
      alreadyFinalized: rpcData.already_finalized
    };
  } catch (err: any) {
    console.error("saveOperationResultAndFinalize exception:", err);
    return {
      success: false,
      error: "SAVE_EXCEPTION",
      message: err.message || "Failed to save operation result"
    };
  }
}

/**
 * Releases worker lease and operation reservation on processing failure.
 */
export async function releaseOperationOnFailure(
  userId: string,
  opId: string,
  workerId: string,
  errorMessage?: string,
  fencingToken?: number | null
): Promise<boolean> {
  if (!workerId || typeof fencingToken !== "number") {
    console.error("releaseOperationOnFailure: worker and sequence parameters required");
    return false;
  }

  const adminClient = createAdminClient();
  const finalError = errorMessage || "Operation failed";
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("release_operation_on_failure", {
      p_user_id: userId,
      p_op_id: opId,
      p_worker_id: workerId,
      p_error_message: finalError,
      p_fencing_token: fencingToken
    });

    if (rpcError || !rpcData || !rpcData.success) {
      console.error("release_operation_on_failure error:", rpcError || rpcData);
      return false;
    }

    return true;
  } catch (err) {
    console.error("releaseOperationOnFailure exception:", err);
    return false;
  }
}

/**
 * Recovers pending credit finalization for a durable saved result without rerunning AI.
 */
export async function recoverOperationAccounting(
  userId: string,
  opId: string
): Promise<{ success: boolean; newBalance?: number; result?: any; error?: string }> {
  const adminClient = createAdminClient();
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("recover_operation_accounting", {
      p_user_id: userId,
      p_op_id: opId
    });

    if (rpcError || !rpcData || !rpcData.success) {
      return {
        success: false,
        error: rpcError?.message || rpcData?.error || "Accounting recovery failed"
      };
    }

    return {
      success: true,
      newBalance: rpcData.new_balance,
      result: rpcData.result
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Accounting recovery exception"
    };
  }
}

/**
 * Wrapper for direct single-step deduction when two-phase is not needed.
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
  if (!fin.success) {
    return {
      success: false,
      userId,
      amount,
      previousBalance: 0,
      newBalance: 0,
      error: fin.error
    };
  }

  return {
    success: true,
    userId,
    amount,
    previousBalance: (fin.newBalance ?? 0) + amount,
    newBalance: fin.newBalance ?? 0
  };
}

/**
 * Refunds credits back to user profile and logs audit entry in credit_ledger atomically via RPC.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId?: string | null,
  reason?: string
): Promise<boolean> {
  if (amount <= 0 || !userId) return false;
  const adminClient = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("refund_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_reference_id: referenceId || `refund_${Date.now()}`,
      p_reason: reason || `Refunded ${amount} credit(s)`
    });

    if (rpcError || !rpcData || !rpcData.success) {
      console.error("refund_credits RPC error:", rpcError || rpcData);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Credit refund failed:", err);
    return false;
  }
}

/**
 * Idempotently fulfills a scan pack purchase via atomic database transaction RPC.
 * Fails closed immediately without non-transactional direct fallbacks.
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
    const { data: rpcData, error: rpcError } = await adminClient.rpc("fulfill_purchase", {
      p_user_id: userId,
      p_pack_id: pack.id,
      p_amount_credits: pack.scans,
      p_reference_id: paymentId,
      p_amount_paid_inr: amountPaidInr || pack.priceInr,
      p_description: `Purchased ${pack.name} (${pack.scans} scans) for ₹${amountPaidInr || pack.priceInr}`
    });

    if (rpcError) {
      console.error("fulfill_purchase RPC error:", rpcError);
      return {
        success: false,
        creditsAdded: 0,
        totalCredits: 0,
        error: `Database fulfillment error: ${rpcError.message}`
      };
    }

    if (!rpcData || !rpcData.success) {
      return {
        success: false,
        creditsAdded: 0,
        totalCredits: 0,
        error: rpcData?.error || "Fulfillment transaction failed"
      };
    }

    return {
      success: true,
      creditsAdded: rpcData.credits_added || pack.scans,
      totalCredits: rpcData.total_credits,
      alreadyFulfilled: rpcData.already_fulfilled
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

/**
 * Atomically fulfills an order from Razorpay webhook in a single PostgreSQL transaction.
 * Updates payment_orders status to 'fulfilled', credits profile scan_credits, and records ledger entry.
 */
export async function fulfillOrderPayment(
  orderId: string,
  providerPaymentId: string | null,
  creditsToGrant: number,
  packId: string,
  description: string
): Promise<{ success: boolean; totalCredits?: number; creditsAdded?: number; error?: string; alreadyFulfilled?: boolean }> {
  const adminClient = createAdminClient();
  try {
    const { data: rpcData, error: rpcError } = await adminClient.rpc("fulfill_order_payment", {
      p_order_id: orderId,
      p_payment_id: providerPaymentId,
      p_credits_to_grant: creditsToGrant,
      p_pack_id: packId,
      p_description: description
    });

    if (rpcError) {
      console.error("fulfill_order_payment RPC error:", rpcError);
      return { success: false, error: rpcError.message };
    }

    if (!rpcData || !rpcData.success) {
      return { success: false, error: rpcData?.error || "Order fulfillment failed" };
    }

    return {
      success: true,
      creditsAdded: rpcData.credits_added || creditsToGrant,
      totalCredits: rpcData.total_credits,
      alreadyFulfilled: !!rpcData.already_fulfilled
    };
  } catch (err: any) {
    console.error("fulfillOrderPayment error:", err);
    return { success: false, error: err.message || "Order fulfillment exception" };
  }
}
