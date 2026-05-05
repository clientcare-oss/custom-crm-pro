import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const MEETING_TYPES = [
  { id: "iep-meeting", label: "IEP Meeting", duration: "60 min", description: "Individualized Education Program meeting" },
  { id: "1-on-1-advocate", label: "1:1 with Advocate", duration: "30 min", description: "One-on-one session with your advocate" },
  { id: "progress-update", label: "Progress Update", duration: "30 min", description: "Review progress and next steps" },
  { id: "consultation", label: "Consultation", duration: "45 min", description: "Initial consultation for new clients" },
  { id: "follow-up", label: "Follow-up", duration: "15 min", description: "Quick follow-up on previous discussion" },
];

export default function BookingPage() {
  const [step, setStep] = useState<"type" | "details" | "confirmed">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    notes: "",
  });

  const createAppointment = trpc.appointments.book.useMutation({
    onSuccess: () => {
      setStep("confirmed");
      toast.success("Appointment booked successfully!");
    },
    onError: () => {
      toast.error("Failed to book appointment. Please try again.");
    },
  });

  const handleBooking = () => {
    if (!selectedType || !formData.name || !formData.email || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields");
      return;
    }
    const meetingType = MEETING_TYPES.find((t) => t.id === selectedType);
    createAppointment.mutate({
      title: `${meetingType?.label} - ${formData.name}`,
      startTime: new Date(`${formData.date}T${formData.time}`),
      endTime: new Date(new Date(`${formData.date}T${formData.time}`).getTime() + 60 * 60 * 1000),
      description: `Meeting Type: ${meetingType?.label}\nClient: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nNotes: ${formData.notes}`,
    });
  };

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-4">
              Your {MEETING_TYPES.find((t) => t.id === selectedType)?.label} has been scheduled.
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation will be sent to <strong>{formData.email}</strong>
            </p>
            <Button className="mt-6" onClick={() => { setStep("type"); setSelectedType(null); setFormData({ name: "", email: "", phone: "", date: "", time: "", notes: "" }); }}>
              Book Another Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Schedule a Meeting</h1>
          <p className="text-muted-foreground mt-2">Choose a meeting type and select a time that works for you.</p>
        </div>

        {step === "type" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Select Meeting Type</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {MEETING_TYPES.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedType === type.id ? "ring-2 ring-primary border-primary" : ""}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {type.label}
                      <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {type.duration}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <Button disabled={!selectedType} onClick={() => setStep("details")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Book Your {MEETING_TYPES.find((t) => t.id === selectedType)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Preferred Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time *</Label>
                  <Select value={formData.time} onValueChange={(v) => setFormData({ ...formData, time: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="09:30">9:30 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="10:30">10:30 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="11:30">11:30 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="13:00">1:00 PM</SelectItem>
                      <SelectItem value="13:30">1:30 PM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="14:30">2:30 PM</SelectItem>
                      <SelectItem value="15:00">3:00 PM</SelectItem>
                      <SelectItem value="15:30">3:30 PM</SelectItem>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                      <SelectItem value="16:30">4:30 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information or questions..."
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("type")}>
                  Back
                </Button>
                <Button onClick={handleBooking} disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
