"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Eye, Save, Send } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface QuotationItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface CompanySettings {
  company_legal_name: string;
  company_trade_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_logo_url: string;
  quotation_prefix: string;
  quotation_validity_days: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  npwp: string;
}

interface ContractRequest {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  city?: string;
  unit_count: number;
  preferred_frequency: string;
}

interface QuotationFormProps {
  contractRequest: ContractRequest;
  tenantId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function QuotationForm({
  contractRequest,
  tenantId,
  onSuccess,
  onCancel,
}: QuotationFormProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: "1",
      name: "Cuci AC 1 PK",
      quantity: 1,
      unit: "unit",
      price: 150000,
      total: 150000,
    },
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("30% DP, 70% setelah pekerjaan selesai");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchCompanySettings();
  }, [tenantId]);

  const fetchCompanySettings = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          company_legal_name,
          company_trade_name,
          company_address,
          company_phone,
          company_email,
          company_logo_url,
          quotation_prefix,
          quotation_validity_days,
          bank_name,
          bank_account_number,
          bank_account_holder,
          npwp
        `)
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast.error("Gagal memuat data perusahaan");
    }
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      unit: "unit",
      price: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error("Minimal harus ada 1 item");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Auto-calculate total
          if (field === "quantity" || field === "price") {
            updated.total = updated.quantity * updated.price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * 0.11; // PPN 11%
  const grandTotal = afterDiscount + taxAmount;

  const handleSave = async (status: "draft" | "sent") => {
    // Validation
    if (!items.every((item) => item.name && item.quantity > 0 && item.price > 0)) {
      toast.error("Lengkapi semua item penawaran");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      // Call function to create quotation
      const { data, error } = await supabase.rpc("create_quotation_from_request", {
        p_tenant_id: tenantId,
        p_contract_request_id: contractRequest.id,
        p_items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
        })),
        p_subtotal: subtotal,
        p_discount_percent: discountPercent,
        p_payment_terms: paymentTerms,
        p_notes: notes,
      });

      if (error) throw error;

      // Update quotation status if sent
      if (status === "sent") {
        await supabase
          .from("quotations")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", data);
      }

      toast.success(
        status === "sent"
          ? "Penawaran berhasil dikirim!"
          : "Draft penawaran disimpan!"
      );
      onSuccess?.();
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error("Gagal menyimpan penawaran");
    } finally {
      setIsLoading(false);
    }
  };

  if (!companySettings) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Memuat data perusahaan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Company Logo */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {companySettings.company_logo_url && (
                <Image
                  src={companySettings.company_logo_url}
                  alt="Company Logo"
                  width={120}
                  height={60}
                  className="mb-2 object-contain"
                />
              )}
              <h2 className="text-2xl font-bold">
                {companySettings.company_legal_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {companySettings.company_trade_name}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">SURAT PENAWARAN</p>
              <p className="text-muted-foreground">
                Tanggal: {new Date().toLocaleDateString("id-ID")}
              </p>
              <p className="text-muted-foreground">
                Berlaku: {companySettings.quotation_validity_days} hari
              </p>
            </div>
          </div>

          <Separator />

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Dari:</h3>
              <div className="text-sm space-y-1">
                <p>{companySettings.company_address}</p>
                <p>Telp: {companySettings.company_phone}</p>
                <p>Email: {companySettings.company_email}</p>
                <p>NPWP: {companySettings.npwp}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Kepada:</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{contractRequest.company_name}</p>
                <p>{contractRequest.contact_person}</p>
                <p>Telp: {contractRequest.phone}</p>
                {contractRequest.email && <p>Email: {contractRequest.email}</p>}
                {contractRequest.city && <p>{contractRequest.city}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rincian Penawaran</span>
            <Button onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-1 pt-2">
                  <p className="text-sm text-muted-foreground">{index + 1}.</p>
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Nama item / jasa"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    value={item.unit}
                    onValueChange={(value) => updateItem(item.id, "unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="lokasi">Lokasi</SelectItem>
                      <SelectItem value="bulan">Bulan</SelectItem>
                      <SelectItem value="paket">Paket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Harga"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.id, "price", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="col-span-12 text-right text-sm text-muted-foreground">
                  Total: Rp {item.total.toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Totals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Subtotal</Label>
              <p className="font-medium">Rp {subtotal.toLocaleString("id-ID")}</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label>Diskon</Label>
                <Input
                  type="number"
                  className="w-20"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(parseFloat(e.target.value) || 0)
                  }
                />
                <span className="text-sm">%</span>
              </div>
              <p className="text-destructive">
                - Rp {discountAmount.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <Label>PPN 11%</Label>
              <p>Rp {taxAmount.toLocaleString("id-ID")}</p>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <Label className="text-lg font-bold">TOTAL</Label>
              <p className="text-2xl font-bold text-primary">
                Rp {grandTotal.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Ketentuan & Catatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Syarat Pembayaran</Label>
            <Textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Contoh: 30% DP, 70% setelah pekerjaan selesai"
            />
          </div>
          <div>
            <Label>Catatan Tambahan</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan khusus, syarat & ketentuan, dll..."
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">Informasi Pembayaran:</p>
            <p>
              {companySettings.bank_name} - {companySettings.bank_account_number}
            </p>
            <p>a/n {companySettings.bank_account_holder}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Sembunyikan" : "Preview"}
          </Button>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Batal
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan Draft
          </Button>
          <Button onClick={() => handleSave("sent")} disabled={isLoading}>
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Mengirim..." : "Kirim Penawaran"}
          </Button>
        </div>
      </div>
    </div>
  );
}
