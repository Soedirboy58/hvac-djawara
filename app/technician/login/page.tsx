"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function TechnicianLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Prefill email if provided (e.g. redirected from activation page)
  useEffect(() => {
    const emailFromQuery = (searchParams.get('email') || '').trim();
    if (!emailFromQuery) return;
    setFormData((prev) => ({ ...prev, email: emailFromQuery }));
  }, [searchParams]);

  const code = useMemo(() => searchParams.get('code') || '', [searchParams]);
  const type = useMemo(() => searchParams.get('type') || '', [searchParams]);

  // Safety net: invite links sometimes land on /technician/login.
  // If we detect invite parameters/tokens, redirect to /technician/invite to set password.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const hasInviteHashToken = hash.includes('access_token=') && hash.includes('refresh_token=');

    if (hasInviteHashToken) {
      router.replace(`/technician/invite${hash}`);
      return;
    }

    if (code) {
      const qs = new URLSearchParams();
      qs.set('code', code);
      router.replace(`/technician/invite?${qs.toString()}`);
      return;
    }

    if (type === 'invite') {
      router.replace('/technician/invite');
    }
  }, [code, type, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Verify user is a technician
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (techError || !techData) {
        await supabase.auth.signOut();
        throw new Error("Akun ini bukan akun teknisi");
      }

      toast.success("Login berhasil!");
      router.push("/technician/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Login Teknisi</CardTitle>
          <CardDescription>
            Masukkan email dan password Anda untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="teknisi@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Belum punya akun?</p>
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("/technician/verify")}
                className="p-0 h-auto"
              >
                Aktivasi via token (cadangan)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Jika menerima email undangan, buka link di email untuk membuat password.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
