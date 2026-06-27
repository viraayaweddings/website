import type { Metadata } from "next";
import { getHomepageFooter, getHomepageHeader } from "./homepage-shell";
import TwcHomeBoot from "./twc-home-boot";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "Viraaya Weddings - Book Venues, End to End Wedding Services, Planners in India",
  description:
    "Viraaya Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals for your wedding, engagement, reception, and other events.",
  openGraph: {
    title:
      "Viraaya Weddings - Book Venues, End to End Wedding Services, Planners in India",
    description:
      "Viraaya Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals for your wedding, engagement, reception, and other events.",
    url: "https://viraayaweddings.com/",
    siteName: "Viraaya Weddings",
    images: [
      "https://viraayaweddings.com/brand/viraaya-logo-full.png"
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: "@viraayaweddings",
    title:
      "Viraaya Weddings - Book Venues, End to End Wedding Services, Planners in India",
    description:
      "Viraaya Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals for your wedding, engagement, reception, and other events.",
    images: [
      "https://viraayaweddings.com/brand/viraaya-logo-full.png"
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" className="twc-js" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/brand/favicon.png" />
        <link rel="preload" href="/brand/viraaya-logo-header.png" as="image" />
        <link rel="stylesheet" href="/twc-next/static/css/5baa3d17e8de8438.css" />
        <link rel="stylesheet" href="/twc-next/static/css/c8c1bcda263ddb1a.css" />
        <link rel="stylesheet" href="/twc-next/static/css/ef46db3751d8e999.css" />
        <link rel="stylesheet" href="/twc-next/static/css/ec70c9af02a4e84a.css" />
        <link rel="stylesheet" href="/twc-next/static/css/61dbd837b13489b4.css" />
      </head>
      <body className="bg-white" id="body-container" suppressHydrationWarning>
        <div
          className="__variable_24d3ab __variable_d59ba8 __variable_e36b36 __variable_6ea4a9 __variable_c888ac font-lato"
          id="parent-container"
        >
          <div
            id="twc-homepage-shared-header"
            dangerouslySetInnerHTML={{ __html: getHomepageHeader() }}
          />
          {children}
          <div
            id="twc-homepage-shared-footer"
            dangerouslySetInnerHTML={{ __html: getHomepageFooter() }}
          />
        </div>
        <TwcHomeBoot />
      </body>
    </html>
  );
}
