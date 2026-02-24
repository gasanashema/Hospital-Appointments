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
  Plus,
  UserPlus,
  CalendarPlus,
  UserRoundPlus,
  PlusCircle,
  Stethoscope,
  CalendarIcon,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
import type { Appointment, Patient, Doctor } from "@/data/mockData";
import {
  format,
  subDays,
  isWithinInterval,
  isBefore,
  startOfDay,
  endOfDay,
} from "date-fns";
import api from "@/lib/api";
import { CreateAppointmentForm } from "@/components/CreateAppointmentForm";
import { CreateDoctorForm } from "@/components/CreateDoctorForm";
import { PatientSelector } from "@/components/PatientSelector";

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
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";

  // Quick Action Dialogs
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [predictDialogOpen, setPredictDialogOpen] = useState(false);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);

  // handleAddPatient state
  const [pName, setPName] = useState("");
  const [pAge, setPAge] = useState("");
  const [pGender, setPGender] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apptRes, statsRes] = await Promise.all([
          api.get<Appointment[]>("/appointments/"),
          api.get<PredictionStats>("/analytics/predictions/"),
        ]);
        setAppointments(
          Array.isArray(apptRes.data)
            ? apptRes.data
            : (apptRes.data as any).appointments,
        );
        setPredStats(statsRes.data);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const [aDate, setADate] = useState<Date>();
  const [aSms, setASms] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [onDemandRes, setOnDemandRes] = useState<any>(null);
  const [predictPatient, setPredictPatient] = useState<Patient | null>(null);
  const [predictDate, setPredictDate] = useState<Date>();

  const handleCreateDoctorSuccess = (newDoc: Doctor) => {
    // Optionally update local state if doctors were listed here,
    // but Dashboard only shows a quick action.
    setDoctorDialogOpen(false);
  };

  const handleCreateSuccess = (newAppt: Appointment) => {
    setAppointments((prev) => [newAppt, ...prev]);
    setApptDialogOpen(false);
  };

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

  const handleAddPatient = async () => {
    try {
      const res = await api.post("/patients/", {
        id: `P-${Date.now().toString().slice(-3)}`,
        fullName: pName,
        age: parseInt(pAge),
        gender: pGender,
      });
      setPatientDialogOpen(false);
      setPName("");
      setPAge("");
      setPGender("");
      toast({ title: "Patient added", description: res.data.fullName });
    } catch {
      toast({ variant: "destructive", title: "Error adding patient" });
    }
  };

  const handlePredictOnDemand = async () => {
    if (!predictPatient || !predictDate) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Please select both a patient and a date.",
      });
      return;
    }
    setPredicting(true);
    try {
      const res = await api.post("/predictions/predict/", {
        age: predictPatient.age,
        gender: predictPatient.gender,
        smsReceived: aSms ? 1 : 0,
        attendanceScore: (predictPatient as any).attendanceScore || 75,
        appointmentDate: predictDate.toISOString(),
      });
      setOnDemandRes(res.data);
    } catch {
      toast({ variant: "destructive", title: "Prediction failed" });
    } finally {
      setPredicting(false);
    }
  };

  // CreateAppointmentForm handles patient/doctor search natively

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

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {/* Add Patient */}
            <Dialog
              open={patientDialogOpen}
              onOpenChange={setPatientDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <UserPlus className="h-6 w-6 text-primary" />
                  <span>Add Patient</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={pAge}
                        onChange={(e) => setPAge(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={pGender} onValueChange={setPGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!pName || !pAge || !pGender}
                    onClick={handleAddPatient}
                  >
                    Create Patient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Appointment */}
            <Dialog open={apptDialogOpen} onOpenChange={setApptDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <CalendarPlus className="h-6 w-6 text-primary" />
                  <span>New Appointment</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <CreateAppointmentForm
                    isAdmin={isAdmin}
                    onSuccess={handleCreateSuccess}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Predict On-Demand */}
            <Dialog
              open={predictDialogOpen}
              onOpenChange={setPredictDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all text-info hover:text-info"
                >
                  <Brain className="h-6 w-6" />
                  <span>On-Demand Predict</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Prediction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <PatientSelector
                      selectedPatientId={predictPatient?.id || ""}
                      onSelect={setPredictPatient}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Appointment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !predictDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {predictDate
                            ? format(predictDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={predictDate}
                          onSelect={setPredictDate}
                          disabled={(date) =>
                            isBefore(date, startOfDay(new Date()))
                          }
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={aSms} onCheckedChange={setASms} />
                    <Label>SMS Reminder Sent</Label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePredictOnDemand}
                    disabled={predicting}
                  >
                    {predicting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Run Prediction Analysis"
                    )}
                  </Button>

                  {onDemandRes && (
                    <div
                      className={cn(
                        "p-4 rounded-lg text-center border mt-2",
                        onDemandRes.label === "Show"
                          ? "bg-success/10 border-success/20 text-success"
                          : "bg-destructive/10 border-destructive/20 text-destructive",
                      )}
                    >
                      <p className="text-xs uppercase font-semibold">
                        Predicted Outcome
                      </p>
                      <p className="text-2xl font-bold">
                        {onDemandRes.probability}% {onDemandRes.label}
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Doctor (Admin only) */}
            {isAdmin && (
              <Dialog
                open={doctorDialogOpen}
                onOpenChange={setDoctorDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <UserRoundPlus className="h-6 w-6 text-primary" />
                    <span>Add Doctor</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Doctor</DialogTitle>
                  </DialogHeader>
                  <CreateDoctorForm onSuccess={handleCreateDoctorSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>
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
                      {a.prediction ? (
                        <div className="text-right">
                          <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground uppercase opacity-70">
                            <Brain className="h-2.5 w-2.5 text-info" />
                            Prediction: {a.prediction.probability}%
                          </p>
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              a.prediction.label === "Show"
                                ? "text-success"
                                : "text-destructive",
                            )}
                          >
                            Decision: {a.prediction.label}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          No prediction
                        </span>
                      )}
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
