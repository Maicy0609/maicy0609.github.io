import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ADOFAI Music Converter - MIDI/Audio to Level File",
  description: "Convert MIDI files or WAV audio to A Dance of Fire and Ice (ADOFAI) level files. Support for angleData and Zipper modes.",
  keywords: ["ADOFAI", "MIDI", "Audio", "Converter", "A Dance of Fire and Ice", "Level Editor"],
  authors: [{ name: "Based on Luxus io's Python version" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ADOFAI Music Converter",
    description: "Convert MIDI or Audio to ADOFAI Level Files",
    type: "website",
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
        <I18nProvider>
          {children}
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
