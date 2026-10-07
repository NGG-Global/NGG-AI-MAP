"use client";

import { useState } from "react";
import type { DisplayRule } from "@/domain/questionnaire/definition";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

const FIELD_KEYS = ["attr:is_manager", "q:CTX_01", "q:CTX_02", "q:CTX_03", "q:CTX_05", "q:USE_01", "q:USE_02", "q:MEXP_SCREEN_01"] as const;
const OPERATORS = ["eq", "neq", "in", "not_in", "truthy", "falsy", "count_gt"] as const;

/** Field → Operator → Value rows, serialised into a hidden `rules` JSON field (spec §14). */
export function DisplayRulesEditor({ initial, t, valueOptions }: { initial: DisplayRule[]; t: Dictionary["builder"]; valueOptions: Record<string, string[]> }) {
  const [rules, setRules] = useState<DisplayRule[]>(initial);
  const update = (index: number, patch: Partial<DisplayRule>) => setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const control = "rounded-[12px] border border-line bg-surface px-3 py-2 text-[13px]";
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />
      {rules.map((rule, index) => {
        const options = valueOptions[rule.field] ?? [];
        const needsValue = rule.operator !== "truthy" && rule.operator !== "falsy";
        return (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <label className="text-[11px] font-semibold text-text-muted">
              {t.field}
              <select className={`${control} mt-1 w-full`} value={rule.field} onChange={(e) => update(index, { field: e.target.value, value: undefined })}>
                {(FIELD_KEYS as readonly string[]).includes(rule.field) ? null : <option value={rule.field}>{rule.field}</option>}
                {FIELD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t.fields[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-text-muted">
              {t.operator}
              <select className={`${control} mt-1 w-full`} value={rule.operator} onChange={(e) => update(index, { operator: e.target.value as DisplayRule["operator"] })}>
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {t.operators[op]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-text-muted">
              {t.value}
              {needsValue ? (
                options.length && rule.operator !== "count_gt" ? (
                  <select className={`${control} mt-1 w-full`} value={String(rule.value ?? "")} onChange={(e) => update(index, { value: e.target.value })}>
                    <option value="">—</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className={`${control} mt-1 w-full`} value={String(rule.value ?? "")} onChange={(e) => update(index, { value: e.target.value })} />
                )
              ) : (
                <span className={`${control} mt-1 block w-full text-text-muted`}>—</span>
              )}
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))} aria-label={t.removeCondition}>
              ×
            </Button>
          </div>
        );
      })}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setRules((prev) => [...prev, { field: "attr:is_manager", operator: "truthy" }])}>
          {t.addCondition}
        </Button>
      </div>
    </div>
  );
}
