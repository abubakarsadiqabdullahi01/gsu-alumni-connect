import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { AboutSection } from "@/components/landing/about-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { StatsSection } from "@/components/landing/stats-section";
import { LeadershipSection } from "@/components/landing/leadership-section";
import { DeveloperSection } from "@/components/landing/developer-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const session = await getServerSession();
  if (session) {
    if (session.user.role === "admin") {
      redirect("/admin");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultPassword: true },
    });

    if (user?.defaultPassword) {
      redirect("/onboarding");
    }

    redirect("/dashboard");
  }

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <StatsSection />
        <LeadershipSection />
        <DeveloperSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
