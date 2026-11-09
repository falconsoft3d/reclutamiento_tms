import { Suspense } from "react";
import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import { SiteFooter, SiteFooterSkeleton } from "@/components/site-footer";
import { SiteHeader, SiteHeaderSkeleton } from "@/components/site-header";
import "./globals.css";

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Trabajá con nosotros", template: "%s · Trabajá con nosotros" },
  description: "Búsquedas laborales: postulate en línea y hacé la entrevista desde tu celular.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${exo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={<SiteHeaderSkeleton />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<SiteFooterSkeleton />}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
