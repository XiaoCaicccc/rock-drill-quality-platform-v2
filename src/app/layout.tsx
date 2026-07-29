import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rock Drill Quality Platform V2",
  description: "Engineering foundation for Rock Drill Quality Platform V2.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
