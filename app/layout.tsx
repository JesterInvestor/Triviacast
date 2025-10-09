import type { Metadata } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";

export const metadata: Metadata = {
  title: "Quiz App - Farcaster Trivia Challenge",
  description: "Test your knowledge with timed trivia questions on Farcaster",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
