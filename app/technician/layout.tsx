"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Menu } from "lucide-react";
import { TechnicianSidebar } from "@/components/layout/technician-sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Pages that don't need sidebar
  const noSidebarPages = ["/technician/login", "/technician/verify"];
  const showSidebar = !noSidebarPages.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Allow access to verify and login pages without auth
      if (noSidebarPages.includes(pathname)) {
        setLoading(false);
        return;
      }

      // For other pages, require authentication
      if (!user) {
        router.push("/technician/login");
        return;
      }

      // Check if user is a technician
      const { data: techData } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!techData) {
        router.push("/login");
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <TechnicianSidebar />
      </div>

      {/* Mobile header + drawer nav */}
      <div className="md:hidden sticky top-0 z-40 border-b bg-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-sm font-semibold text-gray-900">Teknisi Portal</div>
              <div className="text-xs text-gray-500">HVAC Djawara</div>
            </div>
          </div>
        </div>

        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent className="p-0 w-[92vw] max-w-sm">
            <TechnicianSidebar
              variant="mobile"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <main className="md:ml-64">
        {children}
      </main>
    </div>
  );
}
