"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TechnicianVerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [step, setStep] = useState<"verify" | "password">("verify");
  const [formData, setFormData] = useState({
    email: "",
    token: "",
    password: "",
    confirmPassword: "",
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      // Call the verification RPC function
      const { data, error } = await supabase.rpc("verify_technician_token", {
        p_email: formData.email,
        p_token: formData.token,
      });

      if (error) throw error;

      if (!data) {
        throw new Error("Token tidak valid atau sudah expired");
      }

      // Token verified successfully
      toast.success("Token valid! Silakan buat password.");
      setStep("password");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verifikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      // Call API route to create account with admin privileges
      const response = await fetch("/api/technician/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          token: formData.token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if account already exists
        if (data.already_exists) {
          setAlreadyExists(true);
          toast.error(data.message || "Akun sudah terdaftar");
          return;
        }
        throw new Error(data.error || "Gagal membuat akun");
      }

      setVerified(true);
      toast.success("Akun berhasil dibuat! Silakan login.");
      
      // Redirect to technician login
      setTimeout(() => {
        router.push("/technician/login");
      }, 2000);
    } catch (error: any) {
      console.error("Create password error:", error);
      toast.error(error.message || "Gagal membuat akun");
    } finally {
      setLoading(false);
    }
  };

  // Show "already exists" message with login link
  if (alreadyExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Akun Sudah Terdaftar</CardTitle>
            <CardDescription>
              Akun Anda sudah dibuat sebelumnya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-2">✅ Akun Anda sudah aktif!</p>
              <p>
                Silakan login dengan email <strong>{formData.email}</strong> dan 
                password yang telah Anda buat sebelumnya.
              </p>
            </div>

            <Link href="/technician/login" className="block">
              <Button className="w-full" size="lg">
                Login Sekarang
              </Button>
            </Link>

            <div className="text-center text-sm text-muted-foreground">
              <p>Lupa password?</p>
              <p>Hubungi admin untuk reset</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Buat Password</CardTitle>
            <CardDescription>
              Token terverifikasi! Silakan buat password untuk login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePassword} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ketik ulang password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat Akun...
                  </>
                ) : (
                  "Buat Akun & Login"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Sudah punya akun?</p>
                <Link href="/technician/login" className="text-blue-600 hover:underline">
                  Login di sini
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verifikasi Teknisi</CardTitle>
          <CardDescription>
            Masukkan email dan token verifikasi yang Anda terima dari admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
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
              <Label htmlFor="token">Token Verifikasi</Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste token dari admin"
                value={formData.token}
                onChange={(e) =>
                  setFormData({ ...formData, token: e.target.value })
                }
                required
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Token terdiri dari 32 karakter
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Verifikasi & Buat Akun"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Belum punya token?</p>
              <p>Hubungi admin untuk mendapatkan akses</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
