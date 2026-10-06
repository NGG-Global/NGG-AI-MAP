import Link from "next/link";
import { db } from "@/server/db/client";
import { isFreshInstall } from "@/server/services/bootstrap";
import { Tile } from "@/components/ui/Tile";
import { NggLogo } from "@/components/shell/NggLogo";
import { Notice } from "@/components/ui/Notice";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

/**
 * One-time installation page. Works only while the database has no users AND SETUP_TOKEN is set.
 * It creates the first Super Admin and loads the libraries, so no terminal is needed to go live.
 */
export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const sp = await searchParams;
  const locale = sp.lang === "en" ? "en" : "he";
  const he = locale === "he";
  const fresh = await isFreshInstall(await db());
  const tokenConfigured = Boolean(process.env.SETUP_TOKEN?.trim());
  return (
    <main dir={he ? "rtl" : "ltr"} lang={locale} className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tile padding="hero" className="flex flex-col gap-6">
          <NggLogo tagline={he ? "הקמה ראשונית" : "Initial setup"} />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{he ? "הקמת המערכת" : "Platform setup"}</h1>
            <p className="mt-1 text-[14px] text-text-muted">
              {he ? "יצירת מנהל/ת המערכת הראשון/ה וטעינת ספריות השאלונים והמדדים. הדף פעיל פעם אחת בלבד." : "Creates the first Super Admin and loads the questionnaire and metric libraries. This page works only once."}
            </p>
          </div>
          {!fresh ? (
            <Notice tone="success">
              {he ? "ההקמה כבר בוצעה." : "Setup is already complete."} <Link href="/login" className="font-semibold">{he ? "לדף הכניסה ←" : "Go to login ←"}</Link>
            </Notice>
          ) : !tokenConfigured ? (
            <Notice tone="warning">{he ? "יש להגדיר את משתנה הסביבה SETUP_TOKEN באתר ולפרוס מחדש לפני ההקמה." : "Set the SETUP_TOKEN environment variable on the site and redeploy before running setup."}</Notice>
          ) : (
            <SetupForm locale={locale} />
          )}
          <p className="text-[12px] text-text-muted"><a href={he ? "/setup?lang=en" : "/setup"}>{he ? "English" : "עברית"}</a></p>
        </Tile>
      </div>
    </main>
  );
}
