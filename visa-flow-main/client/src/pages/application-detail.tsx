import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle, Shield, Link2, FileText,
  Cpu, Upload, RefreshCw, QrCode, Zap, ChevronRight, Download,
} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface Application {
  id: number;
  userId: number;
  applicationType: string;
  visaType: string;
  destinationCountry: string;
  purposeOfVisit: string;
  status: string;
  currentStage: number;
  riskScore: number | null;
  riskLevel: string | null;
  aiAnalysisSummary: string | null;
  blockchainHash: string | null;
  blockchainTxId: string | null;
  qrCodeData: string | null;
  visaNumber: string | null;
  grantedAt: string | null;
  expiryDate: string | null;
  denialReason: string | null;
  intendedEntryDate: string | null;
  intendedExitDate: string | null;
  createdAt: string;
}

interface TimelineEntry {
  id: number;
  stage: number;
  stageName: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
}

interface Document {
  id: number;
  documentType: string;
  fileName: string;
  verified: boolean;
  aiConfidenceScore: number | null;
  aiVerificationNotes: string | null;
  extractedData: Record<string, any> | null;
  uploadedAt: string;
}

const STAGE_ICONS = [FileText, Cpu, Shield, AlertCircle, Link2, CheckCircle2];
const STAGE_COLORS = {
  completed: "text-green-500",
  in_progress: "text-primary",
  pending: "text-muted-foreground",
  failed: "text-destructive",
};

const DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "photo", label: "Passport Photo" },
  { value: "financial", label: "Financial Documents" },
  { value: "invitation", label: "Invitation Letter" },
  { value: "itinerary", label: "Travel Itinerary" },
  { value: "insurance", label: "Travel Insurance" },
];

export default function ApplicationDetail() {
  const [, params] = useRoute("/applications/:id");
  const appId = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfficer = user?.role === "officer" || user?.role === "admin";
  const [selectedDocType, setSelectedDocType] = useState("passport");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [verifyingDocs, setVerifyingDocs] = useState<Set<number>>(new Set());

  const verifyMutation = useMutation({
    mutationFn: async ({ docId, docType, fileName }: { docId: number; docType: string; fileName: string }) => {
      const res = await apiRequest("POST", `/api/documents/${docId}/verify`, { documentType: docType, fileName });
      if (!res.ok) throw new Error("Verification failed");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      // In a real app, we'd upload to S3/Storage first.
      // For this demo, we'll simulate the upload and store metadata.
      const res = await apiRequest("POST", `/api/applications/${appId}/documents`, {
        documentType: type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      return res.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/documents`] });
      toast({ title: "Upload Successful", description: "Document has been uploaded and is being verified." });
      // Trigger AI verification immediately after upload
      verifyDocument(doc.id, doc.documentType, doc.fileName);
    },
  });

  const handleFileChange = async (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      await uploadMutation.mutateAsync({ type, file });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload document.", variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const appQuery = useQuery<Application>({
    queryKey: [`/api/applications/${appId}`],
    refetchInterval: 5000,
  });

  const timelineQuery = useQuery<TimelineEntry[]>({
    queryKey: [`/api/applications/${appId}/timeline`],
    refetchInterval: 5000,
  });

  const docsQuery = useQuery<Document[]>({
    queryKey: [`/api/applications/${appId}/documents`],
  });

  const riskMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/applications/${appId}/risk-score`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}`] });
      toast({ title: "Risk Assessment Complete", description: "AI analysis has been completed." });
    },
    onError: () => toast({ title: "Error", description: "Risk assessment failed.", variant: "destructive" }),
  });

  const blockchainMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/applications/${appId}/blockchain/issue`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/timeline`] });
      toast({ title: "Visa Granted!", description: "Blockchain record created successfully." });
    },
    onError: () => toast({ title: "Error", description: "Blockchain issuance failed.", variant: "destructive" }),
  });

  const advanceMutation = useMutation({
    mutationFn: async (stage: number) => {
      const res = await apiRequest("POST", `/api/applications/${appId}/advance`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/timeline`] });
    },
  });

  const uploadDocument = async () => {
    setUploadingDoc(true);
    try {
      const fakeFileName = `${selectedDocType}_${Date.now()}.pdf`;
      const res = await apiRequest("POST", `/api/applications/${appId}/documents`, {
        documentType: selectedDocType,
        fileName: fakeFileName,
        fileSize: Math.floor(Math.random() * 2000000) + 500000,
        mimeType: "application/pdf",
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/documents`] });
      toast({ title: "Document Uploaded", description: `${fakeFileName} uploaded successfully.` });
    } catch {
      toast({ title: "Error", description: "Upload failed.", variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const verifyDocument = async (docId: number, docType: string, fileName: string) => {
    setVerifyingDocs(prev => new Set(prev).add(docId));
    try {
      await verifyMutation.mutateAsync({ docId, docType, fileName });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${appId}/documents`] });
      toast({ title: "Verification Complete", description: "AI verification finished successfully." });
    } catch (error) {
      toast({ title: "Verification Failed", description: "Could not complete AI verification.", variant: "destructive" });
    } finally {
      setVerifyingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
    }
  };

  const downloadVisa = async (applicationId: number) => {
    try {
      const response = await fetch(`/api/visa/${applicationId}/download`);
      if (!response.ok) {
        const error = await response.json();
        toast({ title: "Download Failed", description: error.message || "Could not download visa", variant: "destructive" });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visa_${appQuery.data?.visaNumber || applicationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Download Successful", description: "Your visa PDF has been downloaded." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download visa", variant: "destructive" });
    }
  };

  const QRCodeComponent = ({ value, size }: { value: string; size: number }) => (
    <QRCodeSVG value={value} size={size} level="H" includeMargin={true} />
  );

  const app = appQuery.data;
  const timeline = timelineQuery.data || [];
  const docs = docsQuery.data || [];

  const isGranted = app?.status === "granted";
  const isDenied = app?.status === "denied";

  if (appQuery.isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!app) return <div className="p-6 text-center text-muted-foreground">Application not found.</div>;

  const riskColor = app.riskLevel === "high" ? "text-red-500" : app.riskLevel === "medium" ? "text-yellow-500" : "text-green-500";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold capitalize">{app.visaType} Visa — {app.destinationCountry}</h1>
            {isGranted && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Granted</Badge>}
            {isDenied && <Badge variant="destructive">Denied</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Application #{app.id} • {app.applicationType === "renewal" ? "Renewal" : "New Application"} • Submitted {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
        {app.visaNumber && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground font-mono">Visa No.</p>
            <p className="text-sm font-bold font-mono text-primary">{app.visaNumber}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  AI Risk Assessment
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => riskMutation.mutate()}
                  disabled={riskMutation.isPending}
                  data-testid="button-run-risk"
                >
                  {riskMutation.isPending ? "Analyzing..." : "Run Analysis"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {app.riskScore !== null ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="16" fill="none"
                          stroke={app.riskLevel === "high" ? "#ef4444" : app.riskLevel === "medium" ? "#eab308" : "#22c55e"}
                          strokeWidth="3"
                          strokeDasharray={`${app.riskScore} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${riskColor}`}>{Math.round(app.riskScore)}</span>
                      </div>
                    </div>
                    <div>
                      <p className={`text-lg font-bold capitalize ${riskColor}`}>
                        {app.riskLevel} Risk
                      </p>
                      <p className="text-xs text-muted-foreground">Score out of 100</p>
                    </div>
                  </div>
                  {app.aiAnalysisSummary && (
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground leading-relaxed">{app.aiAnalysisSummary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Click "Run Analysis" to generate AI risk score</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { id: "passport", label: "Passport", desc: "Main biodata page" },
                  { id: "photo", label: "Photo", desc: "Digital passport photo" },
                  { id: "financial", label: "Financial Proof", desc: "Bank statements" }
                ].map((type) => {
                  const existingDoc = docs.find(d => d.documentType === type.id);
                  return (
                    <div key={type.id} className="p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary/50 transition-colors bg-muted/30">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                          <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm font-semibold">{type.label}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">{type.desc}</p>
                        
                        {existingDoc ? (
                          <div className="w-full space-y-2">
                            <Badge variant="outline" className="w-full justify-center bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">AI Status:</span>
                              {existingDoc.verified ? (
                                <span className="text-green-600 font-medium">Verified</span>
                              ) : (
                                <span className="text-yellow-600 font-medium">Verifying...</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <label className="cursor-pointer block">
                              <input
                                type="file"
                                className="hidden"
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileChange(type.id, e)}
                                disabled={uploadingDoc}
                              />
                              <Button variant="outline" size="sm" className="w-full text-[10px]" disabled={uploadingDoc}>
                                {uploadingDoc ? "Uploading..." : "Select File"}
                              </Button>
                            </label>
                            <Badge variant="secondary" className="mt-2 w-full justify-center text-[10px] opacity-50">Pending</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  All Documents ({docs.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-input rounded-md px-2 py-1 bg-[#ffffff]"
                    value={selectedDocType}
                    onChange={e => setSelectedDocType(e.target.value)}
                    data-testid="select-doc-type"
                  >
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={uploadDocument} disabled={uploadingDoc} data-testid="button-upload-doc">
                    <Upload className="w-3 h-3 mr-1" />
                    {uploadingDoc ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
              
              {docs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => {
                    const isVerifying = verifyingDocs.has(doc.id);
                    return (
                      <div key={doc.id} className="flex items-start justify-between p-3 rounded-md border gap-3" data-testid={`doc-${doc.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{doc.fileName}</span>
                            {isVerifying ? (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                                AI Verification Running...
                              </Badge>
                            ) : doc.verified ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px]">
                                ✓ Verified {doc.aiConfidenceScore ? `${Math.round(doc.aiConfidenceScore * 100)}%` : ""}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Pending Verification</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                          {doc.aiVerificationNotes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{doc.aiVerificationNotes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Application Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Application Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Type", value: app.applicationType === "renewal" ? "Renewal" : "New Application" },
                { label: "Visa Category", value: app.visaType.charAt(0).toUpperCase() + app.visaType.slice(1) },
                { label: "Destination", value: app.destinationCountry },
                { label: "Entry Date", value: app.intendedEntryDate || "—" },
                { label: "Exit Date", value: app.intendedExitDate || "—" },
                ...(app.expiryDate ? [{ label: "Visa Expiry", value: app.expiryDate }] : []),
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right">{item.value}</span>
                </div>
              ))}
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Purpose</span>
                <p className="mt-1 text-xs">{app.purposeOfVisit}</p>
              </div>
            </CardContent>
          </Card>

          {/* Digital Visa Access Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Digital Visa Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGranted ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Your visa document is ready for download.</p>
                  </div>
                  <div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Visa Approved</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => downloadVisa(app.id)}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Visa PDF
                  </Button>
                  {app.visaNumber && (
                    <div className="mt-3 p-3 rounded-md bg-muted flex flex-col items-center justify-center">
                      <div className="text-center">
                        <QRCodeComponent value={`${window.location.origin}/verify/${app.visaNumber}`} size={120} />
                        <p className="text-[10px] text-muted-foreground mt-2">Scan to verify visa authenticity</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : isDenied ? (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-muted-foreground">Application denied</p>
                  {app.denialReason && <p className="text-xs text-destructive mt-1">{app.denialReason}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Your visa document will be available here after approval.</p>
                  </div>
                  <div>
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">Pending Approval</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    disabled={true}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Visa PDF
                  </Button>
                  <div className="mt-3 p-3 rounded-md bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">QR Code</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Available after approval</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
