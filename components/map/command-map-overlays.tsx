"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, CircleDotDashed, Hospital, Layers3, MapPin, Navigation, Siren } from "lucide-react";
import type { DemandZoneRisk, MapDemandZone } from "@/types/map";
import { cn } from "@/lib/utils";
import { INCIDENT_PRESENTATION } from "@/lib/incident-presentation";

export interface CommandMapLayers {
  critical: boolean;
  high: boolean;
  moderate: boolean;
  requests: boolean;
  reports: boolean;
  responders: boolean;
  rejected: boolean;
  demandZones: boolean;
}

interface CommandMapOverlaysProps {
  layers: CommandMapLayers;
  onLayerChange: (layer: keyof CommandMapLayers, checked: boolean) => void;
  zones: MapDemandZone[];
}

function LayerToggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#1E3A8A]" />
    </label>
  );
}

function LegendRow({ icon, label, color, zone }: { icon?: ReactNode; label: string; color?: string; zone?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {icon ?? <span className={cn("size-3 shrink-0", zone ? "rounded-full border-2 border-dashed bg-transparent" : "rounded-full")} style={color ? { backgroundColor: zone ? undefined : color, borderColor: zone ? color : undefined } : undefined} />}
      <span>{label}</span>
    </li>
  );
}

function CollapsiblePanel({ id, icon, title, open, onToggle, children }: { id: string; icon: ReactNode; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left text-[#1E3A8A] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A]">
        <span className="flex items-center gap-2"><span aria-hidden="true">{icon}</span><span className="text-xs font-black">{title}</span></span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <div id={id} className="border-t border-slate-100 px-4 pb-4">{children}</div> : null}
    </section>
  );
}

const riskLabel: Record<DemandZoneRisk, string> = {
  HIGH: "High historical recurrence",
  MODERATE: "Moderate historical recurrence",
  EMERGING: "Emerging historical recurrence",
};

export function CommandMapOverlays({ layers, onLayerChange, zones }: CommandMapOverlaysProps) {
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const strongestZones = [...zones].sort((first, second) => second.count - first.count).slice(0, 3);

  return (
    <>
      <aside aria-label="Map legend and controls" className="absolute right-4 top-4 z-20 max-h-[calc(100%-2rem)] w-60 max-w-[calc(100%-2rem)] space-y-3 overflow-y-auto pr-1">
        <section aria-label="Historical incident demand outlook" className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2"><CircleDotDashed className="size-4 text-violet-700" /><div><h2 className="text-xs font-black text-[#1E3A8A]">Historical Demand Outlook</h2><p className="text-[9px] font-bold uppercase tracking-wide text-violet-700">Descriptive, not a forecast</p></div></div>
          {strongestZones.length ? <ul className="mt-3 space-y-2">{strongestZones.map((zone) => <li key={zone.id} className="text-xs text-slate-700"><span className="font-bold">{riskLabel[zone.riskLevel]}</span><span className="block text-[10px] text-slate-500">{zone.count} verified reports in one mapped cluster</span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">No recurring verified-report clusters meet the display threshold yet.</p>}
          <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500">Demand zones help planning; they do not predict or confirm an incident.</p>
        </section>
        <CollapsiblePanel id="map-legend-content" icon={<MapPin className="size-3.5" />} title="Map Legend" open={isLegendOpen} onToggle={() => setIsLegendOpen((current) => !current)}>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Incident types</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600">
            {INCIDENT_PRESENTATION.map((incident) => <LegendRow key={incident.label} color={incident.color} label={incident.label} />)}
          </ul>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Incident markers</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600">
            <LegendRow icon={<Siren className="size-3.5 text-red-600" />} label="Active emergency or critical priority" />
            <LegendRow icon={<MapPin className="size-3.5 text-amber-500" />} label="Active non-emergency incident" />
            <LegendRow icon={<CheckCircle2 className="size-3.5 text-emerald-600" />} label="Resolved incident" />
            <LegendRow icon={<MapPin className="size-3.5 text-blue-600" />} label="Selected incident" />
          </ul>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Resources</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600">
            <LegendRow icon={<Hospital className="size-3.5 text-blue-600" />} label="Configured hospital" />
            <LegendRow icon={<Navigation className="size-3.5 text-orange-500" />} label="Dispatched ambulance" />
            <LegendRow icon={<Navigation className="size-3.5 rotate-45 text-amber-500" />} label="Available responder" />
          </ul>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Historical demand zones</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600">
            <LegendRow zone color="#DC2626" label="High frequency — 8+ verified reports" />
            <LegendRow zone color="#D97706" label="Moderate frequency — 5–7 reports" />
            <LegendRow zone color="#2563EB" label="Emerging frequency — 3–4 reports" />
          </ul>
          <p className="mt-2 text-[10px] leading-4 text-slate-500"><CircleDotDashed className="mr-1 inline size-3 text-slate-500" />Verified reports over the last 90 days; not a real-time hazard warning.</p>
        </CollapsiblePanel>

        <CollapsiblePanel id="map-layers-content" icon={<Layers3 className="size-3.5" />} title="Layers" open={isLayersOpen} onToggle={() => setIsLayersOpen((current) => !current)}>
          <div className="mt-2 divide-y divide-slate-100">
            <LayerToggle id="map-critical" label="Critical incidents" checked={layers.critical} onChange={(checked) => onLayerChange("critical", checked)} />
            <LayerToggle id="map-high" label="High incidents" checked={layers.high} onChange={(checked) => onLayerChange("high", checked)} />
            <LayerToggle id="map-moderate" label="Moderate incidents" checked={layers.moderate} onChange={(checked) => onLayerChange("moderate", checked)} />
            <LayerToggle id="map-requests" label="User requests" checked={layers.requests} onChange={(checked) => onLayerChange("requests", checked)} />
            <LayerToggle id="map-reports" label="Responder reports" checked={layers.reports} onChange={(checked) => onLayerChange("reports", checked)} />
            <LayerToggle id="map-responders" label="Response resources" checked={layers.responders} onChange={(checked) => onLayerChange("responders", checked)} />
            <LayerToggle id="map-rejected" label="Rejected reports" checked={layers.rejected} onChange={(checked) => onLayerChange("rejected", checked)} />
            <LayerToggle id="map-demand-zones" label="Historical demand zones" checked={layers.demandZones} onChange={(checked) => onLayerChange("demandZones", checked)} />
          </div>
        </CollapsiblePanel>
      </aside>

    </>
  );
}
