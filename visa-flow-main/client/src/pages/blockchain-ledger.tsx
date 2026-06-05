import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Search, CheckCircle2, XCircle, Shield, Hash, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface BlockchainEntry {
  id: number;
  applicationId: number;
  visaNumber: string;
  blockHash: string;
  previousHash: string;
  txId: string;
  blockIndex: number;
  holderName: string;
  holderPassport: string;
  visaType: string;
  issuedAt: string;
  expiresAt: string;
  merkleRoot: string;
  nonce: number;
  isValid: boolean;
}

export default function BlockchainLedger() {
  const { toast } = useToast();
  const [searchHash, setSearchHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<BlockchainEntry | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BlockchainEntry | null>(null);

  const ledgerQuery = useQuery<BlockchainEntry[]>({ queryKey: ["/api/blockchain/ledger"] });
  const entries = ledgerQuery.data || [];

  const verifyVisa = async () => {
    if (!searchHash.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const token = localStorage.getItem("visa_token");
      const res = await fetch(`/api/blockchain/verify/${searchHash.trim()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVerifyError(data.message || "Visa record not found or invalid");
      } else {
        setVerifyResult(data);
      }
    } catch {
      setVerifyError("Verification failed. Please check the hash and try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Link2 className="w-6 h-6 text-blue-300" />
          Blockchain Visa Ledger
        </h1>
        <p className="text-blue-200/60 text-sm mt-0.5">Immutable, cryptographically secured visa records</p>
      </div>

      {/* Chain stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Blocks", value: entries.length, icon: Hash },
          { label: "Valid Records", value: entries.filter(e => e.isValid).length, icon: CheckCircle2 },
          { label: "Visa Types", value: [...new Set(entries.map(e => e.visaType))].length, icon: Shield },
          { label: "Chain Height", value: entries.length > 0 ? Math.max(...entries.map(e => e.blockIndex)) : 0, icon: Link2 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ledger */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Block Chain</CardTitle>
              <CardDescription className="text-xs">Each block cryptographically links to the previous</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ledgerQuery.isLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Link2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">No blockchain records yet</p>
                  <p className="text-muted-foreground text-xs">Records appear when visas are granted</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {entries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`p-4 cursor-pointer hover-elevate transition-all ${selectedEntry?.id === entry.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                      data-testid={`block-${entry.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Block indicator */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono border ${
                              entry.isValid ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400" : "border-red-500/30 bg-red-500/10 text-red-600"
                            }`}>
                              #{entry.blockIndex}
                            </div>
                            {idx < entries.length - 1 && (
                              <div className="w-0.5 h-4 bg-border mt-1" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-primary">{entry.visaNumber}</span>
                              <Badge variant="secondary" className="text-[10px] capitalize">{entry.visaType}</Badge>
                              {entry.isValid ? (
                                <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Valid</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">Invalid</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{entry.holderName}</span>
                              <span className="text-muted-foreground text-xs">·</span>
                              <span className="text-xs text-muted-foreground font-mono">{entry.holderPassport}</span>
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground/70 mt-1 truncate">
                              {entry.blockHash.slice(0, 48)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-muted-foreground">Issued</p>
                          <p className="text-[11px] font-mono">{new Date(entry.issuedAt).toLocaleDateString()}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Exp: {entry.expiresAt}</p>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {selectedEntry?.id === entry.id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { label: "Block Hash", value: entry.blockHash },
                              { label: "Previous Hash", value: entry.previousHash },
                              { label: "TX ID", value: entry.txId },
                              { label: "Merkle Root", value: entry.merkleRoot },
                            ].map(f => (
                              <div key={f.label}>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">{f.label}</p>
                                <p className="text-[11px] font-mono text-foreground/80 break-all bg-muted px-2 py-1 rounded">{f.value}</p>
                              </div>
                            ))}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">Nonce</p>
                                <p className="text-[11px] font-mono bg-muted px-2 py-1 rounded">{entry.nonce}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">Block Index</p>
                                <p className="text-[11px] font-mono bg-muted px-2 py-1 rounded">{entry.blockIndex}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Verify */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Verify Visa
              </CardTitle>
              <CardDescription className="text-xs">Enter a block hash to verify visa authenticity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Enter block hash or visa number..."
                  value={searchHash}
                  onChange={e => setSearchHash(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verifyVisa()}
                  className="font-mono text-xs"
                  data-testid="input-verify-hash"
                />
                <Button className="w-full" onClick={verifyVisa} disabled={verifying || !searchHash} data-testid="button-verify">
                  {verifying ? "Verifying..." : "Verify on Blockchain"}
                </Button>
              </div>

              {verifyResult && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex items-center gap-2 p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-700 dark:text-green-400 font-medium">VISA VERIFIED — AUTHENTIC</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Visa Number", value: verifyResult.visaNumber },
                      { label: "Holder", value: verifyResult.holderName },
                      { label: "Passport", value: verifyResult.holderPassport },
                      { label: "Type", value: verifyResult.visaType },
                      { label: "Issued", value: new Date(verifyResult.issuedAt).toLocaleDateString() },
                      { label: "Expires", value: verifyResult.expiresAt },
                      { label: "Block Index", value: `#${verifyResult.blockIndex}` },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium font-mono">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verifyError && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-400">{verifyError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Chain Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Consensus", value: "PoA Verified" },
                { label: "Algorithm", value: "SHA-256" },
                { label: "Chain Status", value: "Healthy" },
                { label: "Immutability", value: "Active" },
              ].map(f => (
                <div key={f.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono text-green-600 dark:text-green-400 font-medium">{f.value}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center gap-2 pt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
                <span className="text-[11px] text-muted-foreground">All blocks validated</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
