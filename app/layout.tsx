import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import Navigation from "@/components/navigation";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meal Planner - Plan Your Meals",
  description: "Generate personalized meal plans and shopping lists with AI",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  },
  openGraph: {
    title: "Meal Planner",
    description: "Generate personalized meal plans and shopping lists with AI",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
        <style dangerouslySetInnerHTML={{ __html: `[data-hydration-error] { display: none !important; }` }} />
      </head>
      <body className={`${inter.className} bg-white min-h-screen`}>
        <AppProvider>
          <Navigation />
          <main className="pb-24 md:pb-8">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
