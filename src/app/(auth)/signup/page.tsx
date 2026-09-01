"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "@/lib/auth/password-policy";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted mt-1">
          Create an account if you are registering a new church on Church OMS.
          If your church already uses Church OMS, ask its Administrator or Super Admin to invite you instead.
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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-requirements"
            className="pr-16"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand hover:underline"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p id="password-requirements" className="mt-1 text-xs text-muted">
          {PASSWORD_REQUIREMENTS}
        </p>
      </div>

      <FieldError>{state.error}</FieldError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-sm text-muted text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-brand underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
