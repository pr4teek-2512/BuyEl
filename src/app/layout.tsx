import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuyEl - buy and sell university course seats",
  description:
    "BuyEl is a student marketplace for university course registrations. List a course you secured, find the one you need, and talk to the other student anonymously.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Passed to Next so its own inline scripts carry the CSP nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} data-nonce={nonce}>
      <body className="flex min-h-full flex-col bg-white text-ink">{children}</body>
    </html>
  );
}
