import { Tile } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Tile className="flex flex-col items-start gap-3">
      <h1 className="text-[22px] font-extrabold">הדף לא נמצא · Page not found</h1>
      <p className="text-[14px] text-text-muted">ייתכן שאין לך הרשאה לצפות בפריט זה. · You may not have access to this item.</p>
      <LinkButton href="/ngg" variant="secondary">
        מבט על · Overview
      </LinkButton>
    </Tile>
  );
}
