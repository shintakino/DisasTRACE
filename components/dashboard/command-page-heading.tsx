interface CommandPageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
}

/**
 * Keeps CDRRMO and PACC command pages aligned with the Analytics heading
 * hierarchy without changing the color of the explanatory copy below it.
 */
export function CommandPageHeading({
  eyebrow = "CDRRMO command center",
  title,
  description,
}: CommandPageHeadingProps) {
  return (
    <header>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1E3A8A]">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </header>
  );
}
