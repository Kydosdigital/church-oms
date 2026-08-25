"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted mt-1">
          An administrator will still need to assign you a branch and role before you can submit
          records.
        </p>
      </div>

      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>

      <FieldError>{state.error}</FieldError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-sm text-muted text-center">
        Already have an account? <Link href="/login" className="text-brand underline">Sign in</Link>
      </p>
    </form>
  );
}
