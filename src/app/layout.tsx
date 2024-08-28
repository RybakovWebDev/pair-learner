import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

import "./globals.css";

import { RefsProvider } from "@/contexts/RefsContext";

import Header from "@/components/Header";

import { LIGHT_COLORS, DARK_COLORS } from "@/constants";
import { UserProvider } from "@/contexts/UserContext";
import { Viewport } from "next";

const inter = Inter({ weight: "400", subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "Pair Learner",
  description: "Learn new words in any language",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Pair Learner",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const savedTheme = cookies().get("color-theme");
  const theme = savedTheme?.value || "dark";

  const themeColors = theme === "light" ? LIGHT_COLORS : DARK_COLORS;
  return (
    <html lang='en' data-color-theme={theme} style={themeColors}>
      <body className={inter.className}>
        <UserProvider>
          <RefsProvider>
            <Header initialTheme={theme} />
            {children}
          </RefsProvider>
        </UserProvider>
      </body>
    </html>
  );
}
