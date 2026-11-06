export const inputClass = (hasError) =>
  `w-full rounded-control border bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint
   outline-none transition-colors duration-150 motion-reduce:transition-none
   focus-visible:ring-2 focus-visible:ring-accent-support focus-visible:ring-offset-1
   ${hasError ? "border-danger" : "border-line hover:border-ink-faint"}`;

export const linkClass =
  "font-medium text-accent-support underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-60 disabled:no-underline";
