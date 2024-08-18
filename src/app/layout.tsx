import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

import "./globals.css";

import { RefsProvider } from "@/contexts/RefsContext";

import Header from "@/components/Header";

import { LIGHT_COLORS, DARK_COLORS } from "@/constants";

const inter = Inter({ weight: "400", subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "Pair Learner",
  description: "Learn words in any language!",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const savedTheme = cookies().get("color-theme");
  const theme = savedTheme?.value || "light";

  const themeColors = theme === "light" ? LIGHT_COLORS : DARK_COLORS;
  return (
    <html lang='en' data-color-theme={theme} style={themeColors}>
      <body className={inter.className}>
        <RefsProvider>
          <Header initialTheme={theme} />
          {children}
        </RefsProvider>
      </body>
    </html>
  );
}
