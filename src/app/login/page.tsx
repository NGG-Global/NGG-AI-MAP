import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/current";
import { getDictionary } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";
import { NggLogo } from "@/components/shell/NggLogo";
import { Tile } from "@/components/ui/Tile";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const existing = await getCurrentContext();
  if (existing) redirect(existing.actor.kind === "ngg" ? "/ngg" : "/dashboard");
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const locale = params.lang === "en" ? "en" : "he";
  const t = getDictionary(locale);
  return (
    <main dir={locale === "he" ? "rtl" : "ltr"} lang={locale} className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tile padding="hero" className="flex flex-col gap-6">
          <NggLogo tagline={t.app.tagline} />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{t.auth.loginTitle}</h1>
            <p className="mt-1 text-[14px] text-text-muted">{t.auth.loginSubtitle}</p>
          </div>
          <LoginForm t={t.auth} locale={locale} next={next} />
          {process.env.NODE_ENV !== "production" ? <p className="text-[12px] text-text-muted">{t.auth.demoHint}</p> : null}
          <p className="text-[12px] text-text-muted">
            <a href={locale === "he" ? "/login?lang=en" : "/login"}>{locale === "he" ? "English" : "עברית"}</a>
          </p>
        </Tile>
      </div>
    </main>
  );
}
