import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Histinder — dating, but historically",
  description: "Match with people who definitely shouldn't be on the apps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-hidden font-sans antialiased">{children}</body>
    </html>
  );
}
