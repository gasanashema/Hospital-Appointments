import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Patient, initialPatients } from "@/data/mockData";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Loader2, Plus, Trash2, Users, Pencil } from "lucide-react";

export default function UsersPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get("/users/");
      setPatients(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch patients",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !age || !gender) return;
    const newId = `P-${String(patients.length + 1).padStart(3, "0")}`;
    const patientData = {
      id: newId,
      fullName: name,
      age: parseInt(age),
      gender,
    };

    try {
      const response = await api.post("/users/", patientData);
      setPatients((prev) => [...prev, response.data]);
      setDialogOpen(false);
      setName("");
      setAge("");
      setGender("");
      toast({ title: "Patient added", description: response.data.fullName });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add patient",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedPatient || !editName || !editAge) return;

    try {
      const response = await api.patch(`/users/${selectedPatient.id}/`, {
        fullName: editName,
        age: parseInt(editAge),
      });
      setPatients((prev) =>
        prev.map((p) => (p.id === selectedPatient.id ? response.data : p)),
      );
      setEditDialogOpen(false);
      toast({ title: "Patient updated", description: editName });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update patient",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}/`);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Patient removed" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete patient",
      });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setEditName(patient.fullName);
    setEditAge(patient.age.toString());
    setEditDialogOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success text-success-foreground";
    if (score >= 50) return "bg-warning text-warning-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Users
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage patient records
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">
                    Add New Patient
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="35"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed text-xs text-muted-foreground">
                    Attendance score will be generated automatically.
                  </div>
                  <Button
                    className="w-full"
                    disabled={!name || !age || !gender}
                    onClick={handleAdd}
                  >
                    Add Patient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Patient Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Edit Patient</DialogTitle>
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
                <Label>Age</Label>
                <Input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Attendance Score</Label>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border h-10">
                  <span className="text-sm font-medium">
                    {selectedPatient?.attendanceScore}%
                  </span>
                  <Badge
                    className={
                      selectedPatient
                        ? getScoreColor(selectedPatient.attendanceScore)
                        : ""
                    }
                  >
                    System Generated
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  This score is managed by the backend analytics.
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!editName || !editAge}
                onClick={handleUpdate}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-base">
                Patient Directory ({patients.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead className="text-center">Age</TableHead>
                      <TableHead className="text-center">Attendance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Loading patients...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : patients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <p className="text-sm text-muted-foreground">
                            No patients found
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      patients.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {p.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.fullName}
                          </TableCell>
                          <TableCell className="text-center">{p.age}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getScoreColor(p.attendanceScore)}>
                              {p.attendanceScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => openEditDialog(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the patient
                                      record for {p.fullName}. This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDelete(p.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
