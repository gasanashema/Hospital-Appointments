import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Patient } from "@/data/mockData";

interface PatientSelectorProps {
  selectedPatientId: string;
  onSelect: (patient: Patient | null) => void;
  label?: string;
  placeholder?: string;
}

export function PatientSelector({
  selectedPatientId,
  onSelect,
  label = "Select patient...",
  placeholder = "Search name or ID...",
}: PatientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const endpoint = search ? `/patients/search/?q=${search}` : "/patients/";
      api
        .get(endpoint)
        .then((res) => {
          setPatients(
            Array.isArray(res.data) ? res.data : res.data.patients || [],
          );
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedPatientId
            ? `${selectedPatient?.fullName || "Patient"} (${selectedPatientId})`
            : label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            )}
            {!loading && patients.length === 0 && (
              <CommandEmpty>No patient found.</CommandEmpty>
            )}
            <CommandGroup>
              {patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={(currentValue) => {
                    const isSelected = currentValue === selectedPatientId;
                    onSelect(isSelected ? null : p);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedPatientId === p.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{p.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.id}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
