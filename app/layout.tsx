import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luxury Destination Wedding Venue in India by Viraaya Weddings",
  description:
    "Viraaya Weddings offers best destination wedding venues in India, top resorts and wedding locations.",
  icons: {
    icon: "/admin/images/favicon.png",
    shortcut: "/admin/images/favicon.png",
    apple: "/admin/images/favicon.png",
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
