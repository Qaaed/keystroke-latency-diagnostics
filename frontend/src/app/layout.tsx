import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keynostics",
  description: "Typing performance and keyboard latency diagnostics.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="mobile-device-notice">
          <div>
            <h1>Desktop required</h1>
            <p>
              Keynostics needs a physical keyboard. Please access this from
              your computer only.
            </p>
          </div>
        </div>
        <div className="desktop-app-shell">{children}</div>
      </body>
    </html>
  );
}
