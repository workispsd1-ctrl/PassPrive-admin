"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[18px] border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <Input className={cn("h-11 rounded-xl border-slate-300 bg-white", className)} {...props} />
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <Textarea className={cn("min-h-28 rounded-2xl border-slate-300 bg-white", className)} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  value,
  onValueChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 w-full rounded-xl border-slate-300 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/85 px-6 py-14 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-[18px] border border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function PrimaryButton({
  busy,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  if (props.asChild) {
    return (
      <Button
        {...props}
        disabled={busy || props.disabled}
        className={cn("h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800", props.className)}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      {...props}
      disabled={busy || props.disabled}
      className={cn("h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800", props.className)}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function StatusPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      {label}
    </Badge>
  );
}
