import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const SaveProductSchema = z.object({
  barcode: z.string().trim().max(50).nullable().optional(),
  product_name: z.string().trim().min(1).max(255),
  brand: z.string().trim().max(255).nullable().optional(),
  pack_size: z.string().trim().max(100).nullable().optional(),
  result_json: z.record(z.string(), z.any()).or(z.any())
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to view your saved products."
      }, { status: 401 });
    }

    const { data: items, error } = await supabase
      .from("saved_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback to favorites table if saved_products migration not yet applied
      const { data: favs, error: favErr } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (favErr) {
        return NextResponse.json({ error: "DATABASE_ERROR", message: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        items: favs || []
      });
    }

    return NextResponse.json({
      success: true,
      items: items || []
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
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to save products to your shopping list."
      }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = SaveProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.format() }, { status: 400 });
    }

    const { barcode, product_name, brand, pack_size, result_json } = parsed.data;

    // Zero credits cost: saving is free for authenticated users
    const { data, error } = await supabase
      .from("saved_products")
      .insert({
        user_id: user.id,
        barcode: barcode || null,
        product_name,
        brand: brand || null,
        pack_size: pack_size || null,
        result_json
      })
      .select()
      .single();

    if (error) {
      // Fallback to favorites table if saved_products table is unavailable
      const { data: favData, error: favErr } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          barcode: barcode || null,
          product_name,
          result_json
        })
        .select()
        .single();

      if (favErr) {
        return NextResponse.json({ error: "DATABASE_ERROR", message: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        savedItem: favData,
        message: "Product saved to your shopping list (0 credits spent)."
      });
    }

    return NextResponse.json({
      success: true,
      savedItem: data,
      message: "Product saved to your shopping list (0 credits spent)."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to manage your saved products."
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Product ID is required." }, { status: 400 });
    }

    // Try deleting from saved_products
    const { error: spErr } = await supabase
      .from("saved_products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    // Also attempt deleting from favorites for compatibility
    await supabase
      .from("favorites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Product removed from your shopping list."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}
