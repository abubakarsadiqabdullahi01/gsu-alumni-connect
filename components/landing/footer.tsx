import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Mail, MapPin } from "lucide-react";

const quickLinks = [
	{ href: "#about", label: "About" },
	{ href: "#features", label: "Features" },
	{ href: "#leadership", label: "Leadership" },
	{ href: "/login", label: "Sign In" },
];

const resourceLinks = [
	{ href: "#", label: "Privacy Policy" },
	{ href: "#", label: "Terms of Service" },
	{ href: "#", label: "Help & Support" },
	{ href: "#", label: "Contact Us" },
];

export function Footer() {
	return (
		<footer id="contact" className="border-t border-border/50 bg-muted/20">
			<div className="container mx-auto px-4 py-14 lg:px-8 lg:py-16">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
					{/* Brand */}
					<div className="sm:col-span-2 lg:col-span-1">
						<Link href="/" className="mb-4 flex items-center gap-2.5">
							<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
								<Image
									src="/images/gsu-logo.svg"
									alt="GSU Logo"
									width={22}
									height={22}
									className="invert dark:invert-0"
								/>
							</div>
							<div>
								<p className="text-[13px] font-bold leading-tight">
									GSU Alumni Connect
								</p>
								<p className="text-[10px] text-muted-foreground">
									Gombe State University
								</p>
							</div>
						</Link>
						<p className="mb-4 max-w-[220px] text-[13px] leading-relaxed text-muted-foreground">
							The official digital platform connecting Gombe State University
							graduates across Nigeria and beyond.
						</p>
						<p className="text-[11px] font-medium text-muted-foreground/60 italic">
							&ldquo;Knowledge for Service&rdquo;
						</p>
					</div>

					{/* Quick Links */}
					<div>
						<h3 className="mb-4 text-[11px] font-bold tracking-widest text-foreground uppercase">
							Quick Links
						</h3>
						<ul className="space-y-2.5">
							{quickLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Resources */}
					<div>
						<h3 className="mb-4 text-[11px] font-bold tracking-widest text-foreground uppercase">
							Resources
						</h3>
						<ul className="space-y-2.5">
							{resourceLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Contact */}
					<div>
						<h3 className="mb-4 text-[11px] font-bold tracking-widest text-foreground uppercase">
							Contact
						</h3>
						<ul className="space-y-3">
							<li className="flex items-start gap-2 text-[13px] text-muted-foreground">
								<MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
								<span>
									Tudun Wada, Gombe
									<br />
									Gombe State, Nigeria
								</span>
							</li>
							<li className="flex items-center gap-2 text-[13px]">
								<Mail className="size-3.5 shrink-0 text-primary/60" />
								<a
									href="mailto:alumni@gsu.edu.ng"
									className="text-primary transition-colors hover:text-primary/80"
								>
									alumni@gsu.edu.ng
								</a>
							</li>
						</ul>
					</div>
				</div>

				<Separator className="my-8 bg-border/50" />

				<div className="flex flex-col items-center justify-between gap-3 text-[11px] text-muted-foreground/60 sm:flex-row">
					<p>
						© {new Date().getFullYear()} GSU Alumni Connect. All rights reserved.
					</p>
					<p>Est. 2004 · Gombe State University, Nigeria</p>
				</div>
			</div>
		</footer>
	);
}