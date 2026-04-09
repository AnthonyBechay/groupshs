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
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://groupshs.org"),
  title: "Group SHS - Scout du Liban",
  description: "Official website of the Scouts du Liban group at Sagesse High School. Join the adventure, leadership, and service.",
  openGraph: {
    title: "Group SHS - Scout du Liban",
    description: "Official website of the Scouts du Liban group at Sagesse High School. Join the adventure, leadership, and service.",
    siteName: "Group SHS",
    type: "website",
    images: [
      {
        url: "/logo-original.png",
        width: 1080,
        height: 1080,
        alt: "Group SHS - Scouts du Liban Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Group SHS - Scout du Liban",
    description: "Official website of the Scouts du Liban group at Sagesse High School.",
    images: ["/logo-original.png"],
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
