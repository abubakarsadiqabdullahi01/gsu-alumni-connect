import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAuthenticatedUser() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdminUser() {
  const session = await requireAuthenticatedUser();
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}
