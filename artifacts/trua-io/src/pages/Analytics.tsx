import { useGetDashboardStats, useGetContactStageBreakdown, useGetEmailTimeline } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  qualified: "#3b82f6",
  hot: "#f97316",
  customer: "#1D9E75",
};

const PIE_COLORS = ["#1D9E75", "#3b82f6", "#f97316", "#a855f7", "#ef4444"];

export default function Analytics() {
  const { data: stats } = useGetDashboardStats();
  const { data: stages } = useGetContactStageBreakdown();
  const { data: timeline } = useGetEmailTimeline();

  const stageData = stages?.map((s) => ({
    name: s.stage.charAt(0).toUpperCase() + s.stage.slice(1),
    value: s.count,
  })) ?? [];

  const timelineData = timeline?.slice(-14) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Performance insights for your outreach</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Open Rate", value: `${(stats?.avgOpenRate ?? 0).toFixed(1)}%`, color: "text-primary" },
          { label: "Avg Reply Rate", value: `${(stats?.avgReplyRate ?? 0).toFixed(1)}%`, color: "text-blue-600" },
          { label: "Active Campaigns", value: stats?.activeCampaigns ?? 0, color: "text-orange-500" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-3xl font-display font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Email Activity (14 days)</CardTitle></CardHeader>
          <CardContent>
            {!timelineData.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No email data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#1D9E75" strokeWidth={2} dot={false} name="Sent" />
                  <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} dot={false} name="Opened" />
                  <Line type="monotone" dataKey="replied" stroke="#f97316" strokeWidth={2} dot={false} name="Replied" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contacts by Stage</CardTitle></CardHeader>
          <CardContent>
            {!stageData.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No contacts yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={STAGE_COLORS[entry.name.toLowerCase()] ?? PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Contact Stage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stageData.length ? (
            <p className="text-muted-foreground text-sm">Add contacts to see stage distribution</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Contacts" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={STAGE_COLORS[entry.name.toLowerCase()] ?? PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
