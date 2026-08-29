import {
  getVerifiedRevenueTotalsByCategory,
  listAllCategories,
} from "@/lib/data/revenue";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryListItem } from "@/components/forms/category-list-item";

export default async function CategoriesAdminPage() {
  const [categories, ctx] = await Promise.all([
    listAllCategories(),
    getCurrentUserContext(),
  ]);
  const activeCategories = categories.filter((category) => category.active);
  const inactiveCategories = categories.filter((category) => !category.active);
  const supabase = await createClient();
  const canViewProjectProgress =
    ctx?.permissions.hasFinanceHistoryPermission() ?? false;
  const projectCategoryIds = categories
    .filter((category) => category.category_type === "project")
    .map((category) => category.id);
  const cumulativeByCategory = canViewProjectProgress
    ? await getVerifiedRevenueTotalsByCategory(projectCategoryIds)
    : {};

  const { data: churchRow } = await supabase
    .from("churches")
    .select("currency_code, locale_code")
    .limit(1)
    .single();
  const currencyCode = churchRow?.currency_code ?? "GBP";
  const localeCode = churchRow?.locale_code ?? "en-GB";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Offering categories</h1>
        <p className="text-sm text-muted">
          Categories are configurable records. Used categories are retired rather than deleted so
          historic finance reports keep their original meaning.
        </p>
      </div>

      <CategoryForm />

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Active categories</h2>
            <p className="text-xs text-muted">These appear when entering offerings for a programme.</p>
          </div>
          <span className="text-xs text-muted">{activeCategories.length} active</span>
        </div>

        <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
          {activeCategories.length === 0 && (
            <p className="p-5 text-sm text-muted">
              No active categories. Create one above or reactivate an archived category.
            </p>
          )}
          {activeCategories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              currencyCode={currencyCode}
              localeCode={localeCode}
              cumulativeReceived={
                canViewProjectProgress ? cumulativeByCategory[category.id] ?? 0 : undefined
              }
            />
          ))}
        </div>
      </section>

      {inactiveCategories.length > 0 && (
        <details className="rounded-brand border border-surface-border bg-surface">
          <summary className="cursor-pointer list-none px-4 py-3 font-medium">
            <span>Inactive / archived categories</span>
            <span className="ml-2 text-xs font-normal text-muted">
              ({inactiveCategories.length})
            </span>
            <span className="ml-2 text-xs font-normal text-muted">
              Hidden from normal offering entry
            </span>
          </summary>
          <div className="border-t border-surface-border divide-y divide-surface-border">
            {inactiveCategories.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                currencyCode={currencyCode}
                localeCode={localeCode}
                cumulativeReceived={
                canViewProjectProgress ? cumulativeByCategory[category.id] ?? 0 : undefined
              }
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
