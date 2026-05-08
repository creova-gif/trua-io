import { useState } from "react";
import { useListContacts, useCreateContact, useDeleteContact, useEnrichContact, getListContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Sparkles, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import CsvImportDialog from "@/components/CsvImportDialog";

const stageColors: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  qualified: "bg-blue-100 text-blue-700",
  hot: "bg-orange-100 text-orange-700",
  customer: "bg-green-100 text-green-700",
};

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const role = useCurrentRole();
  const isViewer = role === "viewer";

  const { data, isLoading } = useListContacts({ search, page, limit: 20 }, {
    query: { queryKey: getListContactsQueryKey({ search, page, limit: 20 }) },
  });

  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const enrichContact = useEnrichContact();

  const form = useForm({
    defaultValues: { email: "", firstName: "", lastName: "", jobTitle: "", companyName: "", city: "" },
  });

  const onSubmit = (values: Record<string, string>) => {
    createContact.mutate({ data: values } as any, {
      onSuccess: () => {
        toast({ title: "Contact created" });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
        setAddOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to create contact", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteContact.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Contact deleted" });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      },
    });
  };

  const handleEnrich = (id: number) => {
    toast({ title: "Enriching contact with AI..." });
    enrichContact.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Contact enriched!" });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      },
      onError: () => toast({ title: "Enrichment failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">{data?.total ?? 0} contacts total</p>
        </div>
        <div className="flex items-center gap-2">
          {!isViewer && (
            <Button variant="outline" size="sm" data-testid="button-import-csv" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
          )}
          {!isViewer && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-contact">
                  <Plus className="w-4 h-4 mr-2" /> Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="email" rules={{ required: true }} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl><Input data-testid="input-email" placeholder="contact@company.com" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input data-testid="input-first-name" placeholder="Amina" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input data-testid="input-last-name" placeholder="Hassan" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="jobTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl><Input data-testid="input-job-title" placeholder="CEO" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl><Input data-testid="input-company-name" placeholder="Kilimanjaro Holdings" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input data-testid="input-city" placeholder="Dar es Salaam" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                      <Button type="submit" data-testid="button-submit-contact" disabled={createContact.isPending}>
                        {createContact.isPending ? "Saving..." : "Create Contact"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search-contacts"
          className="pl-9"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !data?.contacts?.length ? (
            <div className="p-16 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">No contacts yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                {isViewer ? "No contacts have been added yet" : "Add your first contact or import from CSV"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.contacts.map((c) => (
                <div key={c.id} data-testid={`contact-row-${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">
                      {(c.firstName?.[0] ?? c.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.jobTitle && c.companyName ? `${c.jobTitle} · ${c.companyName}` : c.email}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColors[c.stage] ?? stageColors.prospect}`}>
                      {c.stage}
                    </span>
                    {c.enriched && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                        AI enriched
                      </span>
                    )}
                  </div>
                  {!isViewer && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        data-testid={`button-enrich-${c.id}`}
                        onClick={() => handleEnrich(c.id)}
                        disabled={enrichContact.isPending}
                        title="AI Enrich"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        data-testid={`button-delete-contact-${c.id}`}
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil(data.total / 20)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: getListContactsQueryKey() })}
      />
    </div>
  );
}
