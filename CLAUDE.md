# ScanSafe - Project Context

## Overview
**ScanSafe** is a Premium AI Food Ingredients Guardian. It allows users to scan food product labels (via mobile camera or image upload) or barcodes. The application uses AI Vision to read the ingredients list and provides a detailed health analysis, identifying hidden dangers, UPF (Ultra-Processed Food) scores, additives, and alerts based on personalized dietary profiles (e.g., Vegan, Diabetic, Jain Diet).

## Tech Stack
*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript, React
*   **Styling**: Tailwind CSS (Dark theme with Emerald accents)
*   **Database & Auth**: Supabase (PostgreSQL, Google OAuth, Email/Password)
*   **AI Model**: Google Gemini 2.5 Flash (Handles OCR & complex ingredient analysis)
*   **Payments**: Razorpay (Integration for premium "Pro" subscription)
*   **Deployment**: Vercel (`scansafe-o31d.vercel.app`)

## Core Features
1.  **AI Image Scanning**: Uses `navigator.mediaDevices.getUserMedia` with automatic fallbacks for desktop/mobile to capture labels. Images are compressed client-side before being sent to the backend.
2.  **Smart Caching & Barcodes**: Checks the `products_cache` table first. If not found, fetches from Open Food Facts API, enriches the data via Gemini, and caches it. 
3.  **Dietary Personalization**: Users can select profiles (Gluten-Free, Jain, Hypertension, etc.). The backend injects these into the AI prompt so it specifically flags violating ingredients as "avoid".
4.  **Meal Composer**: A feature allowing users to combine multiple scanned ingredients to evaluate the total health score of a meal.
5.  **PDF Export**: Allows users to download a premium PDF report of their food scan.

## Key Files & Structure
*   `app/scan/page.tsx`: The main user dashboard where recent scans are shown.
*   `components/ScanUpload.tsx`: Complex client component handling the camera interface, image compression, and loading UI.
*   `app/api/analyze/route.ts`: Core API endpoint. Routes requests between Cache, Open Food Facts, and the Vision AI. Applies dietary preferences dynamically.
*   `lib/claude.ts`: Contains the `analyzeLabel` function and the massive "System Prompt" instructing Gemini on how to strictly format the JSON output and evaluate health risks. *(Note: Named claude.ts for legacy reasons, but uses Gemini under the hood).*
*   `app/auth/page.tsx`: Authentication UI using Supabase.
*   `components/ResultView.tsx`: The highly polished UI that renders the JSON analysis (Health Score rings, Additives, Alternatives).

## Environment Variables
Required `.env.local` variables to run the project:
*   `GEMINI_API_KEY`
*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `NEXT_PUBLIC_RAZORPAY_KEY_ID`
*   `RAZORPAY_KEY_SECRET`

## Recent Bug Fixes (Context)
*   **Webcam Support**: Added `{ video: true }` fallback in `getUserMedia` to prevent `OverconstrainedError` on desktop webcams.
*   **Dietary Profiles**: Updated the `applyPreferences` logic to properly override demo data and cached OFF data with user-selected profiles.
*   **Missing Canvas**: Fixed a bug where a hidden `<canvas>` was removed, causing silent camera failures on iOS.
