import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarCheck,
  UserX,
  UserCheck,
  Brain,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { weeklyTrends } from "@/data/mockData";
import type { Appointment } from "@/data/mockData";
import {
  format,
  subDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import api from "@/lib/api";

interface PredictionStats {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--destructive))"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [predStats, setPredStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apptRes, statsRes] = await Promise.all([
          api.get<Appointment[]>("/appointments/"),
          api.get<PredictionStats>("/stats/predictions/"),
        ]);
        setAppointments(apptRes.data);
        setPredStats(statsRes.data);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppts = appointments.filter((a) => a.date === today);
  const doneAppts = appointments.filter((a) => a.status === "done");

  const showedUpCount = doneAppts.filter((a) => a.showedUp === true).length;
  const noShowCount = doneAppts.filter((a) => a.showedUp === false).length;
  const lateCount = doneAppts.filter((a) => a.wasLate === true).length;
  const totalDone = doneAppts.length;
  const showRate =
    totalDone > 0 ? Math.round((showedUpCount / totalDone) * 100) : 0;
  const noShowRate = totalDone > 0 ? 100 - showRate : 0;

  // ── Last 7 days weekly trend (computed from real data) ─────────────────────
  const weeklyData = WEEK_DAYS.map((day, i) => {
    // Build a day range for each of the last 7 days
    const targetDate = subDays(new Date(), 6 - i);
    const dateStr = format(targetDate, "yyyy-MM-dd");
    const dayAppts = appointments.filter(
      (a) => a.date === dateStr && a.status === "done",
    );
    const dayTotal = dayAppts.length;
    const dayShowed = dayAppts.filter((a) => a.showedUp).length;
    return {
      day,
      date: dateStr,
      appointments: dayTotal,
      showRate: dayTotal > 0 ? Math.round((dayShowed / dayTotal) * 100) : 0,
      noShowRate:
        dayTotal > 0
          ? Math.round(((dayTotal - dayShowed) / dayTotal) * 100)
          : 0,
    };
  });

  // Use weeklyTrends as visual fallback if no real data in last 7 days
  const hasRealWeeklyData = weeklyData.some((d) => d.appointments > 0);
  const chartData = hasRealWeeklyData ? weeklyData : weeklyTrends;

  // ── Pie chart data ────────────────────────────────────────────────────────
  const pieData = [
    { name: "Showed Up", value: showedUpCount },
    { name: "No-Show", value: noShowCount },
  ].filter((d) => d.value > 0);

  const accuracy = predStats?.accuracy ?? 0;

  const statCards = [
    {
      label: "Today's Appointments",
      value: todayAppts.length,
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Show-Up Rate",
      value: `${showRate}%`,
      icon: UserCheck,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "No-Show Rate",
      value: `${noShowRate}%`,
      icon: UserX,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Prediction Accuracy",
      value: `${accuracy}%`,
      icon: Brain,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Late Arrivals",
      value: lateCount,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Total Analyzed",
      value: predStats?.total ?? 0,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dashboard…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of appointments and prediction performance
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card
              key={card.label}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {card.label}
                    </p>
                    <p
                      className={`font-display text-3xl font-bold ${card.color}`}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Weekly bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Weekly Trends
                {!hasRealWeeklyData && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (sample data — no done appointments in last 7 days)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={10}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar
                    dataKey="showRate"
                    name="Show Rate"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="noShowRate"
                    name="No-Show Rate"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Appointment Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  No completed appointments yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No appointments yet
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b last:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.date} · {a.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={
                          a.prediction.label === "Show"
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        {a.prediction.label} {a.prediction.probability}%
                      </span>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === "done"
                            ? "bg-success/10 text-success"
                            : a.status === "canceled"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
