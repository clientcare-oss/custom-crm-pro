import React from "react";
import { DollarSign, FileText, Plus, ExternalLink, ScrollText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InvoiceItem {
  id: number;
  number?: string;
  totalAmount?: number | string;
  status: string;
  createdAt: string | Date;
}

interface ContractItem {
  id: number;
  title: string;
  status: string;
  createdAt: string | Date;
}

interface ContactFinancialsTabProps {
  invoices?: InvoiceItem[];
  contracts?: ContractItem[];
  onCreateInvoice?: () => void;
  onCreateContract?: () => void;
}

export default function ContactFinancialsTab({
  invoices = [],
  contracts = [],
  onCreateInvoice,
  onCreateContract,
}: ContactFinancialsTabProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "executed":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "sent":
      case "pending":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoices Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Invoices & Billing</h3>
          </div>
          <Button onClick={onCreateInvoice} size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center p-6 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No invoices generated for this contact yet.
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id} className="border-slate-800 bg-[#0A1628]/90 text-slate-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Invoice #{inv.number || inv.id}</p>
                    <p className="text-[10px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white">${inv.totalAmount || "0.00"}</span>
                  <Badge className={`text-[10px] font-bold ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contracts Section */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Contracts & Proposals</h3>
          </div>
          <Button onClick={onCreateContract} size="sm" variant="outline" className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Contract
          </Button>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center p-6 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No contracts associated with this contact yet.
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <Card key={contract.id} className="border-slate-800 bg-[#0A1628]/90 text-slate-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ScrollText className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-white">{contract.title}</p>
                    <p className="text-[10px] text-slate-400">{new Date(contract.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge className={`text-[10px] font-bold ${getStatusColor(contract.status)}`}>{contract.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
