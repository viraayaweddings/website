import type { Metadata } from "next";
import "./globals.css";

const FAVICON = "/media/5855c8a4285f95d0b8a6208bd00c987d0d21885a242c42fd9b3da3ad1881fa9d.png";

export const metadata: Metadata = {
  title: "Luxury Destination Wedding Venue in India by Viraaya Weddings",
  description:
    "Viraaya Weddings offers best destination wedding venues in India, top resorts and wedding locations.",
  icons: {
    icon: FAVICON,
    shortcut: FAVICON,
    apple: FAVICON,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
