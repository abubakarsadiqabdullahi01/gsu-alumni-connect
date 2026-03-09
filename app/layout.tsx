import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GSU Alumni Connect",
    template: "%s | GSU Alumni Connect",
  },
  description:
    "The official alumni network for Gombe State University graduates. Connect with classmates, discover career opportunities, find mentors, and stay engaged with the GSU community.",
  keywords: [
    "Gombe State University",
    "GSU",
    "alumni",
    "graduates",
    "Nigeria",
    "networking",
    "mentorship",
    "career",
  ],
  icons: {
    icon: "/images/gsu-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
