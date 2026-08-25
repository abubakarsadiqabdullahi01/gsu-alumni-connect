"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Download,
  IdCard,
  Users,
  Briefcase,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/landing/motion-wrapper";
import {
  ANDROID_APP,
  buildAndroidDownloadUrl,
  isAndroidAppAvailable,
} from "@/lib/app-download";

const appScreens = [
  { icon: IdCard, label: "Digital ID card", meta: "Verified" },
  { icon: Users, label: "Alumni directory", meta: "10,000+" },
  { icon: Briefcase, label: "Job board", meta: "New" },
  { icon: MessageCircle, label: "Messages", meta: "Live" },
  { icon: MapPin, label: "Alumni map", meta: "Nigeria" },
];

const CONFIGURED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
const noopSubscribe = () => () => {};

const installSteps = [
  {
    title: "Tap download",
    body: "The APK saves straight to your Downloads folder.",
  },
  {
    title: "Open the file",
    body: "Android asks permission to install from your browser — allow it once.",
  },
  {
    title: "Sign in",
    body: "Your registration number and password, same as the web app.",
  },
];

export function DownloadSection() {
  const available = isAndroidAppAvailable();

  // The QR code needs an absolute URL. Render the configured site URL on the
  // server, then read the origin the visitor actually reached us on — which is
  // what their phone has to be able to resolve. An origin never changes while
  // the page is open, so the subscribe half is a no-op.
  const siteOrigin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => CONFIGURED_ORIGIN
  );

  const metaBits = [
    `Version ${ANDROID_APP.version}`,
    ANDROID_APP.sizeLabel,
    `Android ${ANDROID_APP.minAndroidVersion}+`,
  ].filter(Boolean);

  return (
    <section
      id="download"
      className="relative overflow-hidden bg-muted/25 py-24 lg:py-32"
    >
      {/* Faint dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-[90px]" />

      <div className="container relative mx-auto px-4 lg:px-8">
        <FadeIn>
          <div className="mb-12 flex items-center gap-3">
            <span className="h-px w-8 bg-primary/50" />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Mobile App
            </span>
          </div>
        </FadeIn>

        <div className="grid items-center gap-14 lg:grid-cols-[1fr_320px] lg:gap-16">
          {/* Copy + actions */}
          <div>
            <FadeIn direction="left">
              <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-tight">
                Carry the Network in{" "}
                <span className="relative inline-block">
                  <span className="text-primary">Your Pocket</span>
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-primary/30" />
                </span>
              </h2>
            </FadeIn>

            <FadeIn direction="left" delay={0.05}>
              <p className="mb-8 max-w-xl text-[15px] leading-[1.75] text-muted-foreground">
                The GSU Alumni Connect app puts the directory, the job board,
                your digital ID card and your conversations on your phone. Same
                account, same data — no second sign-up.
              </p>
            </FadeIn>

            {/* Download + QR */}
            <FadeIn direction="left" delay={0.1}>
              <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center">
                <div>
                  {available ? (
                    <Button
                      asChild
                      size="lg"
                      className="group h-14 gap-3 rounded-xl px-7 shadow-lg shadow-primary/20"
                    >
                      <a href={ANDROID_APP.downloadPath}>
                        <Download className="size-5 transition-transform group-hover:translate-y-0.5" />
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-[10px] font-medium tracking-wider uppercase opacity-75">
                            Download for
                          </span>
                          <span className="text-sm font-bold">Android</span>
                        </span>
                      </a>
                    </Button>
                  ) : (
                    <Button size="lg" disabled className="h-14 gap-3 rounded-xl px-7">
                      <Smartphone className="size-5" />
                      <span className="text-sm font-bold">
                        Android build coming soon
                      </span>
                    </Button>
                  )}

                  <p className="mt-3 text-xs text-muted-foreground">
                    {available
                      ? metaBits.join(" · ")
                      : "Use the web app in any phone browser in the meantime."}
                  </p>
                </div>

                {/* Scan-to-install, for anyone reading this on a desktop */}
                {available && (
                  <div className="hidden items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-sm sm:flex">
                    <div className="size-[76px] rounded-lg bg-white p-1.5">
                      {siteOrigin ? (
                        <QRCode
                          value={buildAndroidDownloadUrl(siteOrigin)}
                          size={64}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#1a5c3a"
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="h-full w-full animate-pulse rounded bg-muted" />
                      )}
                    </div>
                    <div className="max-w-[130px]">
                      <p className="text-[13px] font-semibold text-foreground">
                        Scan to install
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Point your phone camera here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Install steps */}
            <FadeIn direction="left" delay={0.15}>
              <ol className="mb-6 grid gap-4 sm:grid-cols-3">
                {installSteps.map((step, i) => (
                  <li key={step.title}>
                    <span className="mb-2 flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-[13px] font-semibold text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </FadeIn>

            <FadeIn direction="left" delay={0.2}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary/70" />
                  Published by the Alumni Secretariat
                </span>
                <span>
                  On iPhone?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Use the web app
                  </Link>
                </span>
              </div>
            </FadeIn>
          </div>

          {/* Phone mock-up */}
          <FadeIn direction="right" delay={0.1} className="mx-auto lg:mx-0">
            <div className="relative w-[268px]">
              {/* Glow behind the device */}
              <div className="absolute inset-6 rounded-[44px] bg-emerald-500/20 blur-3xl" />

              <div className="relative rounded-[42px] border border-border/60 bg-foreground/90 p-2.5 shadow-2xl shadow-emerald-950/25">
                <div className="relative overflow-hidden rounded-[34px] bg-background">
                  {/* Speaker slit */}
                  <div className="relative flex h-8 items-center justify-center">
                    <span className="h-1.5 w-16 rounded-full bg-foreground/15" />
                  </div>

                  {/* App header */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pb-5 pt-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Image
                          src="/images/gsu-alumni-logo.png"
                          alt="GSU Alumni Connect"
                          width={22}
                          height={22}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold leading-tight text-white">
                          GSU Alumni Connect
                        </p>
                        <p className="text-[9px] text-white/70">
                          Knowledge for Service
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Screen rows */}
                  <div className="space-y-2 px-3 py-4">
                    {appScreens.map(({ icon: Icon, label, meta }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-2.5 py-2"
                      >
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="size-3.5 text-primary" />
                        </span>
                        <span className="flex-1 text-[11px] font-medium text-foreground">
                          {label}
                        </span>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                          {meta}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom nav hint */}
                  <div className="flex items-center justify-around border-t border-border/50 px-4 py-2.5">
                    {[Users, Briefcase, IdCard, MessageCircle].map((Icon, i) => (
                      <Icon
                        key={i}
                        className={`size-4 ${
                          i === 0 ? "text-primary" : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
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
