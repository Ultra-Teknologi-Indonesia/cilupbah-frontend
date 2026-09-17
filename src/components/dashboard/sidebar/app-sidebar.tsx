"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarRailNav } from "./sidebar-rail-nav";
import { SidebarPanel } from "./sidebar-panel";
import DashboardNavigation from "./nav-main";
import { dashboardGroups, findGroupIdForPath, isLeafGroup } from "./nav-data";
import { useVisibleNav } from "./use-visible-nav";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function DashboardSidebar() {
  const { open, setOpen, toggleSidebar, isMobile, openMobile, setOpenMobile } =
    useSidebar();
  const pathname = usePathname();
  const { groups } = useVisibleNav();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = React.useState({ top: 72, maxHeight: 0 });

  const [activeGroupId, setActiveGroupId] = React.useState(() =>
    findGroupIdForPath(pathname, dashboardGroups),
  );

  const [prevPath, setPrevPath] = React.useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setActiveGroupId(findGroupIdForPath(pathname, dashboardGroups));
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  const panelOpen = open && !isLeafGroup(activeGroup);

  useIsomorphicLayoutEffect(() => {
    if (!panelOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const activeEl = container.querySelector<HTMLElement>(
        '[data-rail-active="true"]',
      );
      if (!activeEl) return;
      const cRect = container.getBoundingClientRect();
      const aRect = activeEl.getBoundingClientRect();
      const margin = 12;
      const minRoom = 140;
      const iconTop = aRect.top - cRect.top;
      const maxTop = Math.max(
        margin,
        window.innerHeight - cRect.top - minRoom - margin,
      );
      const top = Math.max(margin, Math.min(iconTop, maxTop));
      const maxHeight = window.innerHeight - cRect.top - top - margin;
      setPanelPos({ top, maxHeight });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [panelOpen, activeGroupId]);

  const handleSelect = React.useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      const hasPanel = group && !isLeafGroup(group);

      if (!hasPanel) {
        setActiveGroupId(id);
        return;
      }

      if (id === activeGroupId) {
        toggleSidebar();
      } else {
        setActiveGroupId(id);
        if (!open) toggleSidebar();
      }
    },
    [activeGroupId, open, toggleSidebar, groups],
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[300px] bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu navigasi</SheetTitle>
            <SheetDescription>Daftar menu dashboard</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col overflow-y-auto px-2 py-4">
            {groups.map((group) => (
              <div key={group.id} className="py-2">
                {group.zone !== "top" && (
                  <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </div>
                )}
                <DashboardNavigation routes={group.items} />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative z-40 hidden h-dvh shrink-0 md:flex md:p-3 md:pr-0"
    >
      {panelOpen && (
        <button
          type="button"
          aria-label="Tutup panel navigasi"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}

      <div className="relative z-50">
        <SidebarRailNav
          activeGroupId={activeGroupId}
          onSelect={handleSelect}
          onTogglePanel={toggleSidebar}
        />
      </div>

      <SidebarPanel
        group={activeGroup}
        open={panelOpen}
        top={panelPos.top}
        maxHeight={panelPos.maxHeight}
      />
    </div>
  );
}
