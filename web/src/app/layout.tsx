import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Through the Clouds — Treefera LCAW26",
  description:
    "L-band ALOS-2 PALSAR-2 deforestation alerts over Central Kalimantan, seen through the clouds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
