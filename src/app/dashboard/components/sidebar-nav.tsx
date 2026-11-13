'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Home, LayoutGrid, Package, ShoppingCart, LogOut, Settings, KeyRound, Users, PenSquare, Layers, Search, Hammer, Wrench, Building2, FileText, UserCheck, Lightbulb, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/dashboard/ai-assistant', icon: Sparkles, label: 'AI Operations Manager (اسمارٹ اے آئی)', isAi: true },
  { href: '/dashboard/lampshade-studio', icon: Lightbulb, label: '3D Lampshade & Litho Studio (3D لیمپ شیڈ)' },
  { href: '/dashboard/brochure', icon: FileText, label: 'Brochure & Price List (بروشر و ریٹ لسٹ)' },
  { href: '/dashboard/representatives', icon: UserCheck, label: 'Regional Representatives (نمائندے)' },
  { href: '/dashboard/homepage', icon: Home, label: 'Homepage' },
  { href: '/dashboard/renovation', icon: Wrench, label: 'Renovation Rates & Items' },
  { href: '/dashboard/build-your-home', icon: Hammer, label: 'Build Your Home Rates' },
  { href: '/dashboard/partner-companies', icon: Building2, label: 'Marble Partner Logos' },
  { href: '/dashboard/manage-products', icon: Package, label: 'Products' },
  { href: '/dashboard/manage-stock', icon: Layers, label: 'Manage Stock' },
  { href: '/dashboard/searches', icon: Search, label: 'Search Analytics' },
  { href: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/dashboard/service-providers', icon: Users, label: 'Service Providers' },
  { href: '/dashboard/manual-orders', icon: PenSquare, label: 'Manual Orders & Cutting Optimizer (مینوئل آرڈر و کٹنگ)' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function DashboardSidebarNav() {
  const pathname = usePathname();

  // A simple mapping to handle nested routes for active state
  const getActiveState = (itemHref: string) => {
    if (itemHref === '/dashboard') return pathname === '/dashboard';
    // This makes sure that parent links like '/dashboard/manage-products' are active
    // even on sub-routes like '/dashboard/manage-products/edit/123'
    return pathname.startsWith(itemHref);
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-headline text-lg font-bold">
              Stone Expert
            </span>
          </Link>
          <div className="hidden md:block">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map(item => {
            const isBrochure = item.href === '/dashboard/brochure';
            const isStudio = item.href === '/dashboard/lampshade-studio';
            const isAi = (item as any).isAi || item.href === '/dashboard/ai-assistant';
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={getActiveState(item.href)}
                  tooltip={item.label}
                  className={
                    isAi
                      ? "bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-amber-500/10 hover:from-amber-500/30 text-amber-950 dark:text-amber-200 font-black border border-amber-500/40 shadow-xs"
                      : isStudio 
                      ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 font-bold border border-amber-500/35" 
                      : isBrochure 
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-semibold border border-amber-500/30" 
                      : undefined
                  }
                >
                  <Link href={item.href} className="flex items-center w-full justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={isAi ? "text-amber-500 animate-pulse font-black" : isStudio || isBrochure ? "text-amber-600 dark:text-amber-400 font-bold" : undefined} />
                      <span>{item.label}</span>
                    </div>
                    {isAi ? (
                      <span className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                        AI
                      </span>
                    ) : isStudio ? (
                      <span className="text-[10px] bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        3D STL
                      </span>
                    ) : isBrochure ? (
                      <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        NEW
                      </span>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Company Brochure & PDF" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 font-semibold border border-amber-500/25">
              <Link href="/dashboard/brochure">
                <FileText className="text-amber-600 dark:text-amber-400" />
                <span>Brochure & Price List (بروشر و ریٹ لسٹ)</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Store">
              <Link href="/">
                <Home />
                <span>Back to Store</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
