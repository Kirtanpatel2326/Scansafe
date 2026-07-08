import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScanSafe - AI Food & Ingredient Scanner",
  description: "Scan ingredients instantly to decode chemical additives and identify hidden health risks with superhuman AI vision.",
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
        <Script id="google-translate-init" strategy="beforeInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE
              }, 'google_translate_element');
            }
          `}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
        <Analytics />
      </body>
    </html>
  );
}
