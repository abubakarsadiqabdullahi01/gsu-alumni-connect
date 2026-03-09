"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#leadership", label: "Leadership" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border/40 bg-background/95 shadow-sm shadow-black/5 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-[68px] lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 outline-none">
          <div
            className={`relative flex size-9 items-center justify-center rounded-xl transition-all ${
              scrolled
                ? "bg-primary/10"
                : "bg-white/10 backdrop-blur-sm"
            }`}
          >
            <Image
              src="/images/gsu-logo.svg"
              alt="GSU Logo"
              width={26}
              height={26}
              className={`transition-all ${scrolled ? "invert dark:invert-0" : ""}`}
            />
          </div>
          <div className="flex flex-col">
            <span
              className={`text-[13px] font-bold leading-tight tracking-tight transition-colors ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              GSU Alumni Connect
            </span>
            <span
              className={`text-[10px] leading-tight transition-colors ${
                scrolled ? "text-muted-foreground" : "text-white/60"
              }`}
            >
              Gombe State University
            </span>
          </div>
        </Link>

        {/* Desktop Navigation — pill container */}
        <div
          className={`hidden items-center gap-0.5 rounded-full px-1.5 py-1 md:flex ${
            scrolled
              ? "border border-border/50 bg-muted/40"
              : "border border-white/10 bg-white/5 backdrop-blur-sm"
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                scrolled
                  ? "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Button
            asChild
            size="sm"
            className={`h-9 rounded-full px-5 text-[13px] font-semibold transition-all ${
              scrolled
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                : "border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            }`}
          >
            <Link href="/login">Sign In →</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`size-9 rounded-xl ${
                scrolled
                  ? "hover:bg-accent"
                  : "text-white hover:bg-white/10 hover:text-white"
              }`}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              {/* Sheet header */}
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Image
                    src="/images/gsu-logo.svg"
                    alt="GSU"
                    width={20}
                    height={20}
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
              </div>
              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-3">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto border-t p-4">
                <Button asChild className="w-full rounded-xl">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}