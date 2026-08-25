import { getChurchSettings } from "@/lib/data/admin";
import { Card, CardDescription } from "@/components/ui/card";
import { ChurchSettingsForm } from "@/components/forms/church-settings-form";

export default async function ChurchSettingsPage() {
  const church = await getChurchSettings();

  if (!church) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Church settings</h1>
        <Card>
          <CardDescription>No church record found for your account yet.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Church settings</h1>
        <p className="text-sm text-muted">
          These apply church-wide: currency and timezone shape how dates/amounts render, the
          reporting year start month shapes year-to-date figures, and independent verification
          controls whether finance records need a second sign-off before they lock.
        </p>
      </div>
      <ChurchSettingsForm church={church} />
    </div>
  );
}
