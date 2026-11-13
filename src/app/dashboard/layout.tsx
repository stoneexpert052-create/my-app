'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarNav } from './components/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useTheme } from '@/context/theme-context';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Clock, FileText, Sparkles } from 'lucide-react';
import { AdminBackground } from '@/components/admin-background';
import { FloatingAdminAiWidget } from '@/components/admin-ai/floating-ai-widget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, themeMode, toggleTheme, hydrated } = useTheme();

  return (
    <div className="relative min-h-screen bg-transparent">
        <AdminBackground />
        <SidebarProvider>
        <Sidebar className="bg-background/90 backdrop-blur-md border-r">
            <DashboardSidebarNav />
        </Sidebar>
        <SidebarInset className="bg-transparent">
             <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md">
                <div className="flex items-center gap-4 flex-1">
                  <div className="md:hidden">
                      <SidebarTrigger />
                  </div>
                  <div className="flex-1">
                    <div className="hidden md:flex items-center gap-2">
                      <SidebarTrigger />
                      <h1 className="font-headline text-xl font-bold">Admin Panel</h1>
                    </div>
                     <Link href="/dashboard" className="flex items-center gap-2 font-headline text-lg font-bold md:hidden">
                          <span>Admin Panel</span>
                     </Link>
                  </div>
                </div>

                {/* Right actions: AI Manager Button, Brochure Button & Theme Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 shadow-sm border border-amber-300"
                  >
                    <Link href="/dashboard/ai-assistant">
                      <Sparkles className="h-4 w-4" />
                      <span>AI Manager</span>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="font-semibold text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 shadow-xs hidden sm:flex"
                  >
                    <Link href="/dashboard/brochure">
                      <FileText className="h-4 w-4" />
                      <span>Brochure</span>
                    </Link>
                  </Button>

                  {hydrated && (
                    <>
                      {themeMode === 'auto' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted text-[11px] text-muted-foreground font-medium animate-pulse" title="Auto Day/Night Mode is Active">
                          <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                          <span className="hidden sm:inline">Auto Mode</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary/80 h-9 w-9"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        <span className="sr-only">Toggle theme</span>
                      </Button>
                    </>
                  )}
                </div>
            </header>
            {children}
        </SidebarInset>
        </SidebarProvider>
        <FloatingAdminAiWidget />
        <Toaster />
    </div>
  );
}
