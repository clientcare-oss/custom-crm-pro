import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Sparkles, DollarSign, Calendar, Send, FileCheck, CheckCircle2, User, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceId?: number;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedClientId?: number;
}

export function CreateInvoiceModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedClientId,
}: CreateInvoiceModalProps) {
  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: services = [] } = trpc.services.list.useQuery();
  const { data: allProjects = [] } = trpc.projects.list.useQuery();

  const [clientId, setClientId] = useState<number | undefined>(preselectedClientId);
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [serviceDescription, setServiceDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days out
    return d.toISOString().split("T")[0];
  });
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [discountNote, setDiscountNote] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Sync preselected client if passed
  React.useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

  const selectedContact = contacts.find((c) => c.id === clientId);
  const availableStudents = clientId 
    ? allProjects.filter((p: any) => p.clientId === clientId) 
    : allProjects;
  const selectedStudent = allProjects.find((p: any) => p.id === projectId);

  // Line item handlers
  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handlePickService = (index: number, serviceIdStr: string) => {
    const sId = Number(serviceIdStr);
    const service = services.find((s) => s.id === sId);
    if (!service) return;

    const price = typeof service.price === "string" ? parseFloat(service.price) : Number(service.price || 0);

    setLineItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        serviceId: service.id,
        description: service.name + (service.description ? ` — ${service.description}` : ""),
        unitPrice: isNaN(price) ? 0 : price,
      };
      return next;
    });

    if (!title) {
      setTitle(service.name);
    }
    if (!serviceDescription && service.description) {
      setServiceDescription(service.description);
    }
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);
  const discount = parseFloat(discountAmount) || 0;
  const total = Math.max(0, subtotal - discount);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.status === "Sent" 
          ? "Invoice issued and payment email sent to client!" 
          : "Invoice saved as draft"
      );
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create invoice");
    },
  });

  const resetForm = () => {
    if (!preselectedClientId) setClientId(undefined);
    setProjectId(undefined);
    setTitle("");
    setServiceDescription("");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setDiscountAmount("");
    setDiscountNote("");
    setInternalNotes("");
    setClientNotes("");
    setShowPreview(false);
  };

  const handleSubmit = (sendImmediately: boolean) => {
    if (!clientId) {
      toast.error("Please select a family / client account");
      return;
    }

    const validItems = lineItems.filter((i) => i.description.trim() && i.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("Please provide at least one valid line item with a price");
      return;
    }

    createMutation.mutate({
      clientId,
      projectId: projectId || undefined,
      title: title.trim() || undefined,
      serviceDescription: serviceDescription.trim() || undefined,
      status: sendImmediately ? "Sent" : "Draft",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: validItems.map((i) => ({
        description: i.description.trim(),
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice),
        total: (Number(i.quantity) || 1) * Number(i.unitPrice),
        serviceId: i.serviceId,
      })),
      discountAmount: discount > 0 ? discount : undefined,
      discountNote: discountNote.trim() || undefined,
      notes: internalNotes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      clientNotes: clientNotes.trim() || undefined,
      sendEmailImmediately: sendImmediately,
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] border border-[#FFE394]/50 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white rounded-2xl p-6 sm:p-8">
        
        {/* Top Specular Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

        <DialogHeader className="border-b border-[#DFBE77]/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl p-[1.5px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#9E7D3B] shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#142642] to-[#051124] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                <DollarSign className="w-5 h-5 text-[#FAD77B]" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                Create One-Time Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-[#C6B697] mt-0.5">
                Issue a custom advocacy invoice or package to a family account with Stripe checkout.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          
          {/* 1. Client, Student & Due Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Family / Client Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Family / Client Account *
              </label>
              <select
                value={clientId || ""}
                onChange={(e) => {
                  const newClientId = Number(e.target.value) || undefined;
                  setClientId(newClientId);
                  setProjectId(undefined);
                }}
                disabled={!!preselectedClientId}
                className="w-full bg-[#020A17]/90 border border-[#DFBE77]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#FFE394] focus:ring-1 focus:ring-[#FFE394]/50"
              >
                <option value="" disabled className="bg-[#07162B] text-slate-400">
                  Select family account...
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#07162B] text-white">
                    {c.name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
              {selectedContact?.email && (
                <p className="text-[11px] text-[#A69371] font-mono pl-1">
                  Recipient: <span className="text-[#FFF4D4]">{selectedContact.email}</span>
                </p>
              )}
            </div>

            {/* Student (Optional, for reference only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Student (Optional)
              </label>
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(Number(e.target.value) || undefined)}
                className="w-full bg-[#020A17]/90 border border-[#DFBE77]/40 rounded-xl px-3.5 py-2.5 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#FFE394] focus:ring-1 focus:ring-[#FFE394]/50"
              >
                <option value="">-- None / General Account --</option>
                {availableStudents.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-[#07162B] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#A69371] font-mono pl-1">
                For student case reference only
              </p>
            </div>

            {/* Payment Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Payment Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[#020A17]/90 border border-[#DFBE77]/40 rounded-xl text-sm text-[#FFF4D4] focus:border-[#FFE394]"
              />
            </div>
          </div>

          {/* 1b. Invoice Title & Service Description */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold block">
                Invoice Title *
              </label>
              <Input
                placeholder="e.g. State Complaint Preparation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#020A17]/90 border border-[#DFBE77]/40 rounded-xl text-sm text-[#FFF4D4] focus:border-[#FFE394]"
              />
            </div>
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold block">
                Description of Service (Client-Facing)
              </label>
              <Input
                placeholder="e.g. Formal Georgia DOE complaint drafting, exhibits index, and filing"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="bg-[#020A17]/90 border border-[#DFBE77]/40 rounded-xl text-sm text-[#FFF4D4] focus:border-[#FFE394]"
              />
            </div>
          </div>

          {/* 2. Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Line Items, Quantity &amp; Price *
              </label>
              <Button
                type="button"
                onClick={handleAddLineItem}
                size="sm"
                variant="outline"
                className="text-xs h-7 border border-[#DFBE77]/50 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Line Item
              </Button>
            </div>

            <div className="space-y-3 bg-[#020A17]/60 p-4 rounded-xl border border-[#DFBE77]/30">
              {lineItems.map((item, idx) => (
                <div key={idx} className="space-y-2 p-3 bg-[#07162B]/80 rounded-lg border border-[#DFBE77]/25 relative">
                  
                  {/* Service Catalog Picker Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#A69371] shrink-0">Preset:</span>
                    <select
                      value={item.serviceId || ""}
                      onChange={(e) => handlePickService(idx, e.target.value)}
                      className="text-xs bg-[#030D1A] border border-[#DFBE77]/30 rounded-lg px-2 py-1 text-[#FFF4D4] flex-1"
                    >
                      <option value="">-- Choose from Services Catalog (Optional) --</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (${Number(s.price || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>

                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950/40 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Item Description, Quantity, Unit Price */}
                  <div className="grid grid-cols-12 gap-2 pt-1">
                    <div className="col-span-12 sm:col-span-7">
                      <Input
                        placeholder="Service line item description..."
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="bg-[#020A17]/90 border border-[#DFBE77]/30 text-xs text-[#FFF4D4] h-8"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <div className="flex items-center">
                        <span className="text-[10px] text-[#A69371] mr-1">Qty:</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="bg-[#020A17]/90 border border-[#DFBE77]/30 text-xs text-[#FFF4D4] h-8"
                        />
                      </div>
                    </div>
                    <div className="col-span-7 sm:col-span-3">
                      <div className="flex items-center">
                        <span className="text-[10px] text-[#A69371] mr-1">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPrice || ""}
                          onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="bg-[#020A17]/90 border border-[#DFBE77]/30 text-xs text-[#FFF4D4] h-8 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Discount & Total Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Discount Section */}
            <div className="p-3.5 rounded-xl bg-[#020A17]/70 border border-[#DFBE77]/30 space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] font-bold block">
                Discount or Credit ($)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="bg-[#07162B] border border-[#DFBE77]/30 text-xs text-[#FFF4D4] h-8 font-mono w-28"
                />
                <Input
                  placeholder="Reason (e.g. Sibling discount, grant)"
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  className="bg-[#07162B] border border-[#DFBE77]/30 text-xs text-[#FFF4D4] h-8 flex-1"
                />
              </div>
            </div>

            {/* Total Summary Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#14233D] to-[#040A15] border border-[#FFE394]/40 shadow-inner flex flex-col justify-center space-y-1 text-right">
              <div className="flex justify-between text-xs text-[#C6B697]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#FFF4D4]">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-[#DFBE77]/30 pt-1 text-[#FFE394]">
                <span className="font-serif">Invoice Total:</span>
                <span className="font-mono text-base text-[#FFF4D4]">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 4. Notes: Client-Facing vs Internal Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-semibold block">
                Client-Facing Notes (Printed on Invoice)
              </label>
              <Textarea
                placeholder="Notes visible to parent (e.g. Includes 3 hours of document preparation)..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                className="bg-[#020A17]/80 border border-[#DFBE77]/25 text-xs text-[#FFF4D4] min-h-[50px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A69371] font-semibold block">
                Internal Advocate Memo (Private)
              </label>
              <Textarea
                placeholder="Internal notes not visible to clients..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="bg-[#020A17]/80 border border-[#DFBE77]/25 text-xs text-[#FFF4D4] min-h-[50px] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DFBE77]/30">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-9 px-3 rounded-xl"
              >
                {showPreview ? "Hide Preview" : "Preview Invoice"}
              </Button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Draft */}
              <Button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => handleSubmit(false)}
                variant="outline"
                className="border border-[#DFBE77]/50 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                Save as Draft
              </Button>

              {/* Send Immediately */}
              <Button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => handleSubmit(true)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-9 px-5 rounded-xl border border-[#FFE394]/70 shadow-md cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{createMutation.isPending ? "Generating..." : "Save & Issue Invoice"}</span>
              </Button>
            </div>
          </div>

          {/* 5. Live Invoice Preview Drawer */}
          {showPreview && (
            <div className="mt-4 p-5 rounded-xl bg-[#010814] border-2 border-[#DFBE77]/50 shadow-2xl text-left space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#DFBE77]/30 pb-3">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#FFF4D4]">
                    {title || "Custom Special Education Advocacy Invoice"}
                  </h3>
                  {serviceDescription && (
                    <p className="text-xs text-[#C6B697] mt-0.5">{serviceDescription}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-[#FAD77B] block font-bold">PREVIEW ONLY</span>
                  <span className="text-[11px] text-[#A69371] font-mono">Due: {dueDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 text-xs text-[#D8C7A5] gap-2">
                <div>
                  <span className="text-[#A69371] uppercase font-mono text-[10px] block">Billed To</span>
                  <strong className="text-white">{selectedContact?.name || "Client Account"}</strong>
                  {selectedContact?.email && <div className="text-[#A69371]">{selectedContact.email}</div>}
                </div>
                {selectedStudent && (
                  <div>
                    <span className="text-[#A69371] uppercase font-mono text-[10px] block">Student Reference</span>
                    <strong className="text-white">{selectedStudent.name}</strong>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border border-[#DFBE77]/20 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#05142B] text-[#DFBE77] font-mono">
                    <tr>
                      <th className="text-left p-2">Item Description</th>
                      <th className="text-center p-2 w-16">Qty</th>
                      <th className="text-right p-2 w-24">Price</th>
                      <th className="text-right p-2 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFBE77]/10">
                    {lineItems.map((li, i) => (
                      <tr key={i} className="text-white/90">
                        <td className="p-2">{li.description || "Advocacy Item"}</td>
                        <td className="p-2 text-center font-mono">{li.quantity}</td>
                        <td className="p-2 text-right font-mono">${Number(li.unitPrice).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">${(Number(li.quantity) * Number(li.unitPrice)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right space-y-1 text-xs">
                <div className="text-[#A69371]">Subtotal: <span className="font-mono text-white">${subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="text-emerald-400">Discount: <span className="font-mono">-${discount.toFixed(2)}</span></div>}
                <div className="text-base font-bold text-[#FFE394] pt-1">
                  Amount Due: <span className="font-mono text-[#FFF4D4]">${total.toFixed(2)}</span>
                </div>
              </div>

              {clientNotes && (
                <div className="text-xs p-2.5 rounded bg-[#031124] border border-[#DFBE77]/20 text-[#D8C7A5]">
                  <span className="font-mono text-[10px] uppercase text-[#C5A059] block font-bold mb-1">Notes to Client:</span>
                  {clientNotes}
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
