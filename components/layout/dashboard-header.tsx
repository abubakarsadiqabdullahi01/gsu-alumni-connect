"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUnreadNotificationsCountEnabled } from "@/hooks/use-unread-notifications";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export function DashboardHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const notificationsHref = isAdminRoute ? "/admin/notifications" : "/notifications";
  const unreadEndpoint = isAdminRoute ? "/api/admin/notifications" : "/api/notifications";
  const unreadCount = useUnreadNotificationsCountEnabled(true, 60000, unreadEndpoint);
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-md">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-5" />

        {/* Breadcrumb */}
        {title && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-semibold">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden w-64 md:block">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search alumni, jobs, groups…"
          className="h-8 rounded-lg bg-muted/50 pl-8 text-xs"
        />
      </div>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative size-8" asChild>
        <Link href={notificationsHref}>
          <Bell className="size-3.5" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px]">
              {unreadLabel}
            </Badge>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Link>
      </Button>
      </header>

      {/* Subtitle Section */}
      {subtitle && (
        <div className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/50 px-4 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
      )}
    </>
  );
}
