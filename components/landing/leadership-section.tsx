import Image from "next/image";
import { Quote, ShieldCheck, UsersRound } from "lucide-react";
import { FadeIn } from "@/components/landing/motion-wrapper";

type Leader = {
  role: string;
  name: string;
  title: string;
  accent: string;
  borderAccent: string;
  icon: React.ElementType;
  message: string;
  image: string;
};

const leaders: Leader[] = [
  {
    role: "Vice Chancellor",
    name: "Prof. Sani Ahmad Yauta",
    title: "Gombe State University",
    image: "/images/VC.jpeg",
    icon: ShieldCheck,
    accent: "from-emerald-500 to-teal-500",
    borderAccent: "border-l-emerald-500",
    message:
        "Gombe State University continues to nurture leaders, innovators, and change-makers. Our alumni are our greatest pride - carrying the torch of academic excellence and community service wherever they go. This platform strengthens the bond between our institution and its graduates.",
  },
  {
    role: "Association President",
    name: "Dr. Buhari Magaji",
    title: "GSU Alumni Association",
    image: "/images/president.png",
    icon: UsersRound,
    accent: "from-blue-500 to-indigo-500",
    borderAccent: "border-l-blue-500",
    message:
        "The GSU Alumni Association is committed to fostering unity, professional growth, and giving back to our alma mater. Through this platform, we can reconnect with old friends, create new opportunities, and collectively contribute to the development of Gombe State University.",
  },
];

export function LeadershipSection() {
  return (
      <section
          id="leadership"
          className="relative overflow-hidden bg-background py-24 lg:py-32"
      >
        {/* Background radial glows */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,hsl(var(--primary)/0.12),transparent_36%),radial-gradient(circle_at_90%_92%,hsl(var(--primary)/0.1),transparent_34%)]" />

        <div className="container relative mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="mx-auto mb-16 max-w-xl text-center">
            <FadeIn>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                Leadership
              </span>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Messages from Our{" "}
                <span className="text-primary">Leaders</span>
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-[15px] text-muted-foreground">
                Hear from the university leadership and alumni association about
                the vision behind GSU Alumni Connect.
              </p>
            </FadeIn>
          </div>

          {/* Cards */}
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            {leaders.map((leader, i) => {
              const Icon = leader.icon;
              return (
                  <FadeIn key={leader.role} delay={i * 0.15}>
                    <article
                        className={`group relative overflow-hidden rounded-2xl border border-border/60 border-l-4 ${leader.borderAccent} bg-card shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* ── Left: Image Column ── */}
                        <div className="relative shrink-0 sm:w-52 lg:w-60">
                          {/* Photo */}
                          <div className="relative aspect-[3/4] w-full overflow-hidden sm:h-full sm:aspect-auto rounded-t-2xl sm:rounded-t-none sm:rounded-l-none bg-muted">
                            <Image
                                src={leader.image}
                                alt={`${leader.name} – ${leader.title}`}
                                fill
                                sizes="(max-width: 640px) 100vw, 240px"
                                className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                                priority={i === 0}
                            />
                            {/* Stronger gradient overlay at bottom for badge legibility */}
                            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

                            {/* Badges stacked at bottom */}
                            <div className="absolute inset-x-0 bottom-3 z-10 flex flex-col items-start gap-1.5 px-3">
                              {/* Name badge */}
                              <span className="inline-flex items-center rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm shadow">
                            {leader.name}
                          </span>
                              {/* Role badge */}
                              <span
                                  className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-[10px] font-semibold tracking-wider text-white uppercase shadow-md ${leader.accent}`}
                              >
                            <Icon className="size-3" />
                                {leader.role}
                          </span>
                            </div>
                          </div>
                        </div>

                        {/* ── Right: Content Column ── */}
                        <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-8">
                          {/* Decorative quote icon */}
                          <Quote className="absolute right-5 top-5 size-16 text-primary/8 rotate-180" />

                          <div>
                            {/* Name & Title */}
                            <div className="mb-5">
                              <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                                {leader.name}
                              </h3>
                              <p className="mt-0.5 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                                {leader.title}
                              </p>
                            </div>

                            {/* Divider */}
                            <div
                                className={`mb-5 h-px w-16 rounded-full bg-gradient-to-r ${leader.accent}`}
                            />

                            {/* Message */}
                            <p className="text-[13.5px] leading-[1.85] text-muted-foreground">
                              &ldquo;{leader.message}&rdquo;
                            </p>
                          </div>

                          {/* Animated bottom bar */}
                          <div className="mt-6 h-1 w-12 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full w-0 rounded-full bg-gradient-to-r ${leader.accent} transition-all duration-700 group-hover:w-full`}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  </FadeIn>
              );
            })}
          </div>
        </div>
      </section>
  );
}