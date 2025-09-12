import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GOSIM Wonderland",
  description: "GOSIM开发者大会管理系统 - 内容审核和数据管理",
  keywords: ["GOSIM", "管理", "审核", "后台", "开发者大会"],
  authors: [{ name: "GOSIM Team" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: [
      { url: "/mofa-logo.png", sizes: "any" },
      { url: "/mofa-logo.png", sizes: "16x16", type: "image/png" },
      { url: "/mofa-logo.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/mofa-logo.png",
    apple: "/mofa-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
