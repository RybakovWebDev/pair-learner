import { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { Viewport } from "next";
import { createClient } from "@/utils/supabase/server";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import { RefsProvider } from "@/contexts/RefsContext";

import Header from "@/components/Header";

import { LIGHT_COLORS, DARK_COLORS } from "@/constants";
import { UserProvider } from "@/contexts/UserContext";

const inter = Inter({
  weight: ["200", "300", "400", "600", "800"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Pair Learner",
  description:
    "Language learning memory game where you match word pairs. Create custom word pairs, organize with tags, and import word lists to practice any language.",
  openGraph: {
    title: "Pair Learner",
    description:
      "Language learning memory game where you match word pairs. Create custom word pairs, organize with tags, and import word lists to practice any language.",
    type: "website",
    locale: "en_US",
    url: "https://www.pairlearner.app",
    siteName: "Pair Learner",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Pair Learner",
    statusBarStyle: "default",
    capable: true,
  },
  keywords:
    "language learning, vocabulary practice, word pairs, memory game, flashcards, word matching, custom flashcards",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e0f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#072427" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const savedTheme = (await cookies()).get("color-theme");
  const theme = savedTheme?.value || "dark";
  const themeColors = theme === "light" ? LIGHT_COLORS : DARK_COLORS;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang='en' data-color-theme={theme} style={themeColors}>
      <body className={inter.className}>
        <UserProvider initialUser={user}>
          <RefsProvider>
            <Header initialTheme={theme} />
            {children}
            <Analytics />
          </RefsProvider>
        </UserProvider>
      </body>
    </html>
  );
}
