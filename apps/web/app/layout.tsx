import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Спортивный календарь для CODECAVE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
