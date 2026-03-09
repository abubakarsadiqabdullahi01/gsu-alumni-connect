import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const perks = [
  "Access your alumni profile & directory",
  "Explore job opportunities from fellow graduates",
  "Connect with mentors across industries",
  "Join faculty & cohort alumni groups",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left Panel ── */}
      <div className="relative hidden w-[52%] overflow-hidden lg:flex lg:flex-col">
        {/* Campus image */}
        <Image
          src="/images/gsu.jpg"
          alt="Gombe State University"
          fill
          className="object-cover object-center"
          priority
        />

        {/* Deep overlay layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-emerald-950/85 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-teal-400/10 blur-[60px]" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Image src="/images/gsu-logo.svg" alt="GSU" width={26} height={26} />
            </div>
            <div>
              <p className="text-[13px] font-bold leading-tight text-white">
                GSU Alumni Connect
              </p>
              <p className="text-[10px] leading-tight text-white/50">
                Gombe State University
              </p>
            </div>
          </Link>

          {/* Main copy */}
          <div className="max-w-sm">
            {/* Pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-white/70">
                Est. 2004 · Gombe State, Nigeria
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
              Welcome Back to Your{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Alumni Community
              </span>
            </h1>

            <p className="mb-8 text-[14px] leading-relaxed text-white/55">
              Reconnect with classmates, explore career opportunities, and stay
              engaged with the Gombe State University family.
            </p>

            {/* Perks list */}
            <ul className="space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[13px] text-white/65">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400/80" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/30">
              © {new Date().getFullYear()} GSU Alumni Connect
            </p>
            <p className="text-[11px] italic text-white/25">
              &ldquo;Knowledge for Service&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="relative flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-[48%] lg:px-12">
        {/* Subtle background tint */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent dark:from-emerald-950/10" />

        {/* Mobile logo */}
        <div className="relative z-10 mb-10 flex items-center gap-2.5 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Image src="/images/gsu-logo.svg" alt="GSU" width={22} height={22} className="invert dark:invert-0" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight">GSU Alumni Connect</p>
            <p className="text-[10px] text-muted-foreground">Gombe State University</p>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}