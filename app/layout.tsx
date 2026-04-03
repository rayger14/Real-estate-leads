import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "South Bay Home Advisor",
  description: "AI-assisted homeowner advisor and acquisition console for South Bay real estate operations"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
