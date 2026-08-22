import type { Metadata } from "next";
import "./globals.css";

const FAVICON = "/media/legacy/af6f76baa9648820.png";

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
