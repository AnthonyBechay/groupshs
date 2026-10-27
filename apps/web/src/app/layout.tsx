import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://groupshs.org"),
  title: "Group SHS - Scout du Liban",
  description: "Official website of the Scouts du Liban group at Sagesse High School. Join the adventure, leadership, and service.",
  openGraph: {
    title: "Group SHS - Scout du Liban",
    description: "Official website of the Scouts du Liban group at Sagesse High School. Join the adventure, leadership, and service.",
    siteName: "Group SHS",
    type: "website",
    // A small JPEG on purpose: WhatsApp drops preview images above ~300 KB,
    // and logo-original.png (8.5 MB) showed links with no logo at all.
    images: [
      {
        url: "/og-logo.jpg",
        width: 600,
        height: 600,
        type: "image/jpeg",
        alt: "Group SHS - Scouts du Liban Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Group SHS - Scout du Liban",
    description: "Official website of the Scouts du Liban group at Sagesse High School.",
    images: ["/og-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://pub-1f6ef2bce8ec46fa9b8fd340b1b671fd.r2.dev" />
        <link rel="preconnect" href="https://pub-1f6ef2bce8ec46fa9b8fd340b1b671fd.r2.dev" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
