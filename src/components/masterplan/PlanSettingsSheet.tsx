import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDB } from "@/lib/auth";
import { moveColumn, moveMonth, toggleColumn } from "@/lib/masterplan";
import { MONTH_NAMES, PLAN_COLUMN_LABELS } from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanSettingsSheet({ open, onOpenChange }: Props) {
  const db = useDB();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Master plan layout</SheetTitle>
          <SheetDescription>Set the month order and choose which columns everyone sees.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Month order</h3>
            <ul className="space-y-1">
              {db.planMonths.map((m, i) => (
                <li
                  key={m}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{MONTH_NAMES[m]}</span>
                  <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} onClick={() => moveMonth(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={i === db.planMonths.length - 1}
                    onClick={() => moveMonth(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">Columns</h3>
            <ul className="space-y-1">
              {db.planColumns.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="flex-1">{PLAN_COLUMN_LABELS[c.id]}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    title={c.visible ? "Hide column" : "Show column"}
                    onClick={() => toggleColumn(i)}
                  >
                    {c.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} onClick={() => moveColumn(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={i === db.planColumns.length - 1}
                    onClick={() => moveColumn(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
