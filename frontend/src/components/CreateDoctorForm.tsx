import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface CreateDoctorFormProps {
  onSuccess: (doctor: any) => void;
}

export function CreateDoctorForm({ onSuccess }: CreateDoctorFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      const response = await api.post("/admin/doctors/", {
        full_name: name,
        email: email,
        password: password,
      });
      toast({
        title: "Doctor Created",
        description: `Account for ${name} created successfully.`,
      });
      onSuccess(response.data.user || response.data);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to create doctor",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
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
        The doctor will be forced to change this password on their first login.
      </div>
      <Button
        className="w-full"
        disabled={!name || !email || !password || loading}
        onClick={handleCreate}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </div>
  );
}
