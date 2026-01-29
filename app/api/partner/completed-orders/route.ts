import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = ["sales_partner", "owner", "admin_finance"] as const;

type CompletedJobItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

type CompletedJobRow = {
  invoice_id: string;
  invoice_number: string;
  amount_total: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  client_name: string | null;
  service_order_id: string | null;
  order_number: string | null;
  service_title: string | null;
  completed_at: string | null;
  items: CompletedJobItem[];
};

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function escapeOrValue(value: string) {
  return value.replace(/,/g, "\\,");
}

async function getSalesPartnerContext() {
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
    .select("active_tenant_id, full_name")
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

  return {
    admin,
    tenantId,
    userId: user.id,
    fullName: String((profile as any)?.full_name || "").trim(),
  } as const;
}

export async function GET(request: Request) {
  try {
    const ctx = await getSalesPartnerContext();
    if ("error" in ctx) return ctx.error;

    const { searchParams } = new URL(request.url);
    const page = clampNumber(searchParams.get("page"), 1, 1, 9999);
    const pageSize = clampNumber(searchParams.get("pageSize"), 8, 5, 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;

    let clientsQuery = ctx.admin
      .from("clients")
      .select("id, referred_by_id, referred_by_name")
      .eq("tenant_id", ctx.tenantId);

    if (ctx.fullName) {
      const escapedName = escapeOrValue(ctx.fullName);
      clientsQuery = clientsQuery.or(
        `referred_by_id.eq.${ctx.userId},referred_by_name.eq.${escapedName}`
      );
    } else {
      clientsQuery = clientsQuery.eq("referred_by_id", ctx.userId);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    const clientIds = (clients || []).map((c: any) => c.id).filter(Boolean);

    if (clientIds.length === 0) {
      return NextResponse.json({
        rows: [],
        page,
        pageSize,
        hasNext: false,
        totalCount: 0,
        totalAmount: 0,
      });
    }

    const invoiceQuery = ctx.admin
      .from("invoices")
      .select(
        "id, invoice_number, amount_total, issue_date, due_date, status, service_order_id, client_id, client_name",
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenantId)
      .in("client_id", clientIds)
      .not("service_order_id", "is", null)
      .neq("status", "cancelled")
      .order("issue_date", { ascending: false })
      .range(from, to);

    const { data: invoicesRaw, error: invoicesError, count } = await invoiceQuery;

    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }

    const invoices = (invoicesRaw || []) as any[];
    const hasNext = invoices.length > pageSize;
    const pageRows = hasNext ? invoices.slice(0, pageSize) : invoices;

    const orderIds = pageRows.map((inv) => inv.service_order_id).filter(Boolean);
    const invoiceIds = pageRows.map((inv) => inv.id).filter(Boolean);

    const { data: ordersData } = orderIds.length
      ? await ctx.admin
          .from("service_orders")
          .select("id, order_number, service_title, completed_at, scheduled_date")
          .in("id", orderIds)
      : { data: [] };

    const ordersMap = new Map<string, any>();
    for (const o of ordersData || []) {
      ordersMap.set(o.id, o);
    }

    let itemsData: any[] = [];
    if (invoiceIds.length) {
      const { data, error } = await ctx.admin
        .from("invoice_items")
        .select("invoice_id, description, quantity, unit, unit_price, line_total")
        .in("invoice_id", invoiceIds);

      if (!error) {
        itemsData = data || [];
      }
    }

    const itemsByInvoice = new Map<string, CompletedJobItem[]>();
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

    const rows: CompletedJobRow[] = pageRows.map((inv) => {
      const order = inv.service_order_id ? ordersMap.get(inv.service_order_id) : null;
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        amount_total: Number(inv.amount_total || 0),
        status: inv.status || "",
        issue_date: inv.issue_date || null,
        due_date: inv.due_date || null,
        client_name: inv.client_name || null,
        service_order_id: inv.service_order_id || null,
        order_number: order?.order_number || null,
        service_title: order?.service_title || null,
        completed_at: order?.completed_at || order?.scheduled_date || null,
        items: itemsByInvoice.get(inv.id) || [],
      };
    });

    const { data: totalsRaw, error: totalsError } = await ctx.admin
      .from("invoices")
      .select("amount_total")
      .eq("tenant_id", ctx.tenantId)
      .in("client_id", clientIds)
      .not("service_order_id", "is", null)
      .neq("status", "cancelled");

    if (totalsError) {
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    const totalAmount = (totalsRaw || []).reduce((sum: number, row: any) => sum + Number(row.amount_total || 0), 0);

    return NextResponse.json({
      rows,
      page,
      pageSize,
      hasNext,
      totalCount: typeof count === "number" ? count : null,
      totalAmount,
    });
  } catch (error: any) {
    console.error("Error in referral completed orders API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
