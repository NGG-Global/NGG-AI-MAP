import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NGG — AI Assessment Platform", template: "%s · NGG" },
  description: "AI Adoption & Agentic Management diagnostic platform",
};

/**
 * The root layout only loads global styles. Language and direction are set by the
 * nested shells (NGG, client, survey) because each resolves its locale from a different source.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
