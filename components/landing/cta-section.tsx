import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/landing/motion-wrapper";

const perks = [
  "Free to join — registration number is your key",
  "Connect with 10,000+ graduates nationwide",
  "Access jobs, mentors & alumni groups instantly",
];

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-[#021f15]" />
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#10b981 1px,transparent 1px),linear-gradient(90deg,#10b981 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Centre glow */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/15 blur-[100px]" />
      {/* Corner accents */}
      <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-[60px]" />
      <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-teal-500/10 blur-[60px]" />

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white/70">
                Open to All GSU Graduates
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to Reconnect with Your{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-100 bg-clip-text text-transparent">
                GSU Family?
              </span>
            </h2>
          </FadeIn>

          <FadeIn delay={0.15}>
            <p className="mx-auto mb-8 max-w-lg text-[15px] leading-relaxed text-white/55">
              Whether you graduated in 2004 or 2025, there&apos;s a place for you
              here. Join the fastest-growing alumni network in North-East Nigeria.
            </p>
          </FadeIn>

          {/* Perks */}
          <FadeIn delay={0.2}>
            <ul className="mb-10 flex flex-col items-center gap-2.5">
              {perks.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2 text-[13px] text-white/60"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400/80" />
                  {p}
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-12 gap-2 rounded-xl bg-emerald-500 px-9 text-sm font-bold text-white shadow-lg shadow-emerald-900/50 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30"
              >
                <Link href="/login">
                  Join the Network
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-white/30">
              No account required — sign in with your matric number.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}