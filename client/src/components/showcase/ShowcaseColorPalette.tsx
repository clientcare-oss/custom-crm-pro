import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ShowcaseColorPalette() {
  const colors = [
    { name: "Primary / Amber", bg: "bg-amber-400", text: "text-slate-950", hex: "#FBBF24" },
    { name: "Accent / Gold", bg: "bg-amber-500", text: "text-slate-950", hex: "#F59E0B" },
    { name: "Navy Surface", bg: "bg-[#0A1628]", text: "text-white", hex: "#0A1628" },
    { name: "Navy Background", bg: "bg-[#040C16]", text: "text-white", hex: "#040C16" },
    { name: "Emerald Success", bg: "bg-emerald-500", text: "text-white", hex: "#10B981" },
    { name: "Rose Escalation", bg: "bg-rose-500", text: "text-white", hex: "#F43F5E" },
    { name: "Blue Info", bg: "bg-blue-500", text: "text-white", hex: "#3B82F6" },
  ];

  return (
    <Card className="border-slate-800 bg-[#0A1628]/90 text-slate-100 p-5 space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="text-base font-bold text-white uppercase tracking-wider">
          Brand Color Palette & Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {colors.map((c) => (
          <div key={c.name} className="rounded-lg border border-slate-800 overflow-hidden bg-[#071220] p-3 space-y-2">
            <div className={`h-12 rounded ${c.bg} flex items-center justify-center font-bold text-xs ${c.text}`}>
              {c.hex}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{c.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{c.hex}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
