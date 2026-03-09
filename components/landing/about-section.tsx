import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/landing/motion-wrapper";

const faculties = [
  "Arts & Social Sciences",
  "Education",
  "Science",
  "Medicine",
  "Pharmacy",
];

const highlights = [
  "20+ years of academic excellence",
  "Graduates across every state in Nigeria",
  "Strong alumni network in finance, tech & public service",
];

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-background py-24 lg:py-32">
      {/* Faint diagonal stripe bg */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg,#10b981 0,#10b981 1px,transparent 0,transparent 50%)", backgroundSize: "24px 24px" }}
      />

      <div className="container relative mx-auto px-4 lg:px-8">
        {/* Section label */}
        <FadeIn>
          <div className="mb-12 flex items-center gap-3">
            <span className="h-px w-8 bg-primary/50" />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">About the Platform</span>
          </div>
        </FadeIn>

        <div className="grid items-center gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
          {/* Text */}
          <div className="order-2 lg:order-1">
            <FadeIn direction="left" delay={0.05}>
              <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-tight">
                Building Bridges Between{" "}
                <span className="relative inline-block">
                  <span className="text-primary">Generations</span>
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-primary/30" />
                </span>{" "}
                of GSU Graduates
              </h2>
            </FadeIn>

            <FadeIn direction="left" delay={0.1}>
              <p className="mb-5 text-[15px] leading-[1.75] text-muted-foreground">
                Established in <strong className="font-semibold text-foreground">2004</strong> in Gombe State, Nigeria,{" "}
                <strong className="font-semibold text-foreground">Gombe State University</strong> has produced thousands of graduates
                making significant impact across Nigeria and beyond.
              </p>
            </FadeIn>

            <FadeIn direction="left" delay={0.15}>
              <p className="mb-7 text-[15px] leading-[1.75] text-muted-foreground">
                <strong className="font-semibold text-foreground">GSU Alumni Connect</strong> is the official digital platform of the
                GSU Alumni Association — purpose-built to reunite graduates, foster professional networking,
                create mentorship pathways, and strengthen the bonds that make GSU special.
              </p>
            </FadeIn>

            {/* Highlights */}
            <FadeIn direction="left" delay={0.2}>
              <ul className="mb-8 space-y-2.5">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {h}
                  </li>
                ))}
              </ul>
            </FadeIn>

            {/* Faculty tags */}
            <FadeIn direction="left" delay={0.25}>
              <div>
                <p className="mb-2.5 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Faculties</p>
                <div className="flex flex-wrap gap-2">
                  {faculties.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Image card */}
          <FadeIn direction="right" delay={0.1} className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-[280px] lg:max-w-none">
              {/* Outer decorative frame */}
              <div className="relative">
                {/* Green offset shadow block */}
                <div className="absolute -right-2.5 -bottom-2.5 h-full w-full rounded-2xl bg-primary/20" />

                {/* Image wrapper */}
                <div className="relative z-10 overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <Image
                    src="/images/gsu.jpg"
                    alt="Gombe State University Campus"
                    width={400}
                    height={250}
                    className="h-auto w-full"
                  />

                  {/* Caption strip */}
                  <div className="flex items-center gap-2.5 border-t border-border/60 bg-card px-4 py-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Image src="/images/gsu-logo.svg" alt="GSU" width={16} height={16} className="invert dark:invert-0" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Est. 2004</p>
                      <p className="text-[10px] text-muted-foreground">Gombe State, Nigeria</p>
                    </div>
                    <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      Public University
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}