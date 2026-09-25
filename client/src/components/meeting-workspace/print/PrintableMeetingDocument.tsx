import React from "react";
import type { MeetingTarget } from "../types";

export interface PrintableMeetingDocumentProps {
  mode: "PARENT_BLUEPRINT" | "ADVOCATE_STRATEGY";
  studentName: string;
  meetingType: string;
  meetingDate: string;
  targets: MeetingTarget[];
}

export function PrintableMeetingDocument({
  mode,
  studentName,
  meetingType,
  meetingDate,
  targets,
}: PrintableMeetingDocumentProps) {
  const isParent = mode === "PARENT_BLUEPRINT";

  return (
    <div className="printable-doc-root font-sans text-slate-900 bg-white p-8 max-w-4xl mx-auto text-[13px] leading-relaxed">
      {/* Document Masthead */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">
              Waypoint Advocates
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {isParent ? "MEETING BLUEPRINT" : "ADVOCATE STRATEGY & MEETING EXECUTION BRIEF"}
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              {isParent
                ? "Family & Student Meeting Guide — Strategic Priorities & Plain Language Requests"
                : "Confidential Internal Advocacy Workplan — One Request, One IEP Location, One Team Decision"}
            </div>
          </div>
          <div className="text-right text-xs text-slate-600 font-medium">
            <div><strong className="text-slate-900">Student:</strong> {studentName}</div>
            <div><strong className="text-slate-900">Meeting:</strong> {meetingType}</div>
            <div><strong className="text-slate-900">Date:</strong> {meetingDate}</div>
          </div>
        </div>
      </div>

      {/* Intro Box (Parent only) */}
      {isParent && (
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs text-slate-700">
          <p className="font-bold text-slate-900 mb-0.5">How to use this guide:</p>
          This document outlines the priorities and requests prepared for {studentName}'s meeting. Each item clearly states what we are asking for, why it matters for your student, and the supporting evidence.
        </div>
      )}

      {/* Target Items List — Natural Flow, Multi-Target per Page */}
      <div className="space-y-6">
        {targets.map((target, idx) => {
          const number = idx + 1;
          const targetTitle = target.targetName || `Target #${number}`;
          
          if (isParent) {
            const whatWeWant = target.parentWhatWeWant || target.quickAdvocateSayThis || targetTitle;
            const whyWeWantIt = target.parentWhyWeWantIt || target.whyWeWantIt || "To support student access and meaningful educational progress.";
            const evidence = target.parentSupportingEvidence || target.supportingEvidence || "Observations, progress reports, and educational records.";

            return (
              <div
                key={target.id}
                className="target-print-item border-b border-slate-200 pb-5"
                style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
              >
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {number}. {targetTitle}
                  </h2>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {target.iepSection || "Accommodations"}
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  <div>
                    <div className="text-[10px] font-black tracking-wider uppercase text-emerald-800">
                      WHAT WE WANT
                    </div>
                    <div className="text-slate-900 font-semibold mt-0.5 text-xs">
                      {whatWeWant}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[10px] font-black tracking-wider uppercase text-amber-800">
                        WHY WE WANT IT
                      </div>
                      <div className="text-slate-700 mt-0.5 text-xs">
                        {whyWeWantIt}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black tracking-wider uppercase text-blue-800">
                        WHAT SUPPORTS IT
                      </div>
                      <div className="text-slate-700 mt-0.5 text-xs">
                        {evidence}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Advocate Strategy Brief (Internal Workplan)
          return (
            <div
              key={target.id}
              className="target-print-item border-b border-slate-300 pb-5"
              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
            >
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {number}. {targetTitle}
                  </h2>
                  {target.externalTargetId && (
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                      {target.externalTargetId}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {target.iepSection || "Accommodations"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 🗣️ ADVOCATE SAY THIS */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded p-2">
                  <div className="text-[10px] font-black tracking-wider uppercase text-amber-900">
                    🗣️ ADVOCATE SAY THIS
                  </div>
                  <div className="text-slate-900 font-bold mt-0.5">
                    {target.quickAdvocateSayThis || target.targetName}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* ✍️ PUT IT HERE */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-2">
                    <div className="text-[10px] font-black tracking-wider uppercase text-slate-700">
                      ✍️ PUT IT HERE
                    </div>
                    <div className="text-slate-800 font-medium mt-0.5">
                      {target.putItHereLocation || "Classroom Accommodations / Supports"}
                    </div>
                  </div>

                  {/* 📝 POSSIBLE IEP WORDING */}
                  {target.possibleIepWording && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-2">
                      <div className="text-[10px] font-black tracking-wider uppercase text-slate-700">
                        📝 POSSIBLE IEP WORDING
                      </div>
                      <div className="text-slate-800 font-mono text-[11px] mt-0.5">
                        {target.possibleIepWording}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* 💡 WHY WE WANT IT */}
                  <div>
                    <div className="text-[10px] font-black tracking-wider uppercase text-slate-600">
                      💡 WHY WE WANT IT
                    </div>
                    <div className="text-slate-800 mt-0.5">
                      {target.whyWeWantIt || "To ensure meaningful access and progress."}
                    </div>
                  </div>

                  {/* 📊 EVIDENCE & SOURCES */}
                  <div>
                    <div className="text-[10px] font-black tracking-wider uppercase text-slate-600">
                      📊 EVIDENCE & SOURCES
                    </div>
                    <div className="text-slate-800 mt-0.5">
                      {target.supportingEvidence || "Evaluations and progress data."}
                      {target.sources && target.sources.length > 0 && (
                        <div className="text-[10.5px] text-slate-500 mt-0.5 font-medium">
                          Sources: {target.sources.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🛡️ IF THE TEAM DISAGREES */}
                {target.ifTeamDisagrees && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded p-2">
                    <div className="text-[10px] font-black tracking-wider uppercase text-rose-900">
                      🛡️ IF THE TEAM DISAGREES
                    </div>
                    <div className="text-rose-950 font-medium mt-0.5">
                      {target.ifTeamDisagrees}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-300 mt-8 pt-4 text-center text-[10.5px] text-slate-500">
        Waypoint Advocates · Owned IEP Advocacy System · {studentName} ({meetingDate})
      </div>
    </div>
  );
}

export function openPrintDialog(
  mode: "PARENT_BLUEPRINT" | "ADVOCATE_STRATEGY",
  studentName: string,
  meetingType: string,
  meetingDate: string,
  targets: MeetingTarget[]
) {
  const isParent = mode === "PARENT_BLUEPRINT";
  const title = isParent
    ? `${studentName} - Meeting Blueprint`
    : `${studentName} - Advocate Strategy Brief`;

  const targetsHtml = targets
    .map((target, idx) => {
      const number = idx + 1;
      const targetTitle = target.targetName || `Target #${number}`;
      const iepSection = target.iepSection || "Accommodations / Supports";

      if (isParent) {
        const whatWeWant = target.parentWhatWeWant || target.quickAdvocateSayThis || targetTitle;
        const whyWeWantIt = target.parentWhyWeWantIt || target.whyWeWantIt || "To support student access and meaningful educational progress.";
        const evidence = target.parentSupportingEvidence || target.supportingEvidence || "Observations, progress reports, and educational records.";

        return `
          <div class="target-item">
            <div class="target-header">
              <span class="target-title">${number}. ${escapeHtml(targetTitle)}</span>
              <span class="target-section">${escapeHtml(iepSection)}</span>
            </div>
            <div class="field-box field-what">
              <div class="field-label label-what">WHAT WE WANT</div>
              <div class="field-content-bold">${escapeHtml(whatWeWant)}</div>
            </div>
            <div class="two-col">
              <div class="col">
                <div class="field-label label-why">WHY WE WANT IT</div>
                <div class="field-content">${escapeHtml(whyWeWantIt)}</div>
              </div>
              <div class="col">
                <div class="field-label label-evidence">WHAT SUPPORTS IT</div>
                <div class="field-content">${escapeHtml(evidence)}</div>
              </div>
            </div>
          </div>
        `;
      }

      // Advocate Strategy
      const advocateSayThis = target.quickAdvocateSayThis || targetTitle;
      const putItHere = target.putItHereLocation || "Classroom Accommodations";
      const possibleWording = target.possibleIepWording ? `<div class="field-box"><div class="field-label">POSSIBLE IEP WORDING</div><div class="field-content-code">${escapeHtml(target.possibleIepWording)}</div></div>` : "";
      const why = target.whyWeWantIt || "To ensure meaningful access and progress.";
      const evidence = target.supportingEvidence || "Evaluations and progress data.";
      const sources = target.sources && target.sources.length > 0 ? `<div class="sources-text">Sources: ${escapeHtml(target.sources.join(", "))}</div>` : "";
      const ifDisagree = target.ifTeamDisagrees ? `<div class="field-box field-disagree"><div class="field-label label-disagree">IF THE TEAM DISAGREES</div><div class="field-content-disagree">${escapeHtml(target.ifTeamDisagrees)}</div></div>` : "";

      return `
        <div class="target-item">
          <div class="target-header">
            <span class="target-title">${number}. ${escapeHtml(targetTitle)} ${target.externalTargetId ? `<span class="target-id">${escapeHtml(target.externalTargetId)}</span>` : ""}</span>
            <span class="target-section">${escapeHtml(iepSection)}</span>
          </div>
          <div class="field-box field-saythis">
            <div class="field-label label-saythis">🗣️ ADVOCATE SAY THIS</div>
            <div class="field-content-bold">${escapeHtml(advocateSayThis)}</div>
          </div>
          <div class="two-col">
            <div class="col">
              <div class="field-label">✍️ PUT IT HERE</div>
              <div class="field-content">${escapeHtml(putItHere)}</div>
            </div>
            <div class="col">
              <div class="field-label">💡 WHY WE WANT IT</div>
              <div class="field-content">${escapeHtml(why)}</div>
            </div>
          </div>
          ${possibleWording}
          <div class="field-box">
            <div class="field-label">📊 EVIDENCE & SOURCES</div>
            <div class="field-content">${escapeHtml(evidence)} ${sources}</div>
          </div>
          ${ifDisagree}
        </div>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 0.65in 0.65in 0.65in 0.65in;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11.5pt;
          line-height: 1.45;
        }
        .header {
          border-bottom: 2pt solid #0f172a;
          padding-bottom: 8pt;
          margin-bottom: 12pt;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .org {
          font-size: 8.5pt;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #475569;
        }
        .doc-title {
          font-size: 16pt;
          font-weight: 900;
          color: #0f172a;
          margin: 2pt 0;
          letter-spacing: -0.02em;
        }
        .doc-subtitle {
          font-size: 9pt;
          color: #64748b;
        }
        .meta {
          text-align: right;
          font-size: 9.5pt;
          color: #334155;
          line-height: 1.35;
        }
        .intro-box {
          background: #f8fafc;
          border: 1pt solid #cbd5e1;
          border-radius: 4pt;
          padding: 8pt 10pt;
          margin-bottom: 12pt;
          font-size: 9.5pt;
          color: #334155;
        }
        .intro-box strong {
          color: #0f172a;
        }
        .target-item {
          page-break-inside: avoid;
          break-inside: avoid;
          border-bottom: 1pt solid #cbd5e1;
          padding-bottom: 10pt;
          margin-bottom: 10pt;
        }
        .target-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4pt;
        }
        .target-title {
          font-size: 12pt;
          font-weight: 800;
          color: #0f172a;
        }
        .target-id {
          font-family: monospace;
          font-size: 8.5pt;
          background: #e2e8f0;
          color: #1e293b;
          padding: 1pt 4pt;
          border-radius: 2pt;
          margin-left: 4pt;
        }
        .target-section {
          font-size: 8.5pt;
          font-weight: 600;
          background: #f1f5f9;
          color: #475569;
          padding: 2pt 6pt;
          border-radius: 3pt;
        }
        .field-box {
          margin-top: 4pt;
          padding: 5pt 7pt;
          border-radius: 3pt;
          background: #f8fafc;
          border: 0.75pt solid #e2e8f0;
        }
        .field-saythis {
          background: #fffbeb;
          border-color: #fde68a;
        }
        .field-what {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }
        .field-disagree {
          background: #fff1f2;
          border-color: #fecdd3;
        }
        .field-label {
          font-size: 7.5pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 2pt;
        }
        .label-what { color: #065f46; }
        .label-why { color: #92400e; }
        .label-evidence { color: #1e40af; }
        .label-saythis { color: #92400e; }
        .label-disagree { color: #9f1239; }
        .field-content-bold {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
        }
        .field-content {
          font-size: 9.5pt;
          color: #334155;
          line-height: 1.35;
        }
        .field-content-code {
          font-family: monospace;
          font-size: 8.5pt;
          color: #1e293b;
          background: #f1f5f9;
          padding: 3pt 5pt;
          border-radius: 2pt;
        }
        .field-content-disagree {
          font-size: 9.5pt;
          font-weight: 600;
          color: #881337;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8pt;
          margin-top: 4pt;
        }
        .col {
          background: #f8fafc;
          border: 0.75pt solid #e2e8f0;
          border-radius: 3pt;
          padding: 5pt 7pt;
        }
        .sources-text {
          font-size: 8pt;
          color: #64748b;
          margin-top: 2pt;
        }
        .footer {
          margin-top: 16pt;
          border-top: 1pt solid #cbd5e1;
          padding-top: 6pt;
          text-align: center;
          font-size: 8pt;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="org">Waypoint Advocates</div>
          <div class="doc-title">${escapeHtml(isParent ? "MEETING BLUEPRINT" : "ADVOCATE STRATEGY BRIEF")}</div>
          <div class="doc-subtitle">${escapeHtml(isParent ? "Family & Student Meeting Guide" : "Confidential Internal Advocacy Workplan")}</div>
        </div>
        <div class="meta">
          <div><strong>Student:</strong> ${escapeHtml(studentName)}</div>
          <div><strong>Meeting:</strong> ${escapeHtml(meetingType)}</div>
          <div><strong>Date:</strong> ${escapeHtml(meetingDate)}</div>
        </div>
      </div>

      ${isParent ? `
        <div class="intro-box">
          <strong>How to use this guide:</strong> This document outlines the priorities and requests prepared for ${escapeHtml(studentName)}'s meeting. Each item clearly states what we are asking for, why it matters, and the supporting evidence.
        </div>
      ` : ""}

      <div class="targets-container">
        ${targetsHtml}
      </div>

      <div class="footer">
        Waypoint Advocates · Owned IEP Advocacy System · ${escapeHtml(studentName)} (${escapeHtml(meetingDate)})
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
