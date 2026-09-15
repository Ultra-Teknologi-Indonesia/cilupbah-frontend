"use client";

import { useRef, useState } from "react";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InlineQtyEdit({
  value,
  minQty = 0,
  disabled = false,
  saving = false,
  onSave,
  className,
}: {
  value: number;
  minQty?: number;
  disabled?: boolean;
  saving?: boolean;
  onSave: (qty: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const cancelledRef = useRef(false);

  const start = () => {
    if (disabled || saving) return;
    cancelledRef.current = false;
    setText(String(value));
    setEditing(true);
  };

  const commit = () => {
    if (cancelledRef.current) return;

    const parsed = Number(text);

    if (text.trim() === "" || !Number.isInteger(parsed) || parsed < 0) {
      toast.error("Qty harus berupa angka bulat dan tidak boleh negatif");
      return;
    }

    if (parsed < minQty) {
      toast.error(
        `Tidak bisa di bawah yang sudah ditempatkan ke rak (${minQty})`,
      );
      return;
    }

    setEditing(false);

    if (parsed !== value) onSave(parsed);
  };

  const cancel = () => {
    cancelledRef.current = true;
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn("h-7 w-20 px-2 text-sm tabular-nums", className)}
        aria-label="Qty diterima"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || saving}
      title={disabled ? undefined : "Klik untuk koreksi qty diterima"}
      className={cn(
        "group inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-sm font-semibold tabular-nums transition-colors",
        disabled
          ? "cursor-default"
          : "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {value}
      {saving ? (
        <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
      ) : (
        !disabled && <PencilIcon className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}
