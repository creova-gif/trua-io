import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, ChevronDown, ChevronRight, ExternalLink, CheckCircle2,
  Circle, Search, Building2, Receipt, HardHat, Lock, Radio, Leaf,
  AlertTriangle, Scale, Globe2, Factory, CalendarClock, BookOpen, X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { COMPLIANCE_CATEGORIES, TOTAL_ITEMS, type ComplianceItem } from "@/data/tanzaniaCompliance";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type ProgressRow = { id: number; orgId: number; itemId: string; notes: string | null; checkedAt: string };

async function fetchProgress(): Promise<ProgressRow[]> {
  const res = await fetch(`${basePath}/api/compliance/progress`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch compliance progress");
  return res.json();
}

async function toggleItem(itemId: string): Promise<{ checked: boolean }> {
  const res = await fetch(`${basePath}/api/compliance/progress/${encodeURIComponent(itemId)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to toggle");
  return res.json();
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, Receipt, HardHat, Lock, Radio, Leaf, AlertTriangle, Scale, Globe2, Factory, CalendarClock,
};

const COLOR_CONFIG: Record<string, { bg: string; border: string; text: string; badge: string; ring: string; check: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   ring: "ring-blue-300",   check: "text-blue-600" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", ring: "ring-orange-300", check: "text-orange-600" },
  green:   { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700",   ring: "ring-green-300",  check: "text-green-600" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700", ring: "ring-purple-300", check: "text-purple-600" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-200",   text: "text-cyan-700",   badge: "bg-cyan-100 text-cyan-700",     ring: "ring-cyan-300",   check: "text-cyan-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700",badge: "bg-emerald-100 text-emerald-700",ring: "ring-emerald-300",check: "text-emerald-600" },
  red:     { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",       ring: "ring-red-300",    check: "text-red-600" },
  yellow:  { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", ring: "ring-yellow-300", check: "text-yellow-600" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-300", check: "text-indigo-600" },
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",  text: "text-slate-700",  badge: "bg-slate-100 text-slate-700",   ring: "ring-slate-300",  check: "text-slate-600" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",   badge: "bg-rose-100 text-rose-700",     ring: "ring-rose-300",   check: "text-rose-600" },
};

function ScoreGauge({ checked, total }: { checked: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const label = pct >= 80 ? "Strong" : pct >= 50 ? "In Progress" : "Needs Attention";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/40" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display font-extrabold text-foreground">{pct}%</span>
        <span className="text-xs font-medium text-muted-foreground mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function ItemDetailPanel({ item, checked, onToggle, onClose, color }: {
  item: ComplianceItem;
  checked: boolean;
  onToggle: () => void;
  onClose: () => void;
  color: string;
}) {
  const cfg = COLOR_CONFIG[color] ?? COLOR_CONFIG.blue;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("px-6 py-4 border-b border-border flex items-start justify-between gap-3", cfg.bg)}>
          <div className="flex-1 min-w-0">
            <div className={cn("text-xs font-semibold tracking-wider uppercase mb-1", cfg.text)}>{item.authority}</div>
            <h3 className="font-display font-bold text-foreground text-lg leading-tight">{item.title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-muted-foreground leading-relaxed">{item.description}</p>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Action Steps
            </h4>
            <ol className="space-y-2.5">
              {item.details.map((d, i) => (
                <li key={i} className="flex gap-3">
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5", cfg.badge)}>{i + 1}</span>
                  <span className="text-sm text-foreground leading-relaxed">{d}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={cn("rounded-xl p-4 border", cfg.bg, cfg.border)}>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">Renewal</p>
              <p className={cn("font-semibold", cfg.text)}>{item.renewal}</p>
            </div>
            <div className="rounded-xl p-4 border border-border bg-muted/40">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">Required</p>
              <p className="font-semibold text-foreground">{item.mandatory ? "Mandatory" : "Conditional"}</p>
            </div>
          </div>

          {item.penalty && (
            <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-0.5">Penalty for non-compliance</p>
                <p className="text-sm text-red-700">{item.penalty}</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center gap-3">
          <Button
            onClick={onToggle}
            className={cn("flex-1", checked ? "bg-primary hover:bg-primary/90" : "")}
            variant={checked ? "default" : "outline"}
            data-testid={`detail-toggle-${item.id}`}
          >
            {checked ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Marked Complete</> : <><Circle className="w-4 h-4 mr-2" /> Mark as Complete</>}
          </Button>
          <a
            href={item.authorityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Official Site <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["business-formation", "tax-compliance"]));
  const [selectedItem, setSelectedItem] = useState<{ item: ComplianceItem; color: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: progressRows = [], isLoading } = useQuery({
    queryKey: ["compliance-progress"],
    queryFn: fetchProgress,
  });

  const checkedIds = useMemo(() => new Set(progressRows.map((r) => r.itemId)), [progressRows]);

  const toggleMutation = useMutation({
    mutationFn: toggleItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-progress"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const totalChecked = checkedIds.size;

  const toggleCategory = (id: string) => {
    setExpandedCategories((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return COMPLIANCE_CATEGORIES;
    const q = search.toLowerCase();
    return COMPLIANCE_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.authority.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const categoryStats = useMemo(() => {
    const m: Record<string, { checked: number; total: number }> = {};
    for (const cat of COMPLIANCE_CATEGORIES) {
      m[cat.id] = { total: cat.items.length, checked: cat.items.filter((i) => checkedIds.has(i.id)).length };
    }
    return m;
  }, [checkedIds]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Tanzania Business Compliance
        </h1>
        <p className="text-muted-foreground mt-1">
          A complete compliance guide covering all major regulatory bodies for businesses operating in Tanzania
        </p>
      </div>

      {/* Score dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
          {isLoading ? (
            <div className="w-[140px] h-[140px] bg-muted animate-pulse rounded-full" />
          ) : (
            <ScoreGauge checked={totalChecked} total={TOTAL_ITEMS} />
          )}
          <p className="text-sm font-medium text-muted-foreground">
            {totalChecked} of {TOTAL_ITEMS} items complete
          </p>
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 gap-3">
          {COMPLIANCE_CATEGORIES.slice(0, 4).map((cat) => {
            const cfg = COLOR_CONFIG[cat.color] ?? COLOR_CONFIG.blue;
            const Icon = ICON_MAP[cat.icon] ?? BookOpen;
            const stats = categoryStats[cat.id] ?? { checked: 0, total: 0 };
            const pct = stats.total === 0 ? 0 : Math.round((stats.checked / stats.total) * 100);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (!expandedCategories.has(cat.id)) toggleCategory(cat.id);
                  setTimeout(() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                }}
                className={cn("text-left p-4 rounded-xl border bg-card hover:shadow-md transition-all", cfg.border)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.text)} />
                  </div>
                  <span className="font-semibold text-sm text-foreground truncate">{cat.title.split("(")[0].trim()}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", cfg.check.replace("text-", "bg-"))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-semibold", cfg.text)}>{stats.checked}/{stats.total}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search compliance requirements, authorities, or topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-compliance-search"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          This guide is for informational purposes only and does not constitute legal advice. Regulations change — always verify with the relevant authority or a qualified Tanzanian lawyer before making compliance decisions.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {filteredCategories.map((cat) => {
          const cfg = COLOR_CONFIG[cat.color] ?? COLOR_CONFIG.blue;
          const Icon = ICON_MAP[cat.icon] ?? BookOpen;
          const expanded = expandedCategories.has(cat.id) || search.trim().length > 0;
          const stats = categoryStats[cat.id] ?? { checked: 0, total: 0 };
          const pct = stats.total === 0 ? 0 : Math.round((stats.checked / stats.total) * 100);

          return (
            <div key={cat.id} id={`cat-${cat.id}`} className="border border-border rounded-2xl overflow-hidden bg-card">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                data-testid={`category-toggle-${cat.id}`}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg, `border ${cfg.border}`)}>
                  <Icon className={cn("w-5 h-5", cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-foreground">{cat.title}</span>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.badge)}>
                      {stats.checked}/{stats.total} done
                    </span>
                    {pct === 100 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", cfg.check.replace("text-", "bg-"))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Items */}
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {cat.items.map((item) => {
                    const isChecked = checkedIds.has(item.id);
                    const isPending = toggleMutation.isPending && toggleMutation.variables === item.id;
                    return (
                      <div key={item.id} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors", isChecked && "bg-green-50/50")}>
                        <button
                          onClick={() => toggleMutation.mutate(item.id)}
                          disabled={isPending}
                          className={cn("mt-0.5 shrink-0 transition-all", isPending && "opacity-50")}
                          data-testid={`checkbox-${item.id}`}
                          title={isChecked ? "Mark incomplete" : "Mark complete"}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-primary" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <p className={cn("font-semibold text-sm", isChecked ? "line-through text-muted-foreground" : "text-foreground")}>
                              {item.title}
                            </p>
                            {item.mandatory && (
                              <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" /> {item.renewal}
                            </span>
                            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", cfg.badge)}>
                              {item.authority.split("(")[0].trim()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <button
                            onClick={() => setSelectedItem({ item, color: cat.color })}
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            data-testid={`details-${item.id}`}
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No compliance items match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch("")} className="text-primary text-sm mt-1 hover:underline">Clear search</button>
        </div>
      )}

      {/* Detail panel */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem.item}
          checked={checkedIds.has(selectedItem.item.id)}
          color={selectedItem.color}
          onToggle={() => toggleMutation.mutate(selectedItem.item.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
