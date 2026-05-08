import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, ChevronRight, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DB_FIELDS = [
  { value: "email", label: "Email *" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "jobTitle", label: "Job Title" },
  { value: "companyName", label: "Company" },
  { value: "industry", label: "Industry" },
  { value: "city", label: "City" },
  { value: "phone", label: "Phone" },
  { value: "website", label: "Website" },
  { value: "notes", label: "Notes" },
  { value: "_skip", label: "— Skip column —" },
];

type Step = "upload" | "map" | "result";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: number;
  errorRows: { row: number; reason: string }[];
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

export default function CsvImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const reset = () => {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setFieldMap({});
    setResult(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        if (!data.length) {
          toast({ title: "CSV is empty", variant: "destructive" });
          return;
        }
        setRows(data);
        const cols = meta.fields ?? [];
        setHeaders(cols);

        const autoMap: Record<string, string> = {};
        cols.forEach((col) => {
          const normalized = col.toLowerCase().replace(/[\s_-]/g, "");
          for (const f of DB_FIELDS) {
            if (f.value === "_skip") continue;
            if (normalized === f.value.toLowerCase() ||
              normalized.includes(f.value.toLowerCase()) ||
              (f.value === "email" && normalized.includes("email")) ||
              (f.value === "firstName" && (normalized.includes("first") || normalized === "fname")) ||
              (f.value === "lastName" && (normalized.includes("last") || normalized === "lname")) ||
              (f.value === "companyName" && (normalized.includes("company") || normalized.includes("org"))) ||
              (f.value === "jobTitle" && (normalized.includes("title") || normalized.includes("position") || normalized.includes("role")))
            ) {
              autoMap[col] = f.value;
              break;
            }
          }
          if (!autoMap[col]) autoMap[col] = "_skip";
        });
        setFieldMap(autoMap);
        setStep("map");
      },
      error: () => toast({ title: "Failed to parse CSV", variant: "destructive" }),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleImport = async () => {
    const hasEmail = Object.values(fieldMap).includes("email");
    if (!hasEmail) {
      toast({ title: "You must map at least one column to Email", variant: "destructive" });
      return;
    }

    const activeMap: Record<string, string> = {};
    for (const [col, field] of Object.entries(fieldMap)) {
      if (field !== "_skip") activeMap[col] = field;
    }

    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows, fieldMap: activeMap, duplicateAction: "skip" }),
      });

      if (!res.ok) throw new Error("Import failed");
      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
      if (data.imported > 0) onSuccess();
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm mb-2">
          {(["upload", "map", "result"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                step === s ? "bg-primary text-white" : i < ["upload", "map", "result"].indexOf(step) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <span className={cn("capitalize", step === s ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s === "upload" ? "Upload" : s === "map" ? "Map Columns" : "Result"}
              </span>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            data-testid="csv-drop-zone"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Drop your CSV file here</p>
            <p className="text-muted-foreground text-sm mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-4">Required column: email. All other columns are optional.</p>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rows.length} rows detected. Map each CSV column to the correct field.
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {headers.map((col) => (
                <div key={col} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-md truncate">
                    {col}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      e.g. {String(rows[0]?.[col] ?? "").slice(0, 20)}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select value={fieldMap[col] ?? "_skip"} onValueChange={(v) => setFieldMap(m => ({ ...m, [col]: v }))}>
                    <SelectTrigger className="w-44" data-testid={`map-${col}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DB_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="border border-border rounded-lg overflow-hidden text-xs">
              <div className="bg-muted px-3 py-1.5 font-semibold text-muted-foreground">Preview (first 3 rows)</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {headers.filter((h) => fieldMap[h] && fieldMap[h] !== "_skip").map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left text-muted-foreground font-medium">
                          {DB_FIELDS.find((f) => f.value === fieldMap[h])?.label ?? fieldMap[h]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {headers.filter((h) => fieldMap[h] && fieldMap[h] !== "_skip").map((h) => (
                          <td key={h} className="px-3 py-1.5 text-foreground truncate max-w-[120px]">
                            {row[h] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep("upload")} data-testid="button-back-upload">
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading} data-testid="button-confirm-import">
                {loading ? "Importing..." : `Import ${rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600">Imported</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <div className="w-6 h-6 mx-auto mb-1 text-muted-foreground flex items-center justify-center">—</div>
                <p className="text-2xl font-display font-bold text-foreground">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped (duplicates)</p>
              </div>
              <div className={cn("rounded-xl p-4", result.errors > 0 ? "bg-red-50 border border-red-200" : "bg-muted")}>
                <AlertCircle className={cn("w-6 h-6 mx-auto mb-1", result.errors > 0 ? "text-red-500" : "text-muted-foreground")} />
                <p className={cn("text-2xl font-display font-bold", result.errors > 0 ? "text-red-700" : "text-foreground")}>{result.errors}</p>
                <p className={cn("text-xs", result.errors > 0 ? "text-red-600" : "text-muted-foreground")}>Errors</p>
              </div>
            </div>

            {result.errorRows.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Error details:</p>
                {result.errorRows.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={() => handleClose(false)} data-testid="button-close-import">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
