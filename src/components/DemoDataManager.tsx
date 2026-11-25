import { useEffect, useState } from "react";
import type { AppLanguage } from "../types";
import { defaultDemoCounts, demoGroups, type Counts } from "../types/demo";
import { demoText, demoCountLabels } from "../i18n/demo";
import { yerevanToday } from "../utils/dates";
import { appStore } from "../services/store";
type Group = keyof typeof demoGroups;
interface Batch {
  id: string;
  status: "generated" | "imported" | "cleaned";
  counts: Counts;
  manifest: string;
}
interface Inspection {
  id: string;
  status: string;
  counts: Counts;
  records: { table: string; count: number }[];
  preview: {
    id: string;
    kind: string;
    title: Partial<Record<AppLanguage, string>>;
  }[];
  page: number;
  total: number;
}
export function DemoDataManager({ language }: { language: AppLanguage }) {
  const t = demoText[language],
    labels = demoCountLabels(language);
  const [seed, setSeed] = useState("yerevanhub-task03"),
    [date, setDate] = useState(yerevanToday()),
    [counts, setCounts] = useState<Counts>({ ...defaultDemoCounts }),
    [modules, setModules] = useState<Group[]>(
      Object.keys(demoGroups) as Group[],
    ),
    [enrichment, setEnrichment] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [inspection, setInspection] = useState<Inspection | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function request(body?: unknown) {
    const response = await fetch("/api/demo", {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "YerevanHub",
        "X-App-Language": language,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw Error(data.error ?? t.failed);
    return data;
  }
  async function refresh() {
    const data = await request();
    setBatches(data.batches);
  }
  useEffect(() => {
    let live = true;
    void request()
      .then((data) => {
        if (live) setBatches(data.batches);
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, []);
  async function action(
    operation: string,
    details: Record<string, unknown> = {},
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body =
        operation === "generate"
          ? {
              operation,
              config: {
                seed,
                baseDate: date,
                modules,
                counts,
                content: enrichment.trim() ? JSON.parse(enrichment) : {},
              },
            }
          : { operation, ...details };
      const data = await request(body);
      await refresh();
      if (operation === "generate" || operation === "inspect") {
        const inspected =
          operation === "inspect"
            ? data
            : await request({
                operation: "inspect",
                batchId: data.result.id,
                page: 1,
              });
        setInspection(inspected.result);
      }
      if (operation === "import" || operation === "cleanup") {
        await appStore.refresh();
        setInspection(null);
      }
      if (operation === "cleanup") setSelected([]);
      setMessage(t.success);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="min-w-0 space-y-6"
      data-testid="demo-manager"
      aria-busy={busy}
    >
      <h2 className="text-2xl font-bold">{t.title}</h2>
      <p
        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
        role="note"
      >
        {t.warning}
      </p>
      <form
        className="surface space-y-5 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void action("generate");
        }}
      >
        <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              {t.seed}
              <input
                className="field mt-2 w-full"
                required
                maxLength={80}
                dir="ltr"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <label>
              {t.date}
              <input
                className="field mt-2 w-full"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 font-semibold">{t.modules}</legend>
            <div className="grid gap-4 md:grid-cols-2">
              {(Object.keys(demoGroups) as Group[]).map((group) => (
                <fieldset
                  className="min-w-0 rounded-2xl border border-current/15 p-4"
                  key={group}
                >
                  <legend>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={modules.includes(group)}
                        onChange={(e) =>
                          setModules((previous) =>
                            e.target.checked
                              ? [...previous, group]
                              : previous.filter((g) => g !== group),
                          )
                        }
                      />
                      {t[group]}
                    </label>
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {demoGroups[group].map((key) => (
                      <label key={key} className="text-sm">
                        {labels[key]}
                        <input
                          aria-label={labels[key]}
                          className="field mt-1 w-full"
                          type="number"
                          min={0}
                          max={3000}
                          step={1}
                          disabled={!modules.includes(group)}
                          value={counts[key]}
                          onChange={(e) =>
                            setCounts({
                              ...counts,
                              [key]: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </fieldset>
          <details>
            <summary className="cursor-pointer">{t.enrichment}</summary>
            <p className="my-3 text-sm">{t.enrichmentHelp}</p>
            <textarea
              aria-label={t.enrichment}
              className="field w-full font-mono"
              dir="ltr"
              rows={5}
              maxLength={200000}
              value={enrichment}
              onChange={(e) => setEnrichment(e.target.value)}
            />
          </details>
          <button
            className="button-primary"
            disabled={!modules.length}
            type="submit"
          >
            {busy ? t.busy : t.generate}
          </button>
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
      {error && (
        <div role="alert">
          <p>{t.failed}</p>
          <details>
            <summary>{t.details}</summary>
            <p className="break-words" dir="auto">
              {error}
            </p>
          </details>
        </div>
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-bold">{t.batches}</h3>
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void refresh()
                .catch((e) => setError(String(e)))
                .finally(() => setBusy(false));
            }}
          >
            {t.refresh}
          </button>
        </div>
        {!batches.length && <p>{t.empty}</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <article
              className="surface min-w-0 space-y-3 p-4"
              key={batch.id}
              data-testid="demo-batch"
            >
              <label className="flex items-start gap-3">
                <input
                  aria-label={t.select + " " + batch.id}
                  type="checkbox"
                  disabled={busy || batch.status === "cleaned"}
                  checked={selected.includes(batch.id)}
                  onChange={(e) =>
                    setSelected((p) =>
                      e.target.checked
                        ? [...p, batch.id]
                        : p.filter((id) => id !== batch.id),
                    )
                  }
                />
                <code className="min-w-0 break-all text-sm" dir="ltr">
                  {batch.id}
                </code>
              </label>
              <p>
                {t.status}: {t[batch.status]}
              </p>
              <p className="text-sm">
                {t.manifest}: <bdi className="break-all">{batch.manifest}</bdi>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() =>
                    void action("inspect", { batchId: batch.id, page: 1 })
                  }
                >
                  {t.preview}
                </button>
                <button
                  className="button-secondary"
                  disabled={busy || batch.status === "cleaned"}
                  onClick={() => void action("validate", { batchId: batch.id })}
                >
                  {t.validate}
                </button>
                <button
                  className="button-primary"
                  disabled={busy || batch.status !== "generated"}
                  onClick={() => void action("import", { batchId: batch.id })}
                >
                  {t.import}
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="text-sm">{t.manifestHelp}</p>
        <button
          className="button-secondary"
          disabled={busy || !selected.length}
          onClick={() => {
            if (window.confirm(t.confirmation))
              void action("cleanup", {
                batchIds: selected,
                confirmation: "DELETE SYNTHETIC BATCHES",
              });
          }}
        >
          {t.cleanup} ({selected.length})
        </button>
      </section>
      {inspection && (
        <section className="surface space-y-4 p-4" data-testid="demo-preview">
          <h3 className="text-xl font-bold">{t.preview}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(inspection.counts).map(([k, v]) => (
              <p key={k}>
                {labels[k as keyof Counts]}: {v}
              </p>
            ))}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {inspection.preview.map((record) => (
              <li
                className="min-w-0 rounded-xl border border-current/15 p-3"
                key={record.kind + record.id}
              >
                <p>
                  {record.title[language] ?? record.title.en ?? record.title.fa}
                </p>
                <code dir="ltr" className="block break-all text-xs">
                  {record.id}
                </code>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="button-secondary"
              disabled={busy || inspection.page <= 1}
              onClick={() =>
                void action("inspect", {
                  batchId: inspection.id,
                  page: inspection.page - 1,
                })
              }
            >
              {t.previous}
            </button>
            <bdi>
              {inspection.page} /{" "}
              {Math.max(1, Math.ceil(inspection.total / 20))}
            </bdi>
            <button
              className="button-secondary"
              disabled={busy || inspection.page * 20 >= inspection.total}
              onClick={() =>
                void action("inspect", {
                  batchId: inspection.id,
                  page: inspection.page + 1,
                })
              }
            >
              {t.next}
            </button>
          </div>
          {!!inspection.records.length && (
            <details>
              <summary>{t.rows}</summary>
              {inspection.records.map((r) => (
                <p key={r.table}>
                  <code>{r.table}</code>: {r.count}
                </p>
              ))}
            </details>
          )}
        </section>
      )}
    </section>
  );
}
