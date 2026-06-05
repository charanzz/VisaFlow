import { useRoute } from "wouter";
import html2pdf from "html2pdf.js";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";


interface VisaVerificationData {
  visaNumber: string;
  applicationId: number;
  fullName: string;
  passportNumber: string;
  visaType: string;
  destinationCountry: string;
  grantedAt: string | null;
  expiryDate: string | null;
  status: string;
  isValid: boolean;
  message: string;
}

export default function VisaVerification() {
  const [, params] = useRoute("/verify/:visaNumber");
  const visaNumber = params?.visaNumber;

  const verificationQuery = useQuery<VisaVerificationData>({
    queryKey: [`/api/visa/verify/${visaNumber}`],
    enabled: !!visaNumber,
  });

  const data = verificationQuery.data;
  const isLoading = verificationQuery.isLoading;
  const error = verificationQuery.error;

  if (!visaNumber) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-60" />
          <p className="text-lg font-semibold text-muted-foreground">Visa number not provided</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-60" />
          <p className="text-lg font-semibold text-muted-foreground">Visa not found or invalid</p>
          <p className="text-sm text-muted-foreground mt-2">The visa number provided does not exist or is no longer valid.</p>
        </div>
      </div>
    );
  }

  const isExpired = data.expiryDate ? new Date(data.expiryDate) < new Date() : false;
  const statusColor = data.isValid && !isExpired ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Visa Verification</h1>
            {data.isValid && !isExpired && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Expired
              </Badge>
            )}
            {!data.isValid && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Invalid
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{data.message}</p>
        </div>
      </div>

      {/* Verification Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${statusColor}`} />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className={`text-lg font-bold text-center ${statusColor}`}>
                {data.isValid && !isExpired ? "✓ Valid Visa" : "✗ Invalid or Expired"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase">Visa Number</p>
                <p className="text-sm font-mono font-semibold break-all">{data.visaNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase">Application ID</p>
                <p className="text-sm font-semibold">#{data.applicationId}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applicant Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Applicant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { label: "Full Name", value: data.fullName },
            { label: "Passport Number", value: data.passportNumber },
            { label: "Visa Type", value: data.visaType.charAt(0).toUpperCase() + data.visaType.slice(1) },
            { label: "Destination Country", value: data.destinationCountry },
          ].map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-right">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Visa Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Visa Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { label: "Issue Date", value: data.grantedAt ? new Date(data.grantedAt).toLocaleDateString() : "N/A" },
            { label: "Expiry Date", value: data.expiryDate || "N/A" },
            {
              label: "Status",
              value: isExpired ? "Expired" : data.isValid ? "Valid" : "Invalid",
            },
          ].map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-medium text-right ${item.label === "Status" && isExpired ? "text-destructive" : item.label === "Status" && !data.isValid ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                {item.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="p-4">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
            <strong>Security Notice:</strong> This verification page confirms the authenticity of the visa document. Do not share your visa details with unauthorized parties. Always verify through official immigration authority channels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
