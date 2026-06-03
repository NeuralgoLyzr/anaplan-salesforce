import type { Metadata } from "next";
import { Mulish, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import SidebarLayout from "@/components/sidebar/SidebarLayout";
import { ThemeProvider } from "@/lib/themes/ThemeProvider";

// proxima-nova (the ADS typeface) is an Adobe Fonts / Typekit face and can't be
// self-hosted without a kit. Mulish is the closest free match and renders as the
// fallback; if a Typekit kit is added, `proxima-nova` (first in the CSS stack) wins.
const mulish = Mulish({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-mulish',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Lyzr Agent",
  description: "Powered by Lyzr AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Restore theme before first paint — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ui-theme')||'default';document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${mulish.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
