import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ocio — AI Trip Planner",
  description: "Turn messy travel vibes into real destinations. A vibe compiler for travel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        {children}
      </body>
    </html>
  );
}
