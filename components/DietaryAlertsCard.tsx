'use client'

import React from "react"
import { ShieldAlert, AlertTriangle, AlertCircle, HelpCircle, Info } from "lucide-react"
import { DietaryAlert, DietaryAlertState } from "@/lib/preferences"

interface DietaryAlertsCardProps {
  alerts?: DietaryAlert[]
  medicalDisclaimer?: string
  disclaimers?: string[]
  unsupportedPreferences?: string[]
  isCompatible?: boolean
  className?: string
}

const STATE_CONFIG: Record<
  DietaryAlertState,
  {
    badgeClass: string
    borderClass: string
    bgClass: string
    titleClass: string
    label: string
    icon: React.ReactNode
    levelDescription: string
  }
> = {
  declared: {
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    borderClass: "border-rose-500/30",
    bgClass: "bg-rose-950/20",
    titleClass: "text-rose-200",
    label: "Explicitly Declared",
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    levelDescription: "Stated directly on packaging ingredients or allergen statement."
  },
  cross_contact: {
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-950/20",
    titleClass: "text-amber-200",
    label: "Cross-Contact / Facility Warning",
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    levelDescription: "Packaging warns of shared facility, equipment, or potential trace contact."
  },
  potential_match: {
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    borderClass: "border-orange-500/30",
    bgClass: "bg-orange-950/20",
    titleClass: "text-orange-200",
    label: "Potential Match Requiring Review",
    icon: <AlertCircle className="w-4 h-4 text-orange-400" />,
    levelDescription: "An ingredient derivative closely matches this dietary or allergen criterion."
  },
  insufficient_info: {
    badgeClass: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60",
    borderClass: "border-zinc-800",
    bgClass: "bg-zinc-900/40",
    titleClass: "text-zinc-300",
    label: "Insufficient Label Evidence",
    icon: <HelpCircle className="w-4 h-4 text-zinc-400" />,
    levelDescription: "Packaging facts are partially unreadable, missing, or unverified."
  }
}

export function DietaryAlertsCard({
  alerts = [],
  medicalDisclaimer,
  disclaimers = [],
  unsupportedPreferences = [],
  isCompatible,
  className = ""
}: DietaryAlertsCardProps) {
  // If there are no alerts and no custom disclaimers, provide a truthful absence-of-evidence state
  const hasAlerts = alerts && alerts.length > 0

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6 flex flex-col gap-4 shadow-xl ${className}`}>
      {/* Header separated from score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Dietary & Allergen Verification
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
              Independent of Score
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            Package-Declared Safety Alerts
          </h3>
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-zinc-800">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Absence of evidence is not proof of absence</span>
        </div>
      </div>

      {/* Alert Items or Clean Status */}
      {hasAlerts ? (
        <div className="flex flex-col gap-3">
          {alerts.map((alert, idx) => {
            const config = STATE_CONFIG[alert.state] || STATE_CONFIG.insufficient_info
            return (
              <div
                key={idx}
                className={`rounded-xl border ${config.borderClass} ${config.bgClass} p-4 flex flex-col gap-2 transition`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {alert.preference_label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badgeClass}`}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {alert.explanation}
                </p>

                {alert.source_label_text && (
                  <div className="mt-1 flex items-start gap-1.5 bg-black/40 rounded-lg p-2 border border-white/5 text-[11px] font-mono text-zinc-300">
                    <span className="text-zinc-500 font-bold uppercase text-[9px] shrink-0 pt-0.5">
                      Label Quote:
                    </span>
                    <span className="break-all italic">&ldquo;{alert.source_label_text}&rdquo;</span>
                  </div>
                )}

                <span className="text-[10px] text-zinc-500">
                  {config.levelDescription}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <span>No Active Dietary Conflicts Detected in Readable Label Facts</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            No specified allergen declarations or excluded dietary ingredients were detected in the extracted label panels. This indicates compatibility with readable ingredients only and does not certify complete absence of trace cross-contact.
          </p>
        </div>
      )}

      {/* Unsupported or Custom Preferences Notice */}
      {unsupportedPreferences.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3.5 text-xs text-zinc-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-zinc-200">Custom / Unverified Criteria: </span>
            <span>
              {unsupportedPreferences.join(", ")}. These preferences lack standardized regulatory labeling definitions. Always verify physical packaging.
            </span>
          </div>
        </div>
      )}

      {/* Disclaimers & Regulatory Notice */}
      {disclaimers.length > 0 && (
        <div className="space-y-1">
          {disclaimers.map((d, i) => (
            <p key={i} className="text-[11px] text-zinc-400 italic">
              • {d}
            </p>
          ))}
        </div>
      )}

      {/* Mandatory Medical Disclaimer */}
      <div className="border-t border-zinc-800/80 pt-3 text-[10px] text-zinc-500 leading-relaxed">
        <strong>Medical Disclaimer:</strong> {medicalDisclaimer || "ScanSafe provides automated label analysis based strictly on readable packaging facts. This is not medical, clinical, or allergy diagnosis advice. Manufacturing processes, recipe formulations, and factory lines may change without notice. In case of severe anaphylactic allergies or medical conditions, always inspect physical packaging and consult a qualified physician."}
      </div>
    </div>
  )
}
