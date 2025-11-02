"use client";

// NOTE: Neynar provider wiring removed temporarily so CI/build passes in this branch.
// Re-add NeynarContextProvider from `@neynar/react` and its styles when NEYNAR
// peer deps and import shapes are confirmed.

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
