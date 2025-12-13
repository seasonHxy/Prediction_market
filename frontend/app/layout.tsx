import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Providers } from "@/components/providers/provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Truthbase - AI Prediction Markets on Base",
  description: "Predict anything. AI verifies everything. Earn USDC on Base.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (
                  localStorage.theme === 'dark' ||
                  (!('theme' in localStorage) &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches)
                ) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>

      <body className={`${inter.className} antialiased`}>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>

        <Analytics />
      </body>
    </html>
  );
}