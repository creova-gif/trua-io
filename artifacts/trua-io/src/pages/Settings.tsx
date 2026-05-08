import { useGetMyOrg, useUpdateMyOrg, getGetMyOrgQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, Shield, Users, Crown, Eye, Pencil, Trash2, ChevronDown } from "lucide-react";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type OrgForm = {
  name: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  locale: string;
  dailySendLimit: number;
};

type MemberInfo = {
  id: number;
  orgId: number;
  clerkUserId: string;
  role: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
};

async function fetchMembers(): Promise<MemberInfo[]> {
  const res = await fetch(`${basePath}/api/org/members`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function updateRole({ memberId, role }: { memberId: number; role: string }) {
  const res = await fetch(`${basePath}/api/org/members/${memberId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function removeMember(memberId: number) {
  const res = await fetch(`${basePath}/api/org/members/${memberId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed");
}

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Crown, color: "text-orange-600 bg-orange-50" },
  sales_user: { label: "Sales", icon: Pencil, color: "text-blue-600 bg-blue-50" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground bg-muted" },
};

type SettingsTab = "account" | "organization" | "team" | "compliance";

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>("account");
  const { data: org, isLoading: orgLoading } = useGetMyOrg();
  const updateOrg = useUpdateMyOrg();
  const qc = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();
  const role = useCurrentRole();
  const isAdmin = role === "admin";

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: fetchMembers,
    enabled: tab === "team",
  });

  const roleUpdateMutation = useMutation({
    mutationFn: updateRole,
    onSuccess: () => {
      toast({ title: "Role updated" });
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      toast({ title: "Member removed" });
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
  });

  const form = useForm<OrgForm>({
    defaultValues: { name: "", fromName: "", fromEmail: "", domain: "", locale: "en", dailySendLimit: 100 },
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

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "team", label: "Team", icon: Users },
    { id: "compliance", label: "Compliance", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and organization</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Account tab */}
      {tab === "account" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Your Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-display font-bold text-xl">
                  {user?.firstName?.[0] ?? "U"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{user?.fullName ?? "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className={cn(
                  "mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                  ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.color ?? ROLE_CONFIG.viewer.color
                )}>
                  {(() => {
                    const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer;
                    const Icon = cfg.icon;
                    return <><Icon className="w-3 h-3" />{cfg.label}</>;
                  })()}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              To update your name, email or profile picture, use the Clerk account portal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Organization tab */}
      {tab === "organization" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization</CardTitle>
            <CardDescription>Configure your outreach settings</CardDescription>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input id="org-name" data-testid="input-org-name" className="mt-1.5" disabled={!isAdmin} {...form.register("name")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-name">From Name</Label>
                    <Input id="from-name" data-testid="input-from-name" className="mt-1.5" placeholder="Your name or company" disabled={!isAdmin} {...form.register("fromName")} />
                  </div>
                  <div>
                    <Label htmlFor="from-email">From Email</Label>
                    <Input id="from-email" data-testid="input-from-email" className="mt-1.5" type="email" placeholder="outreach@yourdomain.com" disabled={!isAdmin} {...form.register("fromEmail")} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="domain">Sending Domain</Label>
                  <Input id="domain" data-testid="input-domain" className="mt-1.5" placeholder="yourdomain.com" disabled={!isAdmin} {...form.register("domain")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locale">Default Language</Label>
                    <select
                      id="locale"
                      data-testid="select-locale"
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                      disabled={!isAdmin}
                      {...form.register("locale")}
                    >
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="daily-limit">Daily Send Limit</Label>
                    <Input id="daily-limit" data-testid="input-daily-limit" className="mt-1.5" type="number" disabled={!isAdmin} {...form.register("dailySendLimit", { valueAsNumber: true })} />
                  </div>
                </div>
                {isAdmin && (
                  <Button type="submit" disabled={updateOrg.isPending} data-testid="button-save-settings">
                    {updateOrg.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">Only admins can edit organization settings.</p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team tab */}
      {tab === "team" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Team Members</CardTitle>
                <CardDescription className="mt-1">
                  {isAdmin ? "Manage roles and access for your team" : "View team members"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !members?.length ? (
              <p className="text-muted-foreground text-sm py-4">No members found.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const cfg = ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer;
                  const RoleIcon = cfg.icon;
                  const displayName = m.firstName ? `${m.firstName} ${m.lastName ?? ""}`.trim() : m.email ?? m.clerkUserId;
                  const isCurrentUser = m.clerkUserId === user?.id;

                  return (
                    <div key={m.id} data-testid={`member-row-${m.id}`} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold text-sm">
                          {(m.firstName?.[0] ?? m.email?.[0] ?? "?").toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">you</span>
                          )}
                        </div>
                        {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                      </div>

                      {isAdmin && !isCurrentUser ? (
                        <Select
                          value={m.role}
                          onValueChange={(newRole) => roleUpdateMutation.mutate({ memberId: m.id, role: newRole })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`role-select-${m.id}`}>
                            <div className={cn("flex items-center gap-1.5 px-1 py-0.5 rounded text-xs font-medium", cfg.color)}>
                              <RoleIcon className="w-3 h-3" />
                              {cfg.label}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="w-3.5 h-3.5 text-orange-500" /> Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="sales_user">
                              <div className="flex items-center gap-2">
                                <Pencil className="w-3.5 h-3.5 text-blue-500" /> Sales User
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Viewer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", cfg.color)}>
                          <RoleIcon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      )}

                      {isAdmin && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive hover:text-destructive shrink-0"
                          data-testid={`button-remove-member-${m.id}`}
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Admin</strong> — full access including settings and team management.<br />
                <strong>Sales User</strong> — can manage contacts, campaigns, and emails.<br />
                <strong>Viewer</strong> — read-only access to all data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance tab */}
      {tab === "compliance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> PDPA 2022 Compliance</CardTitle>
            <CardDescription>Tanzania Personal Data Protection Act requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Unsubscribe links", desc: "Every outbound email includes a one-click unsubscribe link as required by PDPA Section 18." },
              { label: "Consent records", desc: "Opt-in consent is logged per contact with timestamp for each explicit permission granted." },
              { label: "Opt-out processing", desc: "Unsubscribe requests update the contact's optedOut field immediately and halt all future sends." },
              { label: "Data minimisation", desc: "Only the data necessary for outreach is collected. No sensitive personal data is stored." },
              { label: "Retention policy", desc: "Contact data can be deleted on request via the Contacts page in compliance with right-to-erasure." },
              { label: "Access controls", desc: "Role-based access (Admin / Sales / Viewer) limits data exposure to authorised personnel only." },
            ].map(({ label, desc }) => (
              <div key={label} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
