import { listAllCategories } from "@/lib/data/revenue";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryListItem } from "@/components/forms/category-list-item";

export default async function CategoriesAdminPage() {
  const categories = await listAllCategories();
  const supabase = await createClient();

  const cumulativeByCategory: Record<string, number> = {};
  for (const cat of categories) {
    if (cat.category_type !== "project") continue;
    const { data: entries } = await supabase
      .from("revenue_entries")
      .select("category_total")
      .eq("category_id", cat.id)
      .eq("state", "verified");
    cumulativeByCategory[cat.id] = (entries ?? []).reduce(
      (s: number, e: { category_total: number | null }) => s + Number(e.category_total ?? 0),
      0
    );
  }

  const { data: churchRow } = await supabase.from("churches").select("currency_code").limit(1).single();
  const currencyCode = churchRow?.currency_code ?? "USD";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Offering categories</h1>
        <p className="text-sm text-muted">
          Categories are configurable records (CFG-01) — add or retire them without a software
          release. A used category cannot be deleted, only deactivated (CFG-04).
        </p>
      </div>

      <CategoryForm />

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {categories.map((cat) => (
          <CategoryListItem
            key={cat.id}
            category={cat}
            currencyCode={currencyCode}
            cumulativeReceived={cumulativeByCategory[cat.id]}
          />
        ))}
      </div>
    </div>
  );
}
