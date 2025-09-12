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
  description: "GOSIM开发者大会互动展示 - 实时展示参与者的AI卡通头像",
  keywords: ["GOSIM", "展示", "大屏", "AI头像", "开发者大会"],
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
