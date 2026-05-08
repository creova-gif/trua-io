import { useState } from "react";
import { useListCampaigns, useCreateCampaign, useRunCampaign, usePauseCampaign, useDeleteCampaign, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, Trash2, Megaphone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
};

export default function Campaigns() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const role = useCurrentRole();
  const isViewer = role === "viewer";

  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const runCampaign = useRunCampaign();
  const pauseCampaign = usePauseCampaign();
  const deleteCampaign = useDeleteCampaign();

  const form = useForm({
    defaultValues: { name: "", description: "", language: "en", subjectLine: "", scheduledAt: "" },
  });

  const onSubmit = (values: Record<string, string>) => {
    const payload: Record<string, unknown> = { ...values };
    if (!values.scheduledAt) delete payload.scheduledAt;
    createCampaign.mutate({ data: payload } as any, {
      onSuccess: () => {
        toast({ title: "Campaign created" });
        qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to create campaign", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your outreach campaigns</p>
        </div>
        {!isViewer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-campaign"><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" rules={{ required: true }} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl><Input data-testid="input-campaign-name" placeholder="Q1 Dar es Salaam Outreach" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea data-testid="input-campaign-desc" placeholder="Campaign goal and audience..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subjectLine" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Subject Line</FormLabel>
                      <FormControl><Input data-testid="input-subject-line" placeholder="Partnership opportunity for {company}" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          data-testid="input-scheduled-at"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" data-testid="button-submit-campaign" disabled={createCampaign.isPending}>
                      {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : !campaigns?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No campaigns yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {isViewer ? "No campaigns have been created yet" : "Create your first outreach campaign"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} data-testid={`campaign-card-${c.id}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-display font-semibold text-foreground">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] ?? statusColors.draft}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground truncate">{c.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{c.sentCount} sent</span>
                      <span>{c.openedCount} opened</span>
                      <span>{c.repliedCount} replied</span>
                      {c.scheduledAt && c.status === "draft" && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Calendar className="w-3 h-3" />
                          Scheduled {new Date(c.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isViewer && (
                    <div className="flex items-center gap-1.5">
                      {c.status === "running" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-pause-${c.id}`}
                          onClick={() => pauseCampaign.mutate({ id: c.id }, {
                            onSuccess: () => qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }),
                          })}
                        >
                          <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                        </Button>
                      ) : c.status === "draft" || c.status === "paused" ? (
                        <Button
                          size="sm"
                          data-testid={`button-run-${c.id}`}
                          onClick={() => runCampaign.mutate({ id: c.id }, {
                            onSuccess: () => qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }),
                          })}
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" /> Run Now
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        data-testid={`button-delete-campaign-${c.id}`}
                        onClick={() => deleteCampaign.mutate({ id: c.id }, {
                          onSuccess: () => qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }),
                        })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
