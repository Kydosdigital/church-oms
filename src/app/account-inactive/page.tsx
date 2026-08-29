import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Account inactive",
  robots: { index: false, follow: false },
};

export default function AccountInactivePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Church access is inactive</CardTitle>
          <CardDescription>
            Your sign-in account still exists, but access to this church has been
            deactivated. Contact your church Administrator or Super Admin if you
            believe this should be restored.
          </CardDescription>
        </CardHeader>

        <p className="text-sm text-muted">
          Church OMS will not show church records or allow workflow actions while
          this access is inactive.
        </p>

        <form action={signOut} className="mt-5">
          <Button type="submit" className="w-full">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
