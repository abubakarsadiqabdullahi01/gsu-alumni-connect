"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  Settings,
  Briefcase,
  UsersRound,
  BarChart3,
  Shield,
  GraduationCap,
  Globe,
  Trophy,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientOnly } from "@/components/shared/client-only";
import { SignOutButton } from "@/components/auth/sign-out-button";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/graduates", label: "Graduates", icon: Users },
  { href: "/admin/uploads", label: "Uploads", icon: Upload },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/achievements", label: "Achievements", icon: Trophy },
  { href: "/admin/groups", label: "Groups", icon: UsersRound },
  { href: "/admin/mentorship", label: "Mentorship", icon: GraduationCap },
  { href: "/admin/network", label: "Network", icon: Globe },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Header */}
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Image
              src="/images/gsu-logo.svg"
              alt="GSU"
              width={18}
              height={18}
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-bold leading-tight">
              Admin Panel
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">
              GSU Alumni Connect
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Shield className="mr-1.5 size-3" />
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Quick link back to alumni app */}
        <SidebarGroup>
          <SidebarGroupLabel>Switch View</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Alumni Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Alumni Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarSeparator />
        <DropdownMenu>
          <ClientOnly
            fallback={
              <button
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent"
                type="button"
                suppressHydrationWarning
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-destructive/15 text-xs font-bold text-destructive">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold leading-tight">
                      Admin
                    </span>
                    <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                      Admin
                    </Badge>
                  </div>
                  <span className="text-[10px] text-sidebar-foreground/50">
                    System Administrator
                  </span>
                </div>
              </button>
            }
          >
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent"
                type="button"
                suppressHydrationWarning
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-destructive/15 text-xs font-bold text-destructive">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold leading-tight">
                      Admin
                    </span>
                    <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                      Admin
                    </Badge>
                  </div>
                  <span className="text-[10px] text-sidebar-foreground/50">
                    System Administrator
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
          </ClientOnly>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 size-4" />
                Admin Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0" asChild>
              <div className="w-full">
                <SignOutButton
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start rounded-none px-2 text-destructive hover:text-destructive"
                />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
