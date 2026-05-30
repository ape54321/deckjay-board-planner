import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Deck Tracker",
  description: "Track your deck building time and work entries",
}

export const viewport: Viewport = {
  themeColor: "#0d1117",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-[var(--background)]">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
