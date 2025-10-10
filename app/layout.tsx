import type { Metadata } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";

export const metadata: Metadata = {
  title: "Triviacast - Test Your Brain Power",
  description: "Test your knowledge with timed trivia questions. Challenge your brain with Triviacast on Farcaster!",
  icons: {
    icon: '/brain-small.svg',
  },
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
