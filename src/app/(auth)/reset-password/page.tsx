"use client";

import { useActionState, useState } from "react";
import { updatePassword, type ResetPasswordState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const [showPasswords, setShowPasswords] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted mt-1">
          Set a new password for your Church OMS account. This recovery link is only valid for a short time.
        </p>
      </div>

      <div>
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            className="pr-16"
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords((current) => !current)}
            className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand hover:underline"
            aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            aria-pressed={showPasswords}
          >
            {showPasswords ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <FieldError>{state.error}</FieldError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
