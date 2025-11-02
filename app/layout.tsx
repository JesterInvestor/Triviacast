"use client";

import * as Neynar from "@neynar/react";
import "@neynar/react/dist/style.css";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <Neynar.NeynarContextProvider
        settings={{
          clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
          defaultTheme: Neynar.Theme.Light,
          eventsCallbacks: {
            onAuthSuccess: () => {},
            onSignout() {},
          },
        }}
      >
        <body className={inter.className}>{children}</body>
      </Neynar.NeynarContextProvider>
    </html>
  );
}
