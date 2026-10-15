import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Geist_Mono, Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_NAME, siteUrl } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  // Canonical links and relative Open Graph URLs resolve against this.
  metadataBase: new URL(siteUrl()),
  title: BRAND_NAME,
  description: "One link for everything you make and sell.",
};

// Cover lets the fixed bottom docks pad past the home indicator with
// env(safe-area-inset-bottom); without it the browser letterboxes the page
// and the insets read as zero.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased motion-safe:scroll-smooth`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
