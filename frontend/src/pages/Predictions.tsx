import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { monthlyPredictions } from "@/data/mockData";
import type { Appointment } from "@/data/mockData";
import {
  Brain,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";

interface PredStats {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--destructive))"];

export default function Predictions() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<PredStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apptRes, statsRes] = await Promise.all([
          api.get<Appointment[]>("/appointments/"),
          api.get<PredStats>("/analytics/predictions/"),
        ]);
        setAppointments(
          Array.isArray(apptRes.data)
            ? apptRes.data
            : (apptRes.data as any).appointments,
        );
        setStats(statsRes.data);
      } catch (err) {
        console.error("Predictions fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Derive correct vs incorrect predictions from real appointments ─────────
  const doneAppts = appointments.filter(
    (a) =>
      a.status === "done" && a.showedUp !== null && a.showedUp !== undefined,
  );

  const correctPredictions = doneAppts.filter(
    (a) =>
      a.prediction &&
      ((a.prediction.label === "Show" && a.showedUp === true) ||
        (a.prediction.label === "No-show" && a.showedUp === false)),
  );

  const incorrectPredictions = doneAppts.filter(
    (a) =>
      a.prediction &&
      ((a.prediction.label === "Show" && a.showedUp === false) ||
        (a.prediction.label === "No-show" && a.showedUp === true)),
  );

  // ── Pie chart ──────────────────────────────────────────────────────────────
  const pieData = [
    { name: "Correct", value: stats?.correct ?? 0 },
    { name: "Incorrect", value: stats?.incorrect ?? 0 },
  ].filter((d) => d.value > 0);

  // ── Build monthly chart from real data bucketed by month ────────────────
  // Fall back to static monthlyPredictions if no real outcomes exist yet
  const monthlyMap: Record<string, { accurate: number; inaccurate: number }> =
    {};
  doneAppts.forEach((a) => {
    const month = a.date.slice(0, 7); // "YYYY-MM"
    if (!monthlyMap[month]) monthlyMap[month] = { accurate: 0, inaccurate: 0 };
    const correct =
      a.prediction &&
      ((a.prediction.label === "Show" && a.showedUp === true) ||
        (a.prediction.label === "No-show" && a.showedUp === false));
    if (correct) monthlyMap[month].accurate++;
    else monthlyMap[month].inaccurate++;
  });

  const realMonthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month: new Date(month + "-01").toLocaleString("default", {
        month: "short",
      }),
      ...v,
    }));

  const monthlyData = realMonthly.length > 0 ? realMonthly : monthlyPredictions;

  // ── Accuracy trend from monthly ────────────────────────────────────────────
  const accuracyTrend = monthlyData.map((m) => ({
    month: m.month,
    accuracy: Math.round((m.accurate / (m.accurate + m.inaccurate || 1)) * 100),
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading predictions…</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Predictions
          </h1>
          <p className="text-sm text-muted-foreground">
            ML model accuracy and prediction breakdown
          </p>
        </div>

        {/* Summary stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Evaluated",
              value: stats?.total ?? 0,
              icon: Brain,
              color: "text-info",
              bg: "bg-info/10",
            },
            {
              label: "Correct Predictions",
              value: stats?.correct ?? 0,
              icon: CheckCircle2,
              color: "text-success",
              bg: "bg-success/10",
            },
            {
              label: "Incorrect Predictions",
              value: stats?.incorrect ?? 0,
              icon: XCircle,
              color: "text-destructive",
              bg: "bg-destructive/10",
            },
            {
              label: "Accuracy",
              value: `${stats?.accuracy ?? 0}%`,
              icon: TrendingUp,
              color: "text-primary",
              bg: "bg-primary/10",
            },
          ].map((card) => (
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
          {/* Monthly accuracy bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Monthly Prediction Breakdown
                {realMonthly.length === 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (sample data)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barSize={10}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="accurate"
                    name="Correct"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inaccurate"
                    name="Incorrect"
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
                Prediction Accuracy Split
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  No evaluated predictions yet
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

        {/* Accuracy trend line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">
              Accuracy Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Correct / Incorrect prediction lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Correct */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Correct Predictions ({correctPredictions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {correctPredictions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No correct predictions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {correctPredictions.slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className="bg-success/10 text-success text-xs"
                      >
                        {a.prediction?.label} · {a.prediction?.probability}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incorrect */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Incorrect Predictions ({incorrectPredictions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incorrectPredictions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No incorrect predictions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {incorrectPredictions.slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {a.prediction?.label} · {a.prediction?.probability}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
