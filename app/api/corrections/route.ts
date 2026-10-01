import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const SubmitCorrectionSchema = z.object({
  barcode: z.string().trim().min(1).max(50),
  field_name: z.enum(["ingredients", "nutrition_facts", "brand", "product_name", "allergens_declared"]),
  original_value: z.any().optional().nullable(),
  corrected_value: z.any(),
  notes: z.string().trim().max(1000).optional().nullable()
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to submit a product label correction."
      }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = SubmitCorrectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.format() }, { status: 400 });
    }

    const { barcode, field_name, original_value, corrected_value, notes } = parsed.data;

    // Validate nutrition_facts unit & basis integrity if correcting nutrition
    if (field_name === "nutrition_facts" && typeof corrected_value === "object" && corrected_value !== null) {
      const basis = corrected_value.basis || "per_100g";
      if (basis !== "per_100g" && basis !== "per_100ml" && basis !== "per_serving") {
        return NextResponse.json({
          error: "INVALID_NUTRITION_BASIS",
          message: "Nutrition basis must be 'per_100g', 'per_100ml', or 'per_serving'."
        }, { status: 400 });
      }
    }

    // Save correction into product_corrections table with ownership and status 'pending'
    // Shared product record is NEVER silently overwritten!
    const { data: correction, error: insertError } = await supabase
      .from("product_corrections")
      .insert({
        barcode,
        user_id: user.id,
        field_name,
        original_value: original_value ?? null,
        corrected_value,
        provenance: "user_submission",
        status: "pending",
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert correction:", insertError);
      return NextResponse.json({
        error: "DATABASE_ERROR",
        message: "Could not save correction. Please try again later."
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      correction,
      message: "Label correction submitted for editorial review. Master catalog records remain immutable until reviewed."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to view your submitted corrections."
      }, { status: 401 });
    }

    const { data: corrections, error } = await supabase
      .from("product_corrections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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
