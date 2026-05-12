import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DisasTRACE",
  description: "Emergency incident reporting and ambulance dispatch system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsVariant: "blockButton",
          logoPlacement: "inside",
        },
        variables: {
          colorPrimary: "#1E3A8A",
          fontFamily: "var(--font-inter)",
        },
        elements: {
          formButtonPrimary: 
            "bg-primary hover:bg-primary/90 text-primary-foreground",
          card: "shadow-sm border border-border rounded-xl",
          headerTitle: "text-primary font-bold",
          headerSubtitle: "text-muted-foreground",
        }
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
