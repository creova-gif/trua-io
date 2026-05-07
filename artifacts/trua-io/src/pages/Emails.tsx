import { useState } from "react";
import { useListEmails, useDraftEmail, useSendEmail, useListContacts, getListEmailsQueryKey, getListContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  delivered: "bg-green-100 text-green-700",
  bounced: "bg-red-100 text-red-700",
};

export default function Emails() {
  const [page, setPage] = useState(1);
  const [draftOpen, setDraftOpen] = useState(false);
  const [contactId, setContactId] = useState<string>("");
  const [language, setLanguage] = useState("en");
  const [draft, setDraft] = useState<{ subjectLine: string; bodyHtml: string; bodyText: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListEmails({ page, limit: 20 }, {
    query: { queryKey: getListEmailsQueryKey({ page, limit: 20 }) },
  });
  const { data: contactsData } = useListContacts({ limit: 100 }, {
    query: { queryKey: getListContactsQueryKey({ limit: 100 }) },
  });

  const draftEmail = useDraftEmail();
  const sendEmail = useSendEmail();

  const handleDraft = () => {
    if (!contactId) return;
    draftEmail.mutate({ data: { contactId: parseInt(contactId, 10), language } } as any, {
      onSuccess: (d) => setDraft(d as any),
      onError: () => toast({ title: "Draft failed", variant: "destructive" }),
    });
  };

  const handleSend = () => {
    if (!draft || !contactId) return;
    sendEmail.mutate({
      data: {
        contactId: parseInt(contactId, 10),
        subject: draft.subjectLine,
        bodyHtml: draft.bodyHtml,
        bodyText: draft.bodyText,
      },
    } as any, {
      onSuccess: () => {
        toast({ title: "Email sent!" });
        qc.invalidateQueries({ queryKey: getListEmailsQueryKey() });
        setDraftOpen(false);
        setDraft(null);
        setContactId("");
      },
      onError: () => toast({ title: "Send failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Emails</h1>
          <p className="text-muted-foreground mt-1">{data?.total ?? 0} emails total</p>
        </div>
        <Dialog open={draftOpen} onOpenChange={(o) => { setDraftOpen(o); if (!o) { setDraft(null); setContactId(""); } }}>
          <DialogTrigger asChild>
            <Button data-testid="button-draft-email"><Sparkles className="w-4 h-4 mr-2" /> AI Draft Email</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>AI Email Drafter</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact *</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger data-testid="select-contact" className="mt-1.5">
                      <SelectValue placeholder="Choose a contact..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contactsData?.contacts?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.firstName ? `${c.firstName} ${c.lastName ?? ""} — ${c.email}` : c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger data-testid="select-language" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleDraft}
                disabled={!contactId || draftEmail.isPending}
                className="w-full"
                data-testid="button-generate-draft"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {draftEmail.isPending ? "Generating..." : "Generate AI Draft"}
              </Button>

              {draft && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      data-testid="input-draft-subject"
                      className="mt-1.5"
                      value={draft.subjectLine}
                      onChange={(e) => setDraft(d => d ? { ...d, subjectLine: e.target.value } : d)}
                    />
                  </div>
                  <div>
                    <Label>Body</Label>
                    <Textarea
                      data-testid="input-draft-body"
                      className="mt-1.5 min-h-[200px] font-mono text-sm"
                      value={draft.bodyText}
                      onChange={(e) => setDraft(d => d ? { ...d, bodyText: e.target.value } : d)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSend}
                    disabled={sendEmail.isPending}
                    data-testid="button-send-email"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendEmail.isPending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading emails...</div>
          ) : !data?.emails?.length ? (
            <div className="py-16 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">No emails sent yet</p>
              <p className="text-muted-foreground text-sm mt-1">Use AI Draft to compose your first outreach email</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.emails.map((e) => (
                <div key={e.id} data-testid={`email-row-${e.id}`} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{e.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">To: {e.toEmail}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      {e.opened && <span className="text-primary font-medium">Opened</span>}
                      {e.replied && <span className="text-green-600 font-medium">Replied</span>}
                      <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[e.status] ?? statusColors.pending}`}>
                        {e.status}
                      </span>
                      {e.sentAt && <span>{new Date(e.sentAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / 20)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
