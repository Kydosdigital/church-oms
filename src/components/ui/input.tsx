import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("block text-sm font-medium text-foreground mb-1", className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-brand border border-surface-border bg-background px-3 h-11 text-base",
        "focus-visible:outline-2 focus-visible:outline-brand",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "block w-full rounded-brand border border-surface-border bg-background px-3 py-2 text-base min-h-24",
        "focus-visible:outline-2 focus-visible:outline-brand",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const FieldError = ({ children }: { children?: string }) => {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-danger">
      {children}
    </p>
  );
};

export const NumberField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      className={cn(
        "block w-full rounded-brand border border-surface-border bg-background px-3 h-14 text-2xl font-semibold text-center",
        "focus-visible:outline-2 focus-visible:outline-brand",
        className
      )}
      {...props}
    />
  )
);
NumberField.displayName = "NumberField";
