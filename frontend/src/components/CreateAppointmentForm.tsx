import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Patient, Doctor, Appointment } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { PatientSelector } from "./PatientSelector";

interface CreateAppointmentFormProps {
  isAdmin: boolean;
  onSuccess: (appointment: Appointment) => void;
}

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

export function CreateAppointmentForm({
  isAdmin,
  onSuccess,
}: CreateAppointmentFormProps) {
  const { toast } = useToast();

  // Selection State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [smsReceived, setSmsReceived] = useState(false);

  // Search & Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [doctorPopoverOpen, setDoctorPopoverOpen] = useState(false);

  const [creating, setCreating] = useState(false);

  // Debounced doctor search
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      setIsSearchingDoctors(true);
      const endpoint = doctorSearch
        ? `/admin/doctors/all/?q=${doctorSearch}&active_only=true`
        : "/admin/doctors/all/?active_only=true";
      api
        .get(endpoint)
        .then((res) => {
          setDoctors(
            Array.isArray(res.data) ? res.data : res.data.doctors || [],
          );
          setIsSearchingDoctors(false);
        })
        .catch(() => setIsSearchingDoctors(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [isAdmin, doctorSearch]);

  const handleCreate = async () => {
    if (!selectedPatientId || !selectedDate) return;

    setCreating(true);
    try {
      const payload: any = {
        patientIdInput: selectedPatientId,
        appointmentDate:
          format(selectedDate, "yyyy-MM-dd") + "T" + selectedTime + ":00",
        smsReceived: smsReceived,
      };

      if (isAdmin && selectedDoctorId) {
        payload.doctorId = selectedDoctorId;
      }

      const res = await api.post("/appointments/", payload);
      toast({
        title: "Appointment Created",
        description: "The appointment has been scheduled successfully.",
      });
      onSuccess(res.data);

      // Reset form
      setSelectedPatientId("");
      setSelectedDate(undefined);
      setSelectedDoctorId("");
      setSmsReceived(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.error || "Failed to create appointment",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Patient</Label>
        <PatientSelector
          selectedPatientId={selectedPatientId}
          onSelect={(p) => setSelectedPatientId(p?.id || "")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
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
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label>Assigned Doctor</Label>
          <Popover open={doctorPopoverOpen} onOpenChange={setDoctorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={doctorPopoverOpen}
                className="w-full justify-between font-normal"
              >
                {selectedDoctorId
                  ? doctors.find((d) => d.id === selectedDoctorId)?.fullName
                  : "Select doctor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search doctor name or email..."
                  value={doctorSearch}
                  onValueChange={setDoctorSearch}
                />
                <CommandList>
                  {isSearchingDoctors && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">
                        Searching...
                      </span>
                    </div>
                  )}
                  {!isSearchingDoctors && doctors.length === 0 && (
                    <CommandEmpty>No doctor found.</CommandEmpty>
                  )}
                  <CommandGroup>
                    {doctors.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={d.id}
                        onSelect={(currentValue) => {
                          setSelectedDoctorId(
                            currentValue === selectedDoctorId
                              ? ""
                              : currentValue,
                          );
                          setDoctorPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDoctorId === d.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{d.fullName}</span>
                          <span className="text-xs text-muted-foreground">
                            {d.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch checked={smsReceived} onCheckedChange={setSmsReceived} />
        <Label>SMS Reminder Received</Label>
      </div>

      <Button
        className="w-full"
        disabled={
          !selectedPatientId ||
          !selectedDate ||
          creating ||
          (isAdmin && !selectedDoctorId)
        }
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
  );
}
