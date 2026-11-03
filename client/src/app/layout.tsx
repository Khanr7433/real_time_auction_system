import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidNow - Real-Time Online Auction System",
  description: "Live bidding platform with real-time updates and countdown timers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
