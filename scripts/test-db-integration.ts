/**
 * [SIMULATOR ONLY] IN-MEMORY DATABASE & OPERATIONS LOGIC SIMULATOR
 * 
 * NOTE: This is an in-memory test simulator of row-lock state invariants.
 * It verifies logical algorithms and state machines; it does NOT connect to
 * or verify actual PostgreSQL or Supabase.
 * Real PostgreSQL integration tests are located in `scripts/test-postgres-integration.ts`.
 */

console.log("==================================================");
console.log("🔬 [SIMULATOR ONLY] IN-MEMORY OPERATIONS INVARIANTS");
console.log("⚠️  NOTICE: Simulates logic in memory; does NOT verify PostgreSQL");
console.log("==================================================");

// 1. Transactional Database Simulator Modeling PostgreSQL Row Locks & Invariants
class TransactionalEngine {
  profiles = new Map<string, { scan_credits: number; is_admin?: boolean }>();
  operations = new Map<string, {
    userId: string;
    opId: string;
    action: string;
    creditCost: number;
    payloadHash: string;
    status: "processing" | "completed" | "accounting_pending" | "failed";
    workerId: string;
    leaseExpiresAt: number;
    result?: any;
    accountingStatus: string;
  }>();
  reservations = new Map<string, {
    userId: string;
    opId: string;
    amount: number;
    status: "reserved" | "finalized" | "released" | "expired";
    expiresAt: number;
  }>();
  ledger: Array<{
    userId: string;
    amount: number;
    balanceAfter: number;
    action: string;
    referenceId: string;
  }> = [];

  constructor(initialUserId: string, initialBalance: number) {
    this.profiles.set(initialUserId, { scan_credits: initialBalance });
  }

  // RPC: claim_operation
  claimOperation(
    userId: string,
    opId: string,
    action: string,
    creditCost: number,
    payloadHash: string,
    workerId: string,
    leaseSeconds = 120
  ): { success: boolean; error?: string; status?: string; result?: any; alreadyCompleted?: boolean; accountingPending?: boolean } {
    const profile = this.profiles.get(userId);
    if (!profile) return { success: false, error: "USER_NOT_FOUND" };

    const key = `${userId}:${opId}`;
    const existing = this.operations.get(key);
    const now = Date.now();
    const leaseExpiry = now + (leaseSeconds * 1000);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        return { success: false, error: "IDEMPOTENCY_CONFLICT" };
      }
      if (existing.status === "completed") {
        return { success: true, status: "completed", alreadyCompleted: true, result: existing.result };
      }
      if (existing.status === "accounting_pending") {
        return { success: true, status: "accounting_pending", accountingPending: true, result: existing.result };
      }
      if (existing.status === "processing") {
        if (existing.leaseExpiresAt > now && existing.workerId !== workerId) {
          return { success: false, error: "OPERATION_IN_PROGRESS" };
        }
        existing.workerId = workerId;
        existing.leaseExpiresAt = leaseExpiry;
        return { success: true, status: "processing" };
      }
    }

    // Check available balance
    let activeReserved = 0;
    for (const [resKey, res] of Array.from(this.reservations.entries())) {
      if (res.userId === userId && res.status === "reserved" && res.expiresAt > now && res.opId !== opId) {
        activeReserved += res.amount;
      }
    }

    const available = profile.scan_credits - activeReserved;
    if (available < creditCost) {
      return { success: false, error: "INSUFFICIENT_CREDITS" };
    }

    if (creditCost > 0) {
      this.reservations.set(key, {
        userId,
        opId,
        amount: creditCost,
        status: "reserved",
        expiresAt: now + 300000
      });
    }

    this.operations.set(key, {
      userId,
      opId,
      action,
      creditCost,
      payloadHash,
      status: "processing",
      workerId,
      leaseExpiresAt: leaseExpiry,
      accountingStatus: creditCost > 0 ? "reserved" : "none"
    });

    return { success: true, status: "processing" };
  }

  // RPC: save_operation_result_and_finalize
  saveOperationResultAndFinalize(
    userId: string,
    opId: string,
    workerId: string,
    result: any
  ): { success: boolean; newBalance?: number; error?: string } {
    const profile = this.profiles.get(userId);
    if (!profile) return { success: false, error: "USER_NOT_FOUND" };

    const key = `${userId}:${opId}`;
    const op = this.operations.get(key);
    if (!op) return { success: false, error: "OPERATION_NOT_FOUND" };

    const now = Date.now();
    if (op.workerId !== workerId && op.leaseExpiresAt > now) {
      return { success: false, error: "STALE_WORKER_REJECTED" };
    }

    if (op.status === "completed") {
      return { success: true, newBalance: profile.scan_credits };
    }

    // Save durable result
    op.result = result;
    op.status = "accounting_pending";

    if (op.creditCost === 0) {
      op.status = "completed";
      op.accountingStatus = "finalized";
      return { success: true, newBalance: profile.scan_credits };
    }

    const res = this.reservations.get(key);
    if (!res) return { success: false, error: "RESERVATION_NOT_FOUND" };

    if (res.status === "finalized") {
      op.status = "completed";
      op.accountingStatus = "finalized";
      return { success: true, newBalance: profile.scan_credits };
    }

    const isActive = res.status === "reserved" && res.expiresAt > now;
    if (isActive) {
      if (profile.scan_credits < res.amount) {
        return { success: false, error: "INSUFFICIENT_CREDITS" };
      }
    } else {
      // Protect other active reservations
      let otherActive = 0;
      for (const [rKey, r] of Array.from(this.reservations.entries())) {
        if (rKey !== key && r.userId === userId && r.status === "reserved" && r.expiresAt > now) {
          otherActive += r.amount;
        }
      }
      if (profile.scan_credits - otherActive < res.amount) {
        return { success: false, error: "INSUFFICIENT_CREDITS" };
      }
    }

    profile.scan_credits -= res.amount;
    this.ledger.push({
      userId,
      amount: -res.amount,
      balanceAfter: profile.scan_credits,
      action: op.action,
      referenceId: opId
    });

    res.status = "finalized";
    op.status = "completed";
    op.accountingStatus = "finalized";

    return { success: true, newBalance: profile.scan_credits };
  }

  // RPC: recover_operation_accounting
  recoverOperationAccounting(userId: string, opId: string): { success: boolean; newBalance?: number; error?: string } {
    const key = `${userId}:${opId}`;
    const op = this.operations.get(key);
    if (!op || op.status !== "accounting_pending") {
      return { success: false, error: "NO_PENDING_ACCOUNTING" };
    }
    return this.saveOperationResultAndFinalize(userId, opId, op.workerId, op.result);
  }
}

// -------------------------------------------------------------
// Test 1: Full Operations Table Lifecycle & Finalization
// -------------------------------------------------------------
console.log("\n--- Test 1: Full Operations Table Lifecycle ---");
const engine = new TransactionalEngine("user_123", 5);

const claim1 = engine.claimOperation(
  "user_123",
  "op_scan_abc",
  "scan",
  1,
  "hash_payload_1",
  "worker_1",
  120
);
console.log("Claim 1 result:", claim1);

const save1 = engine.saveOperationResultAndFinalize(
  "user_123",
  "op_scan_abc",
  "worker_1",
  { product_name: "Oat Milk", health_score: 90 }
);
console.log("Save 1 result:", save1);

const claimRetry = engine.claimOperation(
  "user_123",
  "op_scan_abc",
  "scan",
  1,
  "hash_payload_1",
  "worker_2",
  120
);
console.log("Retry Claim result (idempotent completed):", claimRetry);

if (claim1.success && save1.success && save1.newBalance === 4 && claimRetry.alreadyCompleted) {
  console.log("✅ Test 1 Passed: Complete operations claiming, result persistence, credit debit, and idempotent retry.");
} else {
  console.error("❌ Test 1 Failed!");
  process.exit(1);
}

// -------------------------------------------------------------
// Test 2: Conflict Detection on Payload Hash Mismatch
// -------------------------------------------------------------
console.log("\n--- Test 2: Payload Hash Conflict Detection (409) ---");
const conflictClaim = engine.claimOperation(
  "user_123",
  "op_scan_abc", // Same op_id
  "scan",
  1,
  "different_payload_hash", // Mismatched hash
  "worker_3",
  120
);
console.log("Conflict claim result:", conflictClaim);

if (!conflictClaim.success && conflictClaim.error === "IDEMPOTENCY_CONFLICT") {
  console.log("✅ Test 2 Passed: Payload hash mismatch returns IDEMPOTENCY_CONFLICT (HTTP 409).");
} else {
  console.error("❌ Test 2 Failed!");
  process.exit(1);
}

// -------------------------------------------------------------
// Test 3: Expired Hold Isolation
// -------------------------------------------------------------
console.log("\n--- Test 3: Expired Hold Isolation & Available Balance Protection ---");
const holdEngine = new TransactionalEngine("user_456", 2);

// Op A reserves 1 credit
holdEngine.claimOperation("user_456", "op_A", "scan", 1, "hash_A", "worker_A", 120);

// Expire Op A hold
holdEngine.reservations.get("user_456:op_A")!.expiresAt = Date.now() - 1000;

// Op B reserves 1 credit (active hold) -> remaining available = 2 - 1 = 1
const claimB = holdEngine.claimOperation("user_456", "op_B", "scan", 1, "hash_B", "worker_B", 120);

// Op C tries to reserve 2 credits -> fails (only 1 available)
const claimC = holdEngine.claimOperation("user_456", "op_C", "compare", 2, "hash_C", "worker_C", 120);

// Op A (which expired) requests 2 credits finalization -> rejected
holdEngine.operations.get("user_456:op_A")!.creditCost = 2;
holdEngine.reservations.get("user_456:op_A")!.amount = 2;
const finalizeExpiredA = holdEngine.saveOperationResultAndFinalize("user_456", "op_A", "worker_A", { test: true });

console.log("Claim B (active hold):", claimB.success);
console.log("Claim C (exceeds available):", claimC.success, claimC.error);
console.log("Finalize Expired A (protects Op B):", finalizeExpiredA.success, finalizeExpiredA.error);

if (claimB.success && !claimC.success && !finalizeExpiredA.success && finalizeExpiredA.error === "INSUFFICIENT_CREDITS") {
  console.log("✅ Test 3 Passed: Active reservations are protected from expired hold encroachment.");
} else {
  console.error("❌ Test 3 Failed!");
  process.exit(1);
}

console.log("\n==================================================");
console.log("🎉 ALL IN-MEMORY SIMULATOR TESTS PASSED!");
console.log("⚠️  NOTICE: This verified in-memory logic only; PostgreSQL integration suite is in scripts/test-postgres-integration.ts");
console.log("==================================================");
