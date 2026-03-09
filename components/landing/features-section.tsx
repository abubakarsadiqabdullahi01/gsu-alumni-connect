"use client";

import { motion } from "framer-motion";
import { Users, Briefcase, GraduationCap, Globe, MessageCircle, MapPin, CalendarDays, Award } from "lucide-react";
import { StaggerContainer, fadeInUpVariant, FadeIn } from "@/components/landing/motion-wrapper";

const features = [
	{
		num: "01",
		icon: Users,
		title: "Alumni Directory",
		description:
			"Search and connect with classmates across all faculties, graduation years, departments, locations, and professions.",
		accent: "from-emerald-500 to-teal-500",
		iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	},
	{
		num: "02",
		icon: Briefcase,
		title: "Job Board",
		description:
			"Discover and post career opportunities shared by fellow GSU alumni. Hire from within the network.",
		accent: "from-blue-500 to-indigo-500",
		iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	},
	{
		num: "03",
		icon: GraduationCap,
		title: "Mentorship",
		description:
			"Connect experienced graduates with fresh alumni for career guidance, industry insights, and professional growth.",
		accent: "from-amber-500 to-orange-500",
		iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	},
	{
		num: "04",
		icon: Globe,
		title: "Alumni Groups",
		description:
			"Join faculty, cohort, and interest-based communities. Share updates, discuss ideas, and stay engaged.",
		accent: "from-purple-500 to-violet-500",
		iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
	},
	{
		num: "05",
		icon: MessageCircle,
		title: "Real-Time Messaging",
		description:
			"Direct and group conversations with fellow graduates. Stay in touch with classmates and professional connections.",
		accent: "from-rose-500 to-pink-500",
		iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
	},
	{
		num: "06",
		icon: MapPin,
		title: "Interactive Map",
		description:
			"Visualize where GSU graduates are located across Nigeria and the world. Find alumni near you.",
		accent: "from-teal-500 to-cyan-500",
		iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
	},
	{
		num: "07",
		icon: CalendarDays,
		title: "Alumni Events",
		description:
			"Stay updated with reunions, workshops, meetups, and networking nights organized by the alumni community.",
		accent: "from-sky-500 to-blue-500",
		iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
	},
	{
		num: "08",
		icon: Award,
		title: "Achievements & Badges",
		description:
			"Showcase your accomplishments, earn recognition badges, and celebrate milestones with the community.",
		accent: "from-yellow-500 to-amber-500",
		iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
	},
];

export function FeaturesSection() {
	return (
		<section id="features" className="relative overflow-hidden bg-muted/20 py-24 lg:py-32">
			{/* Faint dot grid */}
			<div
				className="pointer-events-none absolute inset-0 opacity-40"
				style={{
					backgroundImage:
						"radial-gradient(circle, #10b98120 1px, transparent 1px)",
					backgroundSize: "28px 28px",
				}}
			/>

			<div className="container relative mx-auto px-4 lg:px-8">
				{/* Section header */}
				<div className="mx-auto mb-16 max-w-2xl text-center">
					<FadeIn>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1">
							<span className="size-1.5 rounded-full bg-primary" />
							<span className="text-xs font-semibold tracking-wider text-primary uppercase">
								Platform Features
							</span>
						</div>
					</FadeIn>
					<FadeIn delay={0.1}>
						<h2 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
							Everything You Need to{" "}
							<span className="text-primary">Stay Connected</span>
						</h2>
					</FadeIn>
					<FadeIn delay={0.2}>
						<p className="text-[15px] leading-relaxed text-muted-foreground">
							A comprehensive suite of tools designed to strengthen the GSU alumni
							community and create lasting professional relationships.
						</p>
					</FadeIn>
				</div>

				{/* Grid */}
				<StaggerContainer
					className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
					staggerDelay={0.07}
				>
					{features.map((f) => {
						const Icon = f.icon;
						return (
							<motion.div key={f.num} variants={fadeInUpVariant}>
								<div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-md">
									{/* Top gradient line */}
									<div
										className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${f.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
									/>

									{/* Number + icon row */}
									<div className="mb-4 flex items-center justify-between">
										<div
											className={`flex size-10 items-center justify-center rounded-xl ${f.iconBg}`}
										>
											<Icon className="size-5" />
										</div>
										<span className="text-2xl font-black tracking-tighter text-border/70 transition-colors group-hover:text-border">
											{f.num}
										</span>
									</div>

									{/* Text */}
									<h3 className="mb-1.5 text-[14px] font-bold text-foreground">
										{f.title}
									</h3>
									<p className="text-[13px] leading-relaxed text-muted-foreground">
										{f.description}
									</p>
								</div>
							</motion.div>
						);
					})}
				</StaggerContainer>
			</div>
		</section>
	);
}