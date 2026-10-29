import { Orb, VARIANTS, type OrbLook } from "@/components/ui/thinking-orbs";

const looks = Object.entries(VARIANTS).flatMap(([state, variants]) =>
  variants.map((variant) => ({ state, variant }) as OrbLook),
);

export default function Demo() {
  return (
    <div className="grid grid-cols-3 gap-x-10 gap-y-8 p-10 text-foreground sm:grid-cols-5">
      {looks.map((look) => (
        <div key={`${look.state}-${look.variant}`} className="flex flex-col items-center gap-3">
          <Orb {...look} size={48} />
          <span className="text-xs text-muted-foreground">
            {look.state}
            {look.variant !== "default" && ` · ${look.variant}`}
          </span>
        </div>
      ))}
    </div>
  );
}
