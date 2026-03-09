"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Users, Briefcase, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <Image
        src="/images/gsu.jpg"
        alt="Gombe State University Campus"
        fill
        className="object-cover object-center"
        priority
        quality={90}
      />

      {/* Multi-layer overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-emerald-950/75 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-transparent to-emerald-950/40" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-400/10 blur-[80px]" />

      {/* Content */}
      <div className="container relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-4 py-28 text-center lg:px-8">
        {/* Top pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 backdrop-blur-md">
            <span className="flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
            <span className="text-xs font-medium tracking-wide text-white/80">
              Official GSU Alumni Platform — Est. 2004
            </span>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          Where GSU Graduates{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-teal-200 bg-clip-text text-transparent">
              Connect & Thrive
            </span>
            {/* Underline accent */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 8"
              fill="none"
            >
              <path
                d="M2 6 Q75 2 150 5 Q225 8 298 3"
                stroke="url(#u)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="u"
                  x1="0"
                  y1="0"
                  x2="300"
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6ee7b7" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#99f6e4" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </motion.h1>

        {/* Sub-text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg"
        >
          Join thousands of Gombe State University alumni. Find classmates,
          explore career opportunities, build mentorship pathways, and stay
          connected — all in one place.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="group h-12 gap-2 rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30"
          >
            <Link href="/login">
              Get Started Free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <a href="#about">Explore the Platform</a>
          </Button>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8"
        >
          {[
            { icon: Users, text: "10,000+ Alumni" },
            { icon: Briefcase, text: "Active Job Board" },
            { icon: Star, text: "5 Faculties" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-white/50">
              <Icon className="size-3.5 text-emerald-400/70" />
              <span className="text-xs font-medium">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.a
          href="#about"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1.5 text-white/40 transition-colors hover:text-white/70"
        >
          <span className="text-[10px] font-medium tracking-widest uppercase">
            Scroll
          </span>
          <ChevronDown className="size-4" />
        </motion.a>
      </motion.div>
    </section>
  );
}