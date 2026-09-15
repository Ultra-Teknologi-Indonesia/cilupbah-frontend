"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { findActiveNavLink } from "./nav-data";
import { usePermissions } from "@/hooks/auth/use-permissions";
import type { PermissionRequirement } from "@/lib/auth/permissions";

export type SubRoute = {
  title: string;
  link: string;
  badge?: string | number;
  comingSoon?: boolean;

  permission?: PermissionRequirement;
  subs?: {
    title: string;
    link: string;
  }[];
};

export type Route = {
  id: string;
  title: string;
  icon?: React.ElementType;
  link: string;

  match?: string[];
  comingSoon?: boolean;

  permission?: PermissionRequirement;
  subs?: SubRoute[];
};

export default function DashboardNavigation({ routes }: { routes: Route[] }) {
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { can, canAny, canAll } = usePermissions();

  const requirementAllowed = (requirement?: PermissionRequirement) => {
    if (!requirement) return true;
    if (Array.isArray(requirement)) return canAny(requirement);
    if (typeof requirement === "object") return canAll(requirement.all);
    return can(requirement);
  };

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenCollapsible(null);
  }

  const handleNavClick = () => {
    setOpenCollapsible(null);
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const labelClass =
    "min-w-0 truncate transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0";

  const activeLink = findActiveNavLink(pathname);
  const linkIsActive = (link: string) => link === activeLink;

  const isRouteActive = (route: Route) => {
    if (linkIsActive(route.link)) return true;
    if (route.match?.some(linkIsActive)) return true;
    if (route.subs) {
      return route.subs.some(
        (sub) =>
          linkIsActive(sub.link) ||
          (sub.subs?.some((nestedSub) => linkIsActive(nestedSub.link)) ??
            false),
      );
    }
    return false;
  };

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      {routes.map((route) => {
        const routeAllowed = requirementAllowed(route.permission);
        if (!routeAllowed) return null;

        const isActive = isRouteActive(route);
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;
        const Icon = route.icon;

        if (route.comingSoon) {
          return (
            <SidebarMenuItem key={route.id}>
              <SidebarMenuButton
                tooltip={`${route.title} — Segera`}
                className="pointer-events-none opacity-50"
              >
                {Icon && <Icon />}
                <span className={labelClass}>{route.title}</span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0">
                  Segera
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <div className="w-full group-data-[collapsible=icon]:w-auto">
                <SidebarMenuButton
                  tooltip={route.title}
                  isActive={isActive}
                  onClick={() => setOpenCollapsible(isOpen ? null : route.id)}
                >
                  {Icon && <Icon />}
                  <span className={labelClass}>{route.title}</span>
                  <motion.span
                    className="ml-auto transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0"
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { duration: 0.15, ease: "easeInOut" }
                    }
                  >
                    <ChevronRight />
                  </motion.span>
                </SidebarMenuButton>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="submenu"
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                      }
                    >
                      <SidebarMenuSub className="my-1 ml-3.5 border-sidebar-border">
                        {route.subs?.map((subRoute) => {
                          const subAllowed = requirementAllowed(
                            subRoute.permission,
                          );
                          if (!subAllowed) return null;

                          return (
                            <div key={`${route.id}-${subRoute.title}`}>
                              <SidebarMenuSubItem className="h-auto">
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    href={subRoute.link}
                                    onClick={handleNavClick}
                                    className={cn(
                                      "flex items-center justify-between rounded-md px-4 py-1.5 text-sm",
                                      linkIsActive(subRoute.link)
                                        ? "bg-sidebar-accent text-primary font-medium"
                                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                                    )}
                                  >
                                    <span>{subRoute.title}</span>
                                    {subRoute.badge && (
                                      <span className="flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-2xs font-medium text-primary">
                                        {subRoute.badge}
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>

                              {subRoute.subs && subRoute.subs.length > 0 && (
                                <div className="ml-4 mt-1 border-l border-sidebar-border pl-2 flex flex-col gap-1">
                                  {subRoute.subs.map((nestedSub) => (
                                    <SidebarMenuSubItem
                                      key={`${route.id}-${subRoute.title}-${nestedSub.title}`}
                                      className="h-auto"
                                    >
                                      <SidebarMenuSubButton asChild>
                                        <Link
                                          href={nestedSub.link}
                                          onClick={handleNavClick}
                                          className={cn(
                                            "flex items-center rounded-md px-4 py-1 text-xs",
                                            linkIsActive(nestedSub.link)
                                              ? "bg-sidebar-accent text-primary font-medium"
                                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                                          )}
                                        >
                                          <span>{nestedSub.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </SidebarMenuSub>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <SidebarMenuButton
                tooltip={route.title}
                isActive={isActive}
                asChild
              >
                <Link href={route.link} onClick={handleNavClick}>
                  {Icon && <Icon />}
                  <span className={labelClass}>{route.title}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
