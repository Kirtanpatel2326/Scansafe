import { createClient, createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const ReviewActionSchema = z.object({
  correction_id: z.string().uuid(),
  action: z.enum(["approve", "reject", "rollback"]),
  review_notes: z.string().trim().max(1000).optional().nullable(),
  target_version: z.number().int().positive().optional()
});

async function checkReviewerAccess(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_reviewer")
    .eq("id", userId)
    .single();

  return !!(profile?.is_reviewer === true || profile?.role === "admin" || profile?.role === "reviewer");
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const isAuthorized = await checkReviewerAccess(supabase, user.id);
    if (!isAuthorized) {
      return NextResponse.json({
        error: "FORBIDDEN",
        message: "Access restricted to authorized reviewers and administrators."
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Fetch corrections with user provenance
    const { data: corrections, error } = await supabase
      .from("product_corrections")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "DATABASE_ERROR", message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      corrections: corrections || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const isAuthorized = await checkReviewerAccess(supabase, user.id);
    if (!isAuthorized) {
      return NextResponse.json({
        error: "FORBIDDEN",
        message: "Access restricted to authorized reviewers and administrators."
      }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = ReviewActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.format() }, { status: 400 });
    }

    const { correction_id, action, review_notes, target_version } = parsed.data;
    const adminClient = createAdminClient();

    // 1. Fetch the pending correction
    const { data: correction, error: fetchErr } = await adminClient
      .from("product_corrections")
      .select("*")
      .eq("id", correction_id)
      .single();

    if (fetchErr || !correction) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Correction not found." }, { status: 404 });
    }

    const now = new Date().toISOString();

    // ACTION: REJECT
    if (action === "reject") {
      await adminClient
        .from("product_corrections")
        .update({
          status: "rejected",
          reviewer_id: user.id,
          review_notes: review_notes || null,
          reviewed_at: now
        })
        .eq("id", correction_id);

      return NextResponse.json({
        success: true,
        message: "Correction rejected."
      });
    }

    // ACTION: ROLLBACK
    if (action === "rollback") {
      if (!target_version) {
        return NextResponse.json({ error: "MISSING_VERSION", message: "target_version required for rollback." }, { status: 400 });
      }

      const { data: snapshotRecord, error: snapErr } = await adminClient
        .from("product_versions")
        .select("*")
        .eq("barcode", correction.barcode)
        .eq("version", target_version)
        .single();

      if (snapErr || !snapshotRecord) {
        return NextResponse.json({ error: "VERSION_NOT_FOUND", message: `Version ${target_version} not found.` }, { status: 404 });
      }

      // Restore product record to previous snapshot
      await adminClient
        .from("products_cache")
        .update({
          raw_data: snapshotRecord.snapshot,
          review_status: "reviewed",
          last_reviewed_at: now,
          reviewer_id: user.id
        })
        .eq("barcode", correction.barcode);

      return NextResponse.json({
        success: true,
        message: `Rolled back product ${correction.barcode} to version ${target_version}.`
      });
    }

    // ACTION: APPROVE
    if (action === "approve") {
      // 1. Fetch current product record
      const { data: currentProduct } = await adminClient
        .from("products_cache")
        .select("*")
        .eq("barcode", correction.barcode)
        .maybeSingle();

      const currentVersion = currentProduct?.version || 1;
      const nextVersion = currentVersion + 1;

      // 2. Save immutable snapshot of current product before applying update
      if (currentProduct && currentProduct.raw_data) {
        await adminClient
          .from("product_versions")
          .upsert({
            barcode: correction.barcode,
            version: currentVersion,
            snapshot: currentProduct.raw_data,
            created_by: user.id,
            reason: `Pre-update snapshot prior to applying correction ${correction.id}`
          }, { onConflict: "barcode,version" });
      }

      // 3. Update raw_data with corrected field (NEVER including user-specific preferences or PII)
      const updatedRawData = currentProduct?.raw_data ? { ...currentProduct.raw_data } : {};
      updatedRawData[correction.field_name] = correction.corrected_value;

      await adminClient
        .from("products_cache")
        .update({
          raw_data: updatedRawData,
          version: nextVersion,
          review_status: "reviewed",
          last_reviewed_at: now,
          reviewer_id: user.id
        })
        .eq("barcode", correction.barcode);

      // 4. Mark correction approved
      await adminClient
        .from("product_corrections")
        .update({
          status: "approved",
          reviewer_id: user.id,
          review_notes: review_notes || null,
          reviewed_at: now
        })
        .eq("id", correction_id);

      return NextResponse.json({
        success: true,
        new_version: nextVersion,
        message: `Correction approved. Created immutable version ${currentVersion} snapshot and published version ${nextVersion} with review status 'reviewed'.`
      });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}
