import { useGetDashboardStats } from "@workspace/api-client-react";
import { Users, Megaphone, Mail, TrendingUp, Activity, Flame, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; sub?: string }) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-display font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your outreach performance at a glance</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-20 bg-muted animate-pulse rounded-lg" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Contacts" value={stats?.totalContacts ?? 0} icon={Users} />
            <StatCard label="Campaigns" value={stats?.totalCampaigns ?? 0} icon={Megaphone} sub={`${stats?.activeCampaigns ?? 0} active`} />
            <StatCard label="Emails Sent" value={stats?.emailsSentThisMonth ?? 0} icon={Mail} sub="this month" />
            <StatCard label="Avg Open Rate" value={`${(stats?.avgOpenRate ?? 0).toFixed(1)}%`} icon={TrendingUp} sub={`${(stats?.avgReplyRate ?? 0).toFixed(1)}% reply rate`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hot Leads</p>
                  <p className="text-2xl font-display font-bold">{stats?.hotLeads ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qualified Leads</p>
                  <p className="text-2xl font-display font-bold">{stats?.qualifiedLeads ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" data-testid="link-view-campaigns">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!stats?.recentCampaigns?.length ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No campaigns yet.</p>
              <Link href="/campaigns">
                <Button size="sm" className="mt-3" data-testid="button-create-campaign">Create your first campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentCampaigns.map((c) => (
                <div key={c.id} data-testid={`campaign-row-${c.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.sentCount} sent · {c.openedCount} opened</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] ?? statusColors.draft}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
