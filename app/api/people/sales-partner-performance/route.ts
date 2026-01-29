import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = ["owner", "admin_finance", "admin_logistic", "tech_head"] as const;

type JobItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

type JobRow = {
  order_id: string;
  order_number: string | null;
  service_title: string | null;
  completed_at: string | null;
  client_name: string | null;
  sales_partner_id: string | null;
  sales_partner_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
  invoice_total: number;
  items: JobItem[];
};

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

async function getAdminContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) } as const;
  }

  const tenantId = String((profile as any)?.active_tenant_id || "").trim();
  if (!tenantId) {
    return { error: NextResponse.json({ error: "No active tenant" }, { status: 409 }) } as const;
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_tenant_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (roleError) {
    return { error: NextResponse.json({ error: roleError.message }, { status: 500 }) } as const;
  }

  const role = String((roleRow as any)?.role || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(role as any)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      ),
    } as const;
  }

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  return { admin, tenantId } as const;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if ("error" in ctx) return ctx.error;

    const { searchParams } = new URL(request.url);
    const page = clampNumber(searchParams.get("page"), 1, 1, 9999);
    const pageSize = clampNumber(searchParams.get("pageSize"), 10, 5, 50);
    const salesPartnerId = String(searchParams.get("salesPartnerId") || "").trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize;

    const { data: partnersRaw, error: partnersError } = await ctx.admin
      .from("user_tenant_roles")
      .select("user_id, role, profiles:user_id(full_name)")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true)
      .eq("role", "sales_partner");

    if (partnersError) {
      return NextResponse.json({ error: partnersError.message }, { status: 500 });
    }

    const partners = (partnersRaw || []).map((row: any) => ({
      id: row.user_id as string,
      name: row?.profiles?.full_name || "Sales Partner",
    }));

    const partnerIds = salesPartnerId
      ? partners.filter((p) => p.id === salesPartnerId).map((p) => p.id)
      : partners.map((p) => p.id);

    if (partnerIds.length === 0) {
      return NextResponse.json({
        partners,
        metrics: {
          total_jobs: 0,
          invoiced_jobs: 0,
          uninvoiced_jobs: 0,
          total_amount: 0,
        },
        rows: [],
        page,
        pageSize,
        hasNext: false,
        totalCount: 0,
        totalAmount: 0,
      });
    }

    const { data: clientsRaw, error: clientsError } = await ctx.admin
      .from("clients")
      .select("id, name, referred_by_id")
      .eq("tenant_id", ctx.tenantId)
      .in("referred_by_id", partnerIds);

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    const clients = clientsRaw || [];
    const clientIds = clients.map((c: any) => c.id).filter(Boolean);

    if (clientIds.length === 0) {
      return NextResponse.json({
        partners,
        metrics: {
          total_jobs: 0,
          invoiced_jobs: 0,
          uninvoiced_jobs: 0,
          total_amount: 0,
        },
        rows: [],
        page,
        pageSize,
        hasNext: false,
        totalCount: 0,
        totalAmount: 0,
      });
    }

    const { data: ordersRaw, error: ordersError, count } = await ctx.admin
      .from("service_orders")
      .select("id, order_number, service_title, completed_at, updated_at, scheduled_date, client_id", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .in("client_id", clientIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const orders = (ordersRaw || []) as any[];
    const hasNext = orders.length > pageSize;
    const pageOrders = hasNext ? orders.slice(0, pageSize) : orders;

    const orderIds = pageOrders.map((o) => o.id).filter(Boolean);

    const { data: invoicesRaw } = orderIds.length
      ? await ctx.admin
          .from("invoices")
          .select("id, invoice_number, status, amount_total, service_order_id, issue_date, created_at")
          .eq("tenant_id", ctx.tenantId)
          .in("service_order_id", orderIds)
      : { data: [] };

    const invoices = invoicesRaw || [];
    const invoiceByOrderId = new Map<string, any>();
    const invoiceIds = new Set<string>();
    for (const inv of invoices) {
      if (inv.service_order_id) {
        invoiceByOrderId.set(inv.service_order_id, inv);
        invoiceIds.add(inv.id);
      }
    }

    let itemsData: any[] = [];
    if (invoiceIds.size > 0) {
      const { data, error } = await ctx.admin
        .from("invoice_items")
        .select("invoice_id, description, quantity, unit, unit_price, line_total")
        .in("invoice_id", Array.from(invoiceIds));

      if (!error) {
        itemsData = data || [];
      }
    }

    const itemsByInvoice = new Map<string, JobItem[]>();
    for (const item of itemsData) {
      const invId = item.invoice_id as string;
      if (!itemsByInvoice.has(invId)) itemsByInvoice.set(invId, []);
      itemsByInvoice.get(invId)!.push({
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit: item.unit || "Unit",
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0),
      });
    }

    const clientById = new Map<string, any>();
    for (const c of clients) {
      clientById.set(c.id, c);
    }

    const partnerById = new Map<string, string>();
    for (const p of partners) {
      partnerById.set(p.id, p.name);
    }

    const rows: JobRow[] = pageOrders.map((order) => {
      const client = clientById.get(order.client_id);
      const partnerId = client?.referred_by_id || null;
      const invoice = invoiceByOrderId.get(order.id) || null;
      return {
        order_id: order.id,
        order_number: order.order_number || null,
        service_title: order.service_title || null,
        completed_at: order.completed_at || order.updated_at || order.scheduled_date || null,
        client_name: client?.name || null,
        sales_partner_id: partnerId,
        sales_partner_name: partnerId ? partnerById.get(partnerId) || null : null,
        invoice_id: invoice?.id || null,
        invoice_number: invoice?.invoice_number || null,
        invoice_status: invoice?.status || null,
        invoice_issue_date: invoice?.issue_date || invoice?.created_at || null,
        invoice_total: Number(invoice?.amount_total || 0),
        items: invoice?.id ? itemsByInvoice.get(invoice.id) || [] : [],
      };
    });

    const { data: totalInvoicesRaw, error: totalInvoicesError, count: totalInvoicesCount } = await ctx.admin
      .from("invoices")
      .select("amount_total", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .in("client_id", clientIds)
      .not("service_order_id", "is", null)
      .neq("status", "cancelled");

    if (totalInvoicesError) {
      return NextResponse.json({ error: totalInvoicesError.message }, { status: 500 });
    }

    const totalAmount = (totalInvoicesRaw || []).reduce(
      (sum: number, row: any) => sum + Number(row.amount_total || 0),
      0
    );

    const totalJobs = typeof count === "number" ? count : pageOrders.length;
    const invoicedJobs = typeof totalInvoicesCount === "number" ? totalInvoicesCount : (totalInvoicesRaw || []).length;
    const uninvoicedJobs = Math.max(0, totalJobs - invoicedJobs);

    return NextResponse.json({
      partners,
      metrics: {
        total_jobs: totalJobs,
        invoiced_jobs: invoicedJobs,
        uninvoiced_jobs: uninvoicedJobs,
        total_amount: totalAmount,
      },
      rows,
      page,
      pageSize,
      hasNext,
      totalCount: typeof count === "number" ? count : null,
      totalAmount,
    });
  } catch (error: any) {
    console.error("Error in sales partner performance API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
