"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TechnicianSidebar } from "@/components/layout/technician-sidebar";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

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
      <TechnicianSidebar />
      <main className="ml-64">
        {children}
      </main>
    </div>
  );
}
