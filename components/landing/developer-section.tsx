import Image from "next/image";
import { Heart, Code2, GraduationCap, Globe, Braces, Layers } from "lucide-react";
import { FadeIn } from "@/components/landing/motion-wrapper";

const techStack = [
  { label: "Next.js", color: "bg-black text-white border-black/20" },
  { label: "TypeScript", color: "bg-blue-600 text-white border-blue-700/30" },
  { label: "Prisma", color: "bg-indigo-600 text-white border-indigo-700/30" },
  { label: "PostgreSQL", color: "bg-sky-600 text-white border-sky-700/30" },
  { label: "Tailwind CSS", color: "bg-teal-500 text-white border-teal-600/30" },
];

export function DeveloperSection() {
  return (
      <section className="relative overflow-hidden bg-background py-24 lg:py-32">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 left-10 size-64 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="absolute -top-10 right-10 size-64 rounded-full bg-teal-500/8 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-4xl">

              {/* Outer luxury frame */}
              <div className="relative rounded-3xl border border-border/40 bg-card p-px shadow-2xl shadow-black/10">

                {/* Top gradient bar */}
                <div className="absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px rounded-b-3xl bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                <div className="relative overflow-hidden rounded-3xl bg-card">
                  {/* Decorative background grid */}
                  <div
                      className="pointer-events-none absolute inset-0 opacity-[0.025]"
                      style={{
                        backgroundImage:
                            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                      }}
                  />

                  {/* Corner accent */}
                  <div className="absolute right-0 top-0 size-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

                  <div className="relative flex flex-col gap-10 p-8 sm:flex-row sm:items-stretch lg:p-12">

                    {/* ── Left: Photo + identity ── */}
                    <div className="flex shrink-0 flex-col items-center gap-4 sm:items-start">

                      {/* Photo with layered rings */}
                      <div className="relative">
                        <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 opacity-30 blur-sm" />
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500" />
                        <div className="relative size-32 overflow-hidden rounded-2xl sm:size-36">
                          <Image
                              src="/images/developer.jpeg"
                              alt="Abubakar Sadiq Abdullahi – Developer, GSU Class of 2025"
                              width={144}
                              height={144}
                              className="size-full object-cover"
                          />
                        </div>

                        {/* Code icon badge */}
                        <div className="absolute -bottom-3 -right-3 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 ring-2 ring-background">
                          <Code2 className="size-4 text-white" />
                        </div>
                      </div>

                      {/* Class badge */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                      <GraduationCap className="size-3.5" />
                      Class of 2025
                    </span>

                      {/* Vertical stat pills */}
                      <div className="hidden sm:flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                          <Layers className="size-3.5 text-primary/60 shrink-0" />
                          <span className="text-[11px] font-medium text-muted-foreground">Full-Stack</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                          <Braces className="size-3.5 text-primary/60 shrink-0" />
                          <span className="text-[11px] font-medium text-muted-foreground">Computer Science</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                          <Globe className="size-3.5 text-primary/60 shrink-0" />
                          <span className="text-[11px] font-medium text-muted-foreground">Made in Nigeria 🇳🇬</span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical divider */}
                    <div className="hidden sm:block w-px shrink-0 bg-gradient-to-b from-transparent via-border/60 to-transparent" />

                    {/* ── Right: Content ── */}
                    <div className="flex flex-1 flex-col justify-between gap-6">
                      <div>
                        {/* Eyebrow */}
                        <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-emerald-500 uppercase">
                          Built by a GSU Graduate
                        </p>

                        {/* Name */}
                        <h3 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-3xl">
                          Abubakar Sadiq Abdullahi
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          Developer · GSU Class of 2025
                        </p>

                        {/* Gradient rule */}
                        <div className="my-5 h-px w-full bg-gradient-to-r from-emerald-500/40 via-border/30 to-transparent" />

                        {/* Headline */}
                        <h4 className="mb-2.5 text-[15px] font-extrabold text-foreground">
                          Designed &amp; Developed In-House
                        </h4>

                        {/* Body text */}
                        <p className="text-[13.5px] leading-[1.85] text-muted-foreground">
                          This platform was crafted in-house as a dedicated contribution to the GSU alumni community —
                          combining modern engineering standards with the university&apos;s identity and values to
                          deliver a world-class alumni experience.
                        </p>
                      </div>

                      {/* Tech stack */}
                      <div>
                        <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                          Technology Stack
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {techStack.map((t) => (
                              <span
                                  key={t.label}
                                  className={`rounded-lg border px-3 py-1 text-[11px] font-semibold shadow-sm ${t.color}`}
                              >
                            {t.label}
                          </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer line */}
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground border-t border-border/40 pt-4">
                        <span>Built with</span>
                        <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                        <span>for the GSU alumni community</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>
  );
}