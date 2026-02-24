import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  Loader2,
  Plus,
  Stethoscope,
  Pencil,
  Power,
  PowerOff,
  Calendar,
  History,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Doctor {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at?: string;
}

interface Appointment {
  id: string;
  patientName: string;
  date: string;
  time: string;
  status: string;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [appointmentsSheetOpen, setAppointmentsSheetOpen] = useState(false);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>(
    [],
  );
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await api.get("/admin/doctors/all/");
      setDoctors(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !email || !password) return;
    try {
      const response = await api.post("/admin/doctors/", {
        full_name: name,
        email: email,
        password: password,
      });
      setDoctors((prev) => [...prev, response.data.user]);
      setAddDialogOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      toast({
        title: "Doctor Created",
        description: `Account for ${name} created with assigned password.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to create doctor",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedDoctor || !editName || !editEmail) return;
    try {
      const response = await api.patch(`/admin/doctors/${selectedDoctor.id}/`, {
        full_name: editName,
        email: editEmail,
      });
      setDoctors((prev) =>
        prev.map((d) => (d.id === selectedDoctor.id ? response.data : d)),
      );
      setEditDialogOpen(false);
      toast({ title: "Doctor updated", description: editName });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to update doctor",
      });
    }
  };

  const toggleStatus = async (doctor: Doctor) => {
    try {
      const newStatus = !doctor.is_active;
      const response = await api.patch(`/admin/doctors/${doctor.id}/`, {
        is_active: newStatus,
      });
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctor.id ? response.data : d)),
      );
      toast({
        title: `Doctor ${newStatus ? "enabled" : "disabled"}`,
        description: doctor.full_name,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to toggle doctor status",
      });
    }
  };

  const viewAppointments = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setAppointmentsSheetOpen(true);
    setLoadingAppointments(true);
    try {
      const response = await api.get(`/appointments/doctor/${doctor.id}/`);
      setDoctorAppointments(response.data.appointments);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch appointments",
      });
    } finally {
      setLoadingAppointments(false);
    }
  };

  const openEditDialog = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditName(doctor.full_name);
    setEditEmail(doctor.email);
    setEditDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Doctor Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Add and manage healthcare providers
            </p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Register New Doctor
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Sarah Connor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@healthsphere.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-primary/80">
                  The doctor will be forced to change this password on their
                  first login.
                </div>
                <Button
                  className="w-full"
                  disabled={!name || !email || !password}
                  onClick={handleCreate}
                >
                  Create Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Doctor Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                Edit Doctor Profile
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!editName || !editEmail}
                onClick={handleUpdate}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointments Sheet */}
        <Sheet
          open={appointmentsSheetOpen}
          onOpenChange={setAppointmentsSheetOpen}
        >
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Doctor Appointments</SheetTitle>
              <SheetDescription>
                Appointment history for {selectedDoctor?.full_name}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {loadingAppointments ? (
                <div className="flex flex-col items-center py-12 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                  <span className="text-sm text-muted-foreground">
                    Retrieving history...
                  </span>
                </div>
              ) : doctorAppointments.length === 0 ? (
                <div className="text-center py-12 border rounded-xl border-dashed">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No appointments found
                  </p>
                </div>
              ) : (
                doctorAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border bg-card shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{app.patientName}</span>
                      <Badge
                        variant={app.status === "DONE" ? "outline" : "default"}
                      >
                        {app.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {app.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {app.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="font-display text-base">
                Hospital Staff ({doctors.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="active" className="gap-2">
                    Active
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 min-w-[1.25rem] justify-center bg-success/10 text-success border-success/20"
                    >
                      {doctors.filter((d) => d.is_active).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="gap-2">
                    Disabled
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 min-w-[1.25rem] justify-center bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20"
                    >
                      {doctors.filter((d) => !d.is_active).length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="m-0">
                  <DoctorTable
                    doctors={doctors.filter((d) => d.is_active)}
                    loading={loading}
                    onViewAppointments={viewAppointments}
                    onEdit={openEditDialog}
                    onToggleStatus={toggleStatus}
                  />
                </TabsContent>

                <TabsContent value="inactive" className="m-0">
                  <DoctorTable
                    doctors={doctors.filter((d) => !d.is_active)}
                    loading={loading}
                    onViewAppointments={viewAppointments}
                    onEdit={openEditDialog}
                    onToggleStatus={toggleStatus}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}

interface DoctorTableProps {
  doctors: Doctor[];
  loading: boolean;
  onViewAppointments: (doctor: Doctor) => void;
  onEdit: (doctor: Doctor) => void;
  onToggleStatus: (doctor: Doctor) => void;
}

function DoctorTable({
  doctors,
  loading,
  onViewAppointments,
  onEdit,
  onToggleStatus,
}: DoctorTableProps) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doctor</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground/40 mb-2" />
                <span className="text-sm text-muted-foreground">
                  Loading staff members...
                </span>
              </TableCell>
            </TableRow>
          ) : doctors.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-muted-foreground"
              >
                No doctors found in this category
              </TableCell>
            </TableRow>
          ) : (
            doctors.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{d.full_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      ID: {d.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.email}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={d.is_active ? "success" : "secondary"}>
                    {d.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => onViewAppointments(d)}
                      title="View Appointments"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => onEdit(d)}
                      title="Edit Profile"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${d.is_active ? "text-destructive" : "text-success"}`}
                      onClick={() => onToggleStatus(d)}
                      title={d.is_active ? "Disable Account" : "Enable Account"}
                    >
                      {d.is_active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
