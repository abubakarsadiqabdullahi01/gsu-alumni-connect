"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import {
  GraduationCap,
  Building2,
  BookOpen,
  CalendarDays,
} from "lucide-react";

function useCountUp(end: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return count;
}

const stats = [
  {
    icon: GraduationCap,
    value: 10000,
    suffix: "+",
    label: "Alumni Graduates",
    desc: "Across Nigeria & beyond",
  },
  {
    icon: Building2,
    value: 5,
    suffix: "",
    label: "Faculties",
    desc: "Academic divisions",
  },
  {
    icon: BookOpen,
    value: 50,
    suffix: "+",
    label: "Departments",
    desc: "Fields of study",
  },
  {
    icon: CalendarDays,
    value: 20,
    suffix: "+",
    label: "Years of Excellence",
    desc: "Since 2004",
  },
];

export function StatsSection() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.25,
  });

  return (
    <section className="relative overflow-hidden py-20 lg:py-24">
      {/* Rich deep green background */}
      <div className="absolute inset-0 bg-[#032d1f]" />
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
        }}
      />
      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-700/20 blur-[80px]" />

      <div ref={ref} className="container relative z-10 mx-auto px-4 lg:px-8">
        {/* Dividers layout */}
        <div className="grid grid-cols-2 divide-x divide-white/10 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <StatCard
                key={s.label}
                {...s}
                icon={Icon}
                inView={inView}
                isLast={i === stats.length - 1}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  desc,
  inView,
  isLast,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix: string;
  label: string;
  desc: string;
  inView: boolean;
  isLast: boolean;
}) {
  const count = useCountUp(value, 2000, inView);

  return (
    <div
      className={`flex flex-col items-center px-4 py-10 text-center lg:px-8 ${
        isLast ? "" : ""
      }`}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Icon className="size-6 text-emerald-400" />
      </div>
      <div className="mb-1 text-4xl font-black tracking-tight text-white lg:text-5xl">
        {count.toLocaleString()}
        {suffix}
      </div>
      <p className="mb-1 text-sm font-semibold text-white/90">{label}</p>
      <p className="text-xs text-white/40">{desc}</p>
    </div>
  );
}