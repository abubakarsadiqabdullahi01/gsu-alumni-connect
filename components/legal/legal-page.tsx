import type { ReactNode } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

/**
 * Shell for the public policy pages. The dark band sits under the landing
 * navbar, whose text is white until the page scrolls.
 */
export function LegalPage({
  title,
  summary,
  updated,
  children,
}: {
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-b from-black via-emerald-950 to-emerald-900 pt-28 pb-12 text-white lg:pt-32">
          <div className="container mx-auto max-w-3xl px-4 lg:px-8">
            <p className="mb-3 text-[11px] font-bold tracking-widest text-emerald-300 uppercase">
              GSU Alumni Connect
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/75">{summary}</p>
            <p className="mt-4 text-[12px] text-white/50">Last updated {updated}</p>
          </div>
        </section>
        <article
          className="container mx-auto max-w-3xl px-4 py-12 text-[15px] leading-relaxed text-foreground/85 lg:px-8
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground
            [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-foreground
            [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-3 [&_strong]:text-foreground
            [&_table]:mt-4 [&_table]:w-full [&_table]:text-[14px] [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top
            [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
            [&_ul]:list-disc [&_ul]:pl-6"
        >
          {children}
        </article>
      </main>
      <Footer />
    </>
  );
}

export const PUBLISHER = {
  name: "Gombe State University",
  association: "Gombe State University Alumni Association",
  address: "University Road, Tudun Wada, Gombe, Gombe State, Nigeria, 760214",
  email: "alumni@gsu.edu.ng",
  website: "https://www.gsualumni.org.ng",
};
