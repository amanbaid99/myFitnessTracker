import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ConfirmHost } from "@/components/confirm-dialog";
import { InstallPrompt } from "@/components/install-prompt";
import { OutboxSync } from "@/components/outbox-sync";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { isLightBase, parseTheme, THEME_COOKIE, themeColor } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function currentTheme() {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

const baseMetadata: Metadata = {
  title: { default: "Repd", template: "%s · Repd" },
  description: "Log every set, warm-ups included, and see progression.",
  applicationName: "Repd",
  appleWebApp: {
    capable: true,
    title: "Repd",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export async function generateMetadata(): Promise<Metadata> {
  const { base } = await currentTheme();
  // On a light base the iPhone status bar needs dark text.
  return isLightBase(base)
    ? { ...baseMetadata, appleWebApp: { capable: true, title: "Repd", statusBarStyle: "default" } }
    : baseMetadata;
}

export async function generateViewport(): Promise<Viewport> {
  const { base } = await currentTheme();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: themeColor(base),
    colorScheme: isLightBase(base) ? "light" : "dark",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await currentTheme();
  return (
    <html
      lang="en"
      data-base={theme.base}
      data-accent={theme.accent}
      className={`${theme.base === "dark" ? "dark " : ""}${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <InstallPrompt />
        <ConfirmHost />
        <ServiceWorkerRegister />
        <OutboxSync />
      </body>
    </html>
  );
}
