import { cn } from "@/lib/cn";

export function Avatar({ text, color, size = "md", className }: { text: string; color?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-[12px]" : size === "lg" ? "h-14 w-14 text-[20px]" : "h-10 w-10 text-[14px]";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white", sizeClass, className)}
      style={{ background: color ?? "#15151f" }}
    >
      {text.slice(0, 2)}
    </span>
  );
}
