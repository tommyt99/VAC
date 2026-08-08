import type { Metadata } from "next";
import "./globals.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Molecular Dynamics Lab · VAC",
  description:
    "Run and explore a validated Lennard–Jones molecular dynamics simulation directly in your browser.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "192x192" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Molecular Dynamics Lab · VAC",
    description:
      "Explore Lennard–Jones particle dynamics, live observables, and VMD-compatible trajectories in your browser.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Amber particles moving inside a molecular dynamics simulation box",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Molecular Dynamics Lab · VAC",
    description:
      "Explore Lennard–Jones particle dynamics and live observables in your browser.",
    images: ["/og.png"],
  },
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
