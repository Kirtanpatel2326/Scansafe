import { createClient } from "@/lib/supabase-server";
import { analyzeLabel, enrichIngredientsText, applyPreferences, SAMPLE_PRODUCTS, IngredientAnalysis } from "@/lib/claude";
import { checkAndDeductCredits, refundCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";

export const maxDuration = 60; // Prevent Vercel execution timeouts

const AnalyzePayloadSchema = z.object({
  barcode: z.string().trim().max(50).nullable().optional(),
  image: z.string()
    .max(10 * 1024 * 1024, "Image payload too large (max 10MB base64)")
    .refine(val => !val || val.startsWith("data:image/") || val.length > 50, {
      message: "Invalid file type. Only image data URLs are allowed."
    })
    .nullable()
    .optional(),
  preferences: z.array(z.string().max(100)).nullable().optional(),
  isDemo: z.boolean().nullable().optional(),
  isSample: z.boolean().nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  productName: z.string().max(255).nullable().optional()
}).refine(data => !!data.barcode || !!data.image || !!data.isDemo || !!data.isSample || !!data.productName, {
  message: "Either barcode, image, productName, isDemo, or isSample must be provided"
});

// In-memory rate limiter per IP
const globalLimiter = globalThis as unknown as {
  ipRequestCounts?: Map<string, { count: number; resetAt: number }>
};

if (!globalLimiter.ipRequestCounts) {
  globalLimiter.ipRequestCounts = new Map();
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindowMs = 60 * 1000;
  const maxRequests = 15;

  if (globalLimiter.ipRequestCounts!.size > 1000) {
    for (const [key, val] of Array.from(globalLimiter.ipRequestCounts!.entries())) {
      if (now > val.resetAt) globalLimiter.ipRequestCounts!.delete(key);
    }
  }

  const record = globalLimiter.ipRequestCounts!.get(ip);
  if (!record || now > record.resetAt) {
    globalLimiter.ipRequestCounts!.set(ip, { count: 1, resetAt: now + limitWindowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: Request) {
  let reservedCredit = false;
  let currentUserId: string | null = null;

  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please wait a minute before trying again."
      }, { status: 429 });
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsedBody = AnalyzePayloadSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({
        error: "Invalid request payload",
        details: parsedBody.error.format()
      }, { status: 400 });
    }

    const { barcode, image, preferences, isDemo, isSample, filename, productName } = parsedBody.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isLoggedIn = !!user;
    if (isLoggedIn && user) {
      currentUserId = user.id;
    }

    // 1. SAMPLE / DEMO MODE (0 credits cost, no DB pollution)
    if (isDemo || isSample) {
      const sampleKey = (productName && productName.toLowerCase().includes("oat")) ? "sample_oats" : "sample_cookies";
      const baseSample = SAMPLE_PRODUCTS[sampleKey] || SAMPLE_PRODUCTS.sample_cookies;
      const finalPrefs = preferences || [];
      const sampleAnalysis = applyPreferences(baseSample, finalPrefs);
      sampleAnalysis.is_sample = true;

      return NextResponse.json({
        success: true,
        analysis: sampleAnalysis,
        scanId: "sample_demo_id",
        source: "sample_demo",
        is_sample: true
      });
    }

    // 2. AUTHENTICATION & CREDITS REQUIREMENT
    if (!isLoggedIn || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to scan food products. You can test our interactive Sample Mode without signing in."
      }, { status: 401 });
    }

    // 3. ATOMIC CREDIT DEDUCTION (1 Credit per single scan)
    const deduction = await checkAndDeductCredits(
      user.id,
      CREDIT_COSTS.SCAN,
      "scan",
      null,
      `Food label scan: ${productName || filename || barcode || "Image Scan"}`
    );

    if (!deduction.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: deduction.error || "You do not have enough scan credits. Please purchase a scan pack to continue.",
        availableCredits: deduction.previousBalance
      }, { status: 403 });
    }

    reservedCredit = true;

    // Fetch user dietary preferences from profile if not passed in body
    let finalPrefs = preferences || [];
    if (!preferences || preferences.length === 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("dietary_profile")
        .eq("id", user.id)
        .single();
      if (profile?.dietary_profile?.allergies) {
        finalPrefs = profile.dietary_profile.allergies;
      }
    }

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";

    // 4. BARCODE LOOKUP (CACHE OR OPEN FOOD FACTS)
    if (barcode) {
      // A. Local cache lookup
      const { data: cachedProduct } = await supabase
        .from("products_cache")
        .select("*")
        .eq("barcode", barcode)
        .single();

      if (cachedProduct && cachedProduct.raw_data) {
        // Cache contains neutral raw facts; apply preferences & localization dynamically
        const analysis = applyPreferences(cachedProduct.raw_data, finalPrefs);

        let scanId = "";
        const { data: scanData } = await supabase
          .from("scans")
          .insert({
            user_id: user.id,
            product_name: analysis.product_name || "Unknown Product",
            barcode: barcode,
            health_score: analysis.health_score || 0,
            safety_level: analysis.safety_level || "moderate",
            result_json: analysis
          })
          .select()
          .single();
        scanId = scanData?.id || "";

        return NextResponse.json({
          success: true,
          analysis,
          scanId,
          source: "cache",
          remainingCredits: deduction.newBalance
        });
      }

      // B. Open Food Facts lookup
      try {
        const offRes = await axios.get(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`, {
          headers: { "User-Agent": "ScanSafe - Web - Version 2.0" },
          timeout: 8000
        });

        const productData = offRes.data?.product;
        if (productData && (productData.ingredients_text || productData.ingredients_text_en)) {
          const rawName = productData.product_name || productData.product_name_en || "Unknown Product";
          const rawBrand = productData.brands || "Unknown Brand";
          const rawIngredients = productData.ingredients_text || productData.ingredients_text_en;
          const rawNutriments = productData.nutriments || {};

          // AI text parsing & enrichment
          const rawEnriched = await enrichIngredientsText(
            rawIngredients,
            rawName,
            rawBrand,
            rawNutriments,
            [], // extract neutral facts for cache
            "en"
          );

          const rawImage = productData.image_url || productData.image_front_url || productData.image_front_small_url || null;
          if (rawImage) {
            rawEnriched.image_url = rawImage;
          }

          // Cache neutral facts
          await supabase
            .from("products_cache")
            .upsert({
              barcode: barcode,
              product_name: rawName,
              brand: rawBrand,
              raw_data: rawEnriched
            });

          // Apply user preferences on top
          const personalizedAnalysis = applyPreferences(rawEnriched, finalPrefs);

          // Save to user scan history
          const { data: scanData } = await supabase
            .from("scans")
            .insert({
              user_id: user.id,
              product_name: personalizedAnalysis.product_name || rawName,
              barcode: barcode,
              health_score: personalizedAnalysis.health_score || 0,
              safety_level: personalizedAnalysis.safety_level || "moderate",
              result_json: personalizedAnalysis
            })
            .select()
            .single();

          return NextResponse.json({
            success: true,
            analysis: personalizedAnalysis,
            scanId: scanData?.id || "",
            source: "open_food_facts",
            remainingCredits: deduction.newBalance
          });
        }
      } catch (offErr: any) {
        console.warn("Open Food Facts lookup failed:", offErr.message);
      }

      if (!image) {
        // Barcode not found and no image uploaded; refund the 1 reserved credit
        await refundCredits(user.id, CREDIT_COSTS.SCAN, null, "Barcode not found in catalog");
        return NextResponse.json({
          success: false,
          errorType: "BARCODE_NOT_FOUND",
          message: "Product not found in Open Food Facts database. Please snap a photo of the ingredients list so our AI Vision can scan it directly."
        });
      }
    }

    // 5. IMAGE OCR SCAN VIA GEMINI VISION
    if (!image) {
      await refundCredits(user.id, CREDIT_COSTS.SCAN, null, "No image or barcode provided");
      return NextResponse.json({ error: "Image or barcode is required for analysis" }, { status: 400 });
    }

    const analysis = await analyzeLabel(
      image,
      finalPrefs,
      filename || "",
      productName || "",
      preferredLanguage
    );

    if (image) {
      analysis.image_url = image;
    }

    // Save scan to user history
    let scanId = "";
    const { data: scanData, error: scanInsertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        product_name: analysis.product_name || "Unknown Product",
        health_score: analysis.health_score || 0,
        safety_level: analysis.safety_level || "moderate",
        result_json: analysis
      })
      .select()
      .single();

    if (scanInsertError) {
      console.error("Error saving scan to history:", scanInsertError);
    } else {
      scanId = scanData?.id || "";
    }

    return NextResponse.json({
      success: true,
      analysis,
      scanId,
      source: "vision_ai",
      remainingCredits: deduction.newBalance
    });

  } catch (error: any) {
    console.error("Error in analyze API route:", error);

    // If credit was deducted before crash, automatically refund it
    if (reservedCredit && currentUserId) {
      await refundCredits(currentUserId, CREDIT_COSTS.SCAN, null, "Analysis API processing failed");
    }

    return NextResponse.json({
      error: "ANALYSIS_FAILED",
      message: "Failed to analyze food product label. Your scan credit has been preserved. Please try again."
    }, { status: 500 });
  }
}
