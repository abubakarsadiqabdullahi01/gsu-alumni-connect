import Image from "next/image";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuthenticatedUser();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultPassword: true },
  });

  if (!user?.defaultPassword) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Minimal header */}
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Image src="/images/gsu-logo.svg" alt="GSU" width={18} height={18} />
        </div>
        <div>
          <p className="text-[13px] font-bold leading-tight">GSU Alumni Connect</p>
          <p className="text-[10px] text-muted-foreground">Complete your profile setup</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-start justify-center p-4 pt-8 md:p-8 md:pt-12">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
