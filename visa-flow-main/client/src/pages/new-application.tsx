import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, FilePlus, Globe, Plane, FileText, Upload, CheckCircle2, X, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiRequest, uploadFile } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  applicationType: z.string(),
  visaType: z.string().min(1, "Visa type is required"),
  passportNumber: z.string().min(3, "Passport number is required"),
  destinationCountry: z.string().min(2, "Destination country is required"),
  purposeOfVisit: z.string().min(10, "Please describe your purpose (at least 10 characters)"),
  intendedEntryDate: z.string().optional(),
  intendedExitDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const VISA_TYPES = [
  { value: "tourist", label: "Tourist Visa" },
  { value: "student", label: "Student Visa" },
  { value: "work", label: "Work Visa" },
  { value: "business", label: "Business Visa" },
  { value: "transit", label: "Transit Visa" },
  { value: "family", label: "Family Reunification" },
];

const POPULAR_COUNTRIES = [
  "USA", "China", "UK", "Canada", "Australia", "India",
  "France", "Germany", "Japan", "UAE", "Netherlands", "Spain", "Italy", "Portugal",
];

const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  tourist: ["Valid Passport", "Passport Photo", "Bank Statement", "Travel Itinerary", "Travel Insurance"],
  student: ["Valid Passport", "Acceptance Letter", "Financial Proof", "Academic Records", "Medical Certificate"],
  work: ["Valid Passport", "Job Offer Letter", "Educational Certificates", "Bank Statement", "Medical Certificate"],
  business: ["Valid Passport", "Business Invitation", "Company Registration", "Bank Statement", "Business Plan"],
  transit: ["Valid Passport", "Onward Ticket", "Destination Visa", "Travel Itinerary"],
  family: ["Valid Passport", "Sponsor Proof", "Relationship Documents", "Financial Support Letter"],
};

export default function NewApplication() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const passportPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const bankInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicationType: "new",
      visaType: "",
      passportNumber: "",
      destinationCountry: "",
      purposeOfVisit: "",
      intendedEntryDate: "",
      intendedExitDate: "",
    },
  });

  const visaType = form.watch("visaType");
  const requirements = visaType ? DOCUMENT_REQUIREMENTS[visaType] || [] : [];

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/applications", data);
      const app = await res.json();

      const uploads: Array<{ file: File; type: string }> = [];
      if (passportPhotoFile) uploads.push({ file: passportPhotoFile, type: "photo" });
      if (passportFile) uploads.push({ file: passportFile, type: "passport" });
      if (bankFile) uploads.push({ file: bankFile, type: "financial" });

      for (const { file, type } of uploads) {
        await uploadFile(`/api/applications/${app.id}/upload`, file, { documentType: type });
      }

      return app;
    },
    onSuccess: (app) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/documents"] });
      toast({ title: "Application Created", description: "Your application has been submitted successfully." });
      navigate(`/applications/${app.id}`);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-Black">New Visa Application</h1>
          <p className="text-black-200/60 text-sm">Fill in the details to begin your application</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-primary" />
                Application Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="applicationType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-application-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">New Application</SelectItem>
                            <SelectItem value="renewal">Renewal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="visaType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visa Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-visa-type">
                              <SelectValue placeholder="Select visa type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISA_TYPES.map(v => (
                              <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="passportNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passport Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your passport number" 
                          data-testid="input-passport-number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="destinationCountry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-destination">
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POPULAR_COUNTRIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="purposeOfVisit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose of Visit</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of your visit in detail..."
                          className="min-h-[80px]"
                          data-testid="textarea-purpose"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="intendedEntryDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-entry-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="intendedExitDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exit Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-exit-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Passport Upload */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Passport (PDF)</p>
                    {passportFile ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-green-500/5 border-green-500/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{passportFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(passportFile.size / 1024).toFixed(1)} KB · PDF</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setPassportFile(null)}
                          data-testid="button-remove-passport"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          ref={passportInputRef}
                          onChange={e => setPassportFile(e.target.files?.[0] ?? null)}
                          data-testid="input-passport-pdf"
                        />
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-muted hover:border-primary/40 hover:bg-muted/30 transition-all">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Click to select passport PDF</p>
                            <p className="text-xs text-muted-foreground/60">PDF only · biodata page</p>
                          </div>
                          <Upload className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Passport Photo Upload */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Passport-Size Photo (JPG)</p>
                    {passportPhotoFile ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-green-500/5 border-green-500/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{passportPhotoFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(passportPhotoFile.size / 1024).toFixed(1)} KB · JPG</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setPassportPhotoFile(null)}
                          data-testid="button-remove-passport-photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          ref={passportPhotoInputRef}
                          onChange={e => setPassportPhotoFile(e.target.files?.[0] ?? null)}
                          data-testid="input-passport-photo"
                        />
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-muted hover:border-primary/40 hover:bg-muted/30 transition-all">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Click to select passport photo</p>
                            <p className="text-xs text-muted-foreground/60">JPG, PNG or WEBP · white background · 35×45mm</p>
                          </div>
                          <Upload className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Bank Statement Upload */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Bank Statement (PDF)</p>
                    {bankFile ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-green-500/5 border-green-500/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{bankFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(bankFile.size / 1024).toFixed(1)} KB · PDF</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setBankFile(null)}
                          data-testid="button-remove-bank"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          ref={bankInputRef}
                          onChange={e => setBankFile(e.target.files?.[0] ?? null)}
                          data-testid="input-bank-pdf"
                        />
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-muted hover:border-primary/40 hover:bg-muted/30 transition-all">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Click to select bank statement PDF</p>
                            <p className="text-xs text-muted-foreground/60">PDF only · last 3 months</p>
                          </div>
                          <Upload className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        </div>
                      </label>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={mutation.isPending}
                    data-testid="button-submit-application"
                  >
                    {mutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requirements.length === 0 ? (
                <p className="text-xs text-muted-foreground">Select a visa type to see requirements</p>
              ) : (
                <ul className="space-y-1.5">
                  {requirements.map(r => (
                    <li key={r} className="text-xs flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                AI Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Documents verified by AI within minutes",
                "Risk score calculated automatically",
                "Blockchain record created on approval",
                "Real-time status tracking throughout",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}