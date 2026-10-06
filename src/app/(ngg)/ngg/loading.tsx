export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-[52px] w-72 animate-pulse rounded-full bg-surface" />
      <div className="h-40 animate-pulse rounded-[28px] bg-surface" />
      <div className="flex flex-wrap gap-4">
        <div className="h-32 flex-[1_1_240px] animate-pulse rounded-[28px] bg-surface" />
        <div className="h-32 flex-[1_1_240px] animate-pulse rounded-[28px] bg-surface" />
        <div className="h-32 flex-[1_1_240px] animate-pulse rounded-[28px] bg-surface" />
      </div>
    </div>
  );
}
