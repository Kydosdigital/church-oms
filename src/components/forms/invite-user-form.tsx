"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { inviteUserSchema, type InviteUserValues } from "@/lib/validations/admin";
import { inviteUser } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function InviteUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteUserValues>({ resolver: zodResolver(inviteUserSchema) as never });

  async function onSubmit(data: InviteUserValues) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await inviteUser(data);
      setSuccess(`Invite sent to ${data.email}. Assign their role below once they've signed in.`);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invite");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-brand border border-surface-border p-4">
      <div>
        <h2 className="font-semibold">Invite a user</h2>
        <p className="text-sm text-muted mt-1">
          Sends a Supabase Auth invite email. Once they accept and sign in, assign their role(s)
          from the list below.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="invite-name">Full name</Label>
          <Input id="invite-name" {...register("full_name")} />
          <FieldError>{errors.full_name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
