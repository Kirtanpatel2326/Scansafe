import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import VercelAnalytics from "@/components/VercelAnalytics";
import ScrollNavigator from "@/components/ScrollNavigator";
import TranslationObserver from "@/components/TranslationObserver";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScanSafe - AI Food & Ingredient Scanner",
  description: "Scan ingredients instantly to decode chemical additives and identify hidden health risks with superhuman AI vision.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ScanSafe",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ScrollNavigator />
        <TranslationObserver />
        {/* Hidden Google Translate Target */}
        <div 
          id="google_translate_element" 
          style={{ 
            position: 'absolute', 
            top: '-9999px', 
            left: '-9999px', 
            width: '1px', 
            height: '1px', 
            overflow: 'hidden' 
          }}
        ></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'en',
                  layout: google.translate.TranslateElement.InlineLayout.SIMPLE
                }, 'google_translate_element');
              }
            `
          }}
        />
        <script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          async
          defer
        />
        <VercelAnalytics />
      </body>
    </html>
  );
}
