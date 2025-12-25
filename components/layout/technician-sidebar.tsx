"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Star,
  GraduationCap,
  DollarSign,
  Receipt,
  Settings,
  ClipboardList,
  Clock,
  ChevronRight,
  User,
} from "lucide-react";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  description?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/technician/dashboard",
    icon: LayoutDashboard,
    description: "Tugas & monitoring pekerjaan",
  },
  {
    title: "Kehadiran",
    href: "/technician/attendance",
    icon: Calendar,
    description: "Absensi & riwayat kehadiran",
  },
  {
    title: "Lembur",
    href: "/technician/overtime",
    icon: Clock,
    description: "Pengajuan & riwayat lembur",
  },
  {
    title: "Cuti",
    href: "/technician/leave",
    icon: ClipboardList,
    description: "Pengajuan cuti/izin & status",
  },
  {
    title: "Komunikasi",
    href: "/technician/messages",
    icon: MessageSquare,
    badge: "Soon",
    disabled: true,
    description: "Chat & pesan dengan tim",
  },
  {
    title: "Performa & Rating",
    href: "/technician/performance",
    icon: Star,
    disabled: true,
    description: "Rating & feedback pelanggan",
  },
  {
    title: "Pelatihan",
    href: "/technician/training",
    icon: GraduationCap,
    disabled: true,
    description: "Materi training & sertifikasi",
  },
  {
    title: "Gaji & Bonus",
    href: "/technician/salary",
    icon: DollarSign,
    disabled: true,
    description: "Slip gaji & riwayat pembayaran",
  },
  {
    title: "Reimburse",
    href: "/technician/reimburse",
    icon: Receipt,
    description: "Ajukan reimburse biaya operasional",
  },
  {
    title: "Pengaturan",
    href: "/technician/settings",
    icon: Settings,
    description: "Data diri & preferensi",
  },
];

export function TechnicianSidebar({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isMobile = variant === "mobile";

  return (
    <aside
      className={cn(
        "bg-white flex flex-col",
        isMobile
          ? "w-full max-h-[80vh] h-[80vh]"
          : "w-64 border-r h-screen fixed left-0 top-0"
      )}
    >
      {/* Header */}
      <div className={cn("border-b", isMobile ? "p-5" : "p-6")}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Teknisi Portal</h2>
            <p className="text-xs text-gray-500">HVAC Djawara</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : item.disabled
                    ? "text-gray-400 cursor-not-allowed hover:bg-gray-50"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                    return;
                  }
                  onNavigate?.();
                }}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive
                      ? "text-blue-600"
                      : item.disabled
                      ? "text-gray-400"
                      : "text-gray-500 group-hover:text-gray-700"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
                {!item.disabled && (
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                      isActive ? "opacity-100" : ""
                    )}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Fitur Dalam Pengembangan
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                Fitur kehadiran, komunikasi, dan lainnya sedang dalam tahap
                pengembangan dan akan segera tersedia.
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          <span>v1.0.0 - Teknisi Dashboard</span>
        </div>
      </div>
    </aside>
  );
}
