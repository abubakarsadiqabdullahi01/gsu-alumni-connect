"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Handshake,
  MessageCircle,
  UsersRound,
  GraduationCap,
  Bell,
  UserCircle,
  Settings,
  MapPin,
  LogOut,
  Award,
  CalendarDays,
  Activity,
  Shield,
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
import { useUnreadNotificationsCount } from "@/hooks/use-unread-notifications";

type SidebarNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  featureKey?: keyof FeatureVisibility;
};

type FeatureVisibility = {
  featureJobBoard: boolean;
  featureMentorship: boolean;
  featureMessaging: boolean;
  featureMap: boolean;
  featureGroups: boolean;
};

const mainNav: SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feed", label: "Activity Feed", icon: Activity },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/jobs", label: "Job Board", icon: Briefcase, featureKey: "featureJobBoard" },
  { href: "/connections", label: "Connections", icon: Handshake },
  { href: "/groups", label: "Groups", icon: UsersRound, featureKey: "featureGroups" },
  { href: "/messages", label: "Messages", icon: MessageCircle, featureKey: "featureMessaging" },
];

const secondaryNav: SidebarNavItem[] = [
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/mentorship", label: "Mentorship", icon: GraduationCap, featureKey: "featureMentorship" },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/map", label: "Alumni Map", icon: MapPin, featureKey: "featureMap" },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const bottomNav = [
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type AppSidebarProps = {
  userName: string;
  registrationNo: string;
  isAdmin: boolean;
  features: FeatureVisibility;
};

export function AppSidebar({ userName, registrationNo, isAdmin, features }: AppSidebarProps) {
  const pathname = usePathname();
  const userInitials = initialsFromName(userName);
  const unreadNotifications = useUnreadNotificationsCount();
  const unreadLabel = unreadNotifications > 99 ? "99+" : String(unreadNotifications);
  const filteredMainNav = mainNav.filter((item) => !item.featureKey || features[item.featureKey]);
  const filteredSecondaryNav = secondaryNav.filter((item) => !item.featureKey || features[item.featureKey]);

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Header */}
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
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
              Alumni Connect
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">
              Gombe State University
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-bold"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSecondaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isNotification = item.href === "/notifications";
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                        {isNotification && unreadNotifications > 0 ? (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-bold"
                          >
                            {unreadLabel}
                          </Badge>
                        ) : null}
                        {item.badge && !isNotification && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-bold"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Switch View</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Admin Panel">
                      <Link href="/admin">
                        <Shield />
                        <span>Admin Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
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

        <SidebarSeparator />

        {/* User */}
        <DropdownMenu>
          <ClientOnly
            fallback={
              <button
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent"
                type="button"
                suppressHydrationWarning
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <span className="text-[13px] font-semibold leading-tight">
                    {userName}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/50">
                    {registrationNo}
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
                  <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <span className="text-[13px] font-semibold leading-tight">
                    {userName}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/50">
                    {registrationNo}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
          </ClientOnly>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="mr-2 size-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 size-4" />
                Settings
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
