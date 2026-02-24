import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  Plus,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Loader2,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Appointment, Patient } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Create form state
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [smsReceived, setSmsReceived] = useState(false);
  const [creating, setCreating] = useState(false);

  // Outcome button loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { toast } = useToast();

  const pending = appointments.filter((a) => a.status === "pending");
  const done = appointments.filter(
    (a) => a.status === "done" || a.status === "canceled",
  );

  // ── Fetch appointments and patients on mount ──────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, patientsRes] = await Promise.all([
          api.get("/appointments/"),
          api.get("/patients/"),
        ]);
        setAppointments(
          Array.isArray(apptRes.data)
            ? apptRes.data
            : apptRes.data.appointments,
        );
        setPatients(
          Array.isArray(patientsRes.data)
            ? patientsRes.data
            : patientsRes.data.patients,
        );
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load appointments.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Create appointment (auto-generates prediction in backend) ─────────────
  const handleCreate = async () => {
    if (!selectedPatientId || !selectedDate) return;
    setCreating(true);
    try {
      const response = await api.post("/appointments/", {
        patientIdInput: selectedPatientId,
        appointmentDate:
          format(selectedDate, "yyyy-MM-dd") + "T" + selectedTime + ":00",
        smsReceived,
      });
      setAppointments((prev) => [response.data, ...prev]);
      setDialogOpen(false);
      setSelectedPatientId("");
      setSelectedDate(undefined);
      setSmsReceived(false);
      toast({
        title: "Appointment created",
        description: `${response.data.patientName} on ${format(selectedDate, "PPP")}`,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.error ||
        "Failed to create appointment.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setCreating(false);
    }
  };

  // ── Mark appointment as done (showed up / late / no-show) ─────────────────
  const handleMarkDone = async (
    id: string,
    showedUp: boolean,
    wasLate: boolean,
  ) => {
    setActionLoading(id + (wasLate ? "-late" : showedUp ? "-show" : "-noshow"));
    try {
      const response = await api.patch(`/appointments/${id}/`, {
        showedUp,
        wasLate,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? response.data : a)),
      );
      toast({ title: "Appointment updated" });
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to update appointment.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cancel appointment ────────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    setActionLoading(id + "-cancel");
    try {
      const response = await api.post(`/appointments/${id}/cancel/`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? response.data : a)),
      );
      toast({ title: "Appointment canceled" });
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to cancel appointment.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const openDetailModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setDetailModalOpen(true);
  };

  // ── Appointment Card ──────────────────────────────────────────────────────
  const AppointmentCard = ({ appt }: { appt: Appointment }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card
        className="transition-all hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
        onClick={() => openDetailModal(appt)}
      >
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-display font-semibold text-foreground">
                {appt.patientName}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(new Date(appt.date + "T00:00:00"), "PPP")} at{" "}
                {appt.time}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                SMS: {appt.smsReceived ? "Yes" : "No"}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* ML Prediction badge */}
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-info" />
                <Badge
                  variant={
                    appt.prediction.label === "Show" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {appt.prediction.label} ({appt.prediction.probability}%)
                </Badge>
              </div>

              {/* Status badges */}
              {appt.status === "canceled" && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  <Ban className="mr-1 h-3 w-3" /> Canceled
                </Badge>
              )}
              {appt.status === "done" && (
                <div className="flex items-center gap-1.5">
                  {appt.showedUp ? (
                    <Badge variant="default" className="bg-success text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Showed Up
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="mr-1 h-3 w-3" /> No-Show
                    </Badge>
                  )}
                  {appt.wasLate && (
                    <Badge variant="outline" className="text-xs text-warning">
                      <Clock className="mr-1 h-3 w-3" /> Late
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons — only for pending appointments */}
          {appt.status === "pending" && (
            <div
              className="mt-4 flex flex-wrap gap-2 border-t pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                disabled={actionLoading === appt.id + "-cancel"}
                onClick={() => handleCancel(appt.id)}
              >
                {actionLoading === appt.id + "-cancel" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="hover:bg-primary/10"
                disabled={actionLoading === appt.id + "-show"}
                onClick={() => handleMarkDone(appt.id, true, false)}
              >
                {actionLoading === appt.id + "-show" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                )}
                Showed Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="hover:bg-warning/10"
                disabled={actionLoading === appt.id + "-late"}
                onClick={() => handleMarkDone(appt.id, true, true)}
              >
                {actionLoading === appt.id + "-late" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="mr-1 h-3.5 w-3.5" />
                )}
                Showed Late
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                disabled={actionLoading === appt.id + "-noshow"}
                onClick={() => handleMarkDone(appt.id, false, false)}
              >
                {actionLoading === appt.id + "-noshow" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                )}
                No-Show
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ];

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Appointments
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and track patient appointments
            </p>
          </div>

          {/* Create Appointment Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Create Appointment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select
                    value={selectedPatientId}
                    onValueChange={setSelectedPatientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName} ({p.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          isBefore(date, startOfDay(new Date()))
                        }
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={smsReceived}
                    onCheckedChange={setSmsReceived}
                  />
                  <Label>SMS Reminder Received</Label>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedPatientId || !selectedDate || creating}
                  onClick={handleCreate}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Prediction…
                    </>
                  ) : (
                    "Create Appointment"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Detail View Modal (read-only — prediction is immutable once saved) */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Appointment Details
              </DialogTitle>
            </DialogHeader>

            {selectedAppt && (
              <div className="space-y-6 pt-2">
                {/* Prediction section */}
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl p-6 border shadow-sm",
                    selectedAppt.prediction.label === "Show"
                      ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                      : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground opacity-70">
                        Likelihood Prediction
                      </p>
                      <h3
                        className={cn(
                          "text-3xl font-bold tracking-tight",
                          selectedAppt.prediction.label === "Show"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {selectedAppt.prediction.probability}%{" "}
                        {selectedAppt.prediction.label}
                      </h3>
                    </div>
                    <div
                      className={cn(
                        "rounded-full p-3",
                        selectedAppt.prediction.label === "Show"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40"
                          : "bg-red-100 text-red-600 dark:bg-red-900/40",
                      )}
                    >
                      <Brain className="h-8 w-8" />
                    </div>
                  </div>
                  <Brain className="absolute -bottom-4 -right-4 h-24 w-24 text-foreground opacity-[0.03]" />
                </div>

                {/* Patient info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Patient
                    </Label>
                    <div className="font-medium">
                      {selectedAppt.patientName}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Date & Time
                    </Label>
                    <div className="font-medium text-sm">
                      {format(new Date(selectedAppt.date + "T00:00:00"), "PPP")}{" "}
                      · {selectedAppt.time}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      SMS Reminder
                    </Label>
                    <div className="font-medium">
                      {selectedAppt.smsReceived ? "Sent ✓" : "Not sent"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <div className="capitalize font-medium">
                      {selectedAppt.status}
                    </div>
                  </div>
                </div>

                {/* Outcome info for done appointments */}
                {selectedAppt.status === "done" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border">
                    {selectedAppt.showedUp ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium">
                      {selectedAppt.showedUp
                        ? "Patient showed up"
                        : "Patient did not show"}
                      {selectedAppt.wasLate ? " (arrived late)" : ""}
                    </span>
                  </div>
                )}

                {/* Non-editable notice for closed appointments */}
                {selectedAppt.status !== "pending" && (
                  <div className="flex items-center justify-center p-3 rounded-lg bg-muted/30 border border-dashed text-xs text-muted-foreground uppercase tracking-widest font-medium">
                    This appointment is {selectedAppt.status}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tabs: Pending / Done */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading appointments…</span>
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              <AnimatePresence>
                {pending.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    No pending appointments
                  </p>
                ) : (
                  pending.map((a) => <AppointmentCard key={a.id} appt={a} />)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="done" className="mt-4 space-y-3">
              <AnimatePresence>
                {done.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    No completed appointments
                  </p>
                ) : (
                  done.map((a) => <AppointmentCard key={a.id} appt={a} />)
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
