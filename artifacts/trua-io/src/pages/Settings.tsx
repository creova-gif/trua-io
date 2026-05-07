import { useGetMyOrg, useUpdateMyOrg, getGetMyOrgQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, Shield } from "lucide-react";

type OrgForm = {
  name: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  locale: string;
  dailySendLimit: number;
};

export default function Settings() {
  const { data: org, isLoading } = useGetMyOrg();
  const updateOrg = useUpdateMyOrg();
  const qc = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<OrgForm>({
    defaultValues: {
      name: "", fromName: "", fromEmail: "", domain: "", locale: "en", dailySendLimit: 100,
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        fromName: org.fromName,
        fromEmail: org.fromEmail ?? "",
        domain: org.domain ?? "",
        locale: org.locale,
        dailySendLimit: org.dailySendLimit,
      });
    }
  }, [org, form]);

  const onSubmit = (values: OrgForm) => {
    updateOrg.mutate({ data: values } as any, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        qc.invalidateQueries({ queryKey: getGetMyOrgQueryKey() });
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and account</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-display font-bold text-lg">
                {user?.firstName?.[0] ?? "U"}
              </span>
            </div>
            <div>
              <p className="font-medium text-foreground">{user?.fullName ?? "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization</CardTitle>
          <CardDescription>Configure your organization's outreach settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  data-testid="input-org-name"
                  className="mt-1.5"
                  {...form.register("name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    data-testid="input-from-name"
                    className="mt-1.5"
                    placeholder="Your name or company"
                    {...form.register("fromName")}
                  />
                </div>
                <div>
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    data-testid="input-from-email"
                    className="mt-1.5"
                    type="email"
                    placeholder="outreach@yourdomain.com"
                    {...form.register("fromEmail")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="domain">Sending Domain</Label>
                <Input
                  id="domain"
                  data-testid="input-domain"
                  className="mt-1.5"
                  placeholder="yourdomain.com"
                  {...form.register("domain")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="locale">Default Language</Label>
                  <select
                    id="locale"
                    data-testid="select-locale"
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...form.register("locale")}
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="daily-limit">Daily Send Limit</Label>
                  <Input
                    id="daily-limit"
                    data-testid="input-daily-limit"
                    className="mt-1.5"
                    type="number"
                    {...form.register("dailySendLimit", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateOrg.isPending} data-testid="button-save-settings">
                {updateOrg.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> PDPA 2022 Compliance</CardTitle>
          <CardDescription>Tanzania Personal Data Protection Act</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>All emails include an unsubscribe link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Consent records are stored for every opt-in</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Opt-out requests are processed immediately</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Data is retained according to PDPA guidelines</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
