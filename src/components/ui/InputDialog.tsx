"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type InputField = {
  name: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "email" | "number" | "date";
  required?: boolean;
  multiline?: boolean;
};

type InputDialogProps = {
  open: boolean;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  fields?: InputField[];
};

export function InputDialog({
  open,
  onSubmit,
  onCancel,
  title,
  placeholder,
  defaultValue,
  fields,
}: InputDialogProps) {
  const effectiveFields = useMemo<InputField[]>(
    () =>
      fields && fields.length > 0
        ? fields
        : [
            {
              name: "value",
              label: "入力",
              placeholder,
              defaultValue,
              required: true,
            },
          ],
    [fields, placeholder, defaultValue],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      return;
    }
    const nextValues: Record<string, string> = {};
    effectiveFields.forEach((field) => {
      nextValues[field.name] = field.defaultValue ?? "";
    });
    setValues(nextValues);
  }, [open, effectiveFields]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-5 focus:outline-none"
          aria-label={title}
        >
          <Dialog.Title className="text-sm font-bold text-[var(--color-foreground)]">{title}</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {effectiveFields.map((field, index) => (
              <label key={field.name} className="block">
                <span className="text-[11px] font-medium text-[var(--color-muted)]">{field.label ?? field.name}</span>
                {field.multiline ? (
                  <textarea
                    rows={3}
                    name={field.name}
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                ) : (
                  <input
                    autoFocus={index === 0}
                    type={field.type ?? "text"}
                    name={field.name}
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)] transition-colors btn-press"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors btn-press"
              >
                {submitting ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
