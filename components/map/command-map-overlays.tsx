"use client";

import { AlertTriangle, Ambulance, CircleDotDashed, Hospital, Info, Layers3, MapPin } from "lucide-react";
import type { DemandZoneRisk, MapDemandZone } from "@/types/map";

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
  return <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-xs font-medium text-slate-700"><span>{label}</span><input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#1E3A8A]" /></label>;
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return <li className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span></li>;
}

const riskLabel: Record<DemandZoneRisk, string> = {
  HIGH: "High historical recurrence",
  MODERATE: "Moderate historical recurrence",
  EMERGING: "Emerging historical recurrence",
};

export function CommandMapOverlays({ layers, onLayerChange, zones }: CommandMapOverlaysProps) {
  const strongestZones = [...zones].sort((first, second) => second.count - first.count).slice(0, 3);
  return (
    <>
      <aside aria-label="Map legend and controls" className="absolute right-4 top-4 z-20 hidden w-60 space-y-3 xl:block">
        <section className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between"><h2 className="text-xs font-black text-[#1E3A8A]">Map Legend</h2><Info className="size-3.5 text-slate-400" /></div>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Incident types</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600"><LegendRow color="#1E3A8A" label="Vehicular Collision" /><LegendRow color="#3B82F6" label="Medical Emergency" /><LegendRow color="#7C3AED" label="Structural Failure" /><LegendRow color="#EF4444" label="Fire / Explosion" /><LegendRow color="#14B8A6" label="Flood / Water" /><LegendRow color="#94A3B8" label="Other report types" /></ul>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Operational markers</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600"><li className="flex items-center gap-2"><AlertTriangle className="size-3.5 text-red-600" /> Critical priority</li><li className="flex items-center gap-2"><MapPin className="size-3.5 text-blue-600" /> Active incident</li><li className="flex items-center gap-2"><Hospital className="size-3.5 text-emerald-600" /> Emergency-capable hospital</li><li className="flex items-center gap-2"><Ambulance className="size-3.5 text-amber-600" /> Response resource</li></ul>
          <p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">Historical demand zones</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-slate-600"><LegendRow color="#DC2626" label="High frequency — 8+ verified reports" /><LegendRow color="#D97706" label="Moderate frequency — 5–7 reports" /><LegendRow color="#2563EB" label="Emerging frequency — 3–4 reports" /></ul>
          <p className="mt-2 text-[10px] leading-4 text-slate-500"><CircleDotDashed className="mr-1 inline size-3 text-slate-500" />Verified reports over the last 90 days; not a real-time hazard warning.</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur"><div className="flex items-center gap-2"><Layers3 className="size-3.5 text-[#1E3A8A]" /><h2 className="text-xs font-black text-[#1E3A8A]">Layers</h2></div><div className="mt-2 divide-y divide-slate-100"><LayerToggle id="map-critical" label="Critical incidents" checked={layers.critical} onChange={(checked) => onLayerChange("critical", checked)} /><LayerToggle id="map-high" label="High incidents" checked={layers.high} onChange={(checked) => onLayerChange("high", checked)} /><LayerToggle id="map-moderate" label="Moderate incidents" checked={layers.moderate} onChange={(checked) => onLayerChange("moderate", checked)} /><LayerToggle id="map-requests" label="User requests" checked={layers.requests} onChange={(checked) => onLayerChange("requests", checked)} /><LayerToggle id="map-reports" label="Responder reports" checked={layers.reports} onChange={(checked) => onLayerChange("reports", checked)} /><LayerToggle id="map-responders" label="Response resources" checked={layers.responders} onChange={(checked) => onLayerChange("responders", checked)} /><LayerToggle id="map-rejected" label="Rejected reports" checked={layers.rejected} onChange={(checked) => onLayerChange("rejected", checked)} /><LayerToggle id="map-demand-zones" label="Historical demand zones" checked={layers.demandZones} onChange={(checked) => onLayerChange("demandZones", checked)} /></div></section>
      </aside>
      <section aria-label="Historical incident demand outlook" className="absolute bottom-4 left-4 z-20 hidden w-64 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:block">
        <div className="flex items-center gap-2"><CircleDotDashed className="size-4 text-violet-700" /><div><h2 className="text-xs font-black text-[#1E3A8A]">Historical Demand Outlook</h2><p className="text-[9px] font-bold uppercase tracking-wide text-violet-700">Descriptive, not a forecast</p></div></div>
        {strongestZones.length ? <ul className="mt-3 space-y-2">{strongestZones.map((zone) => <li key={zone.id} className="text-xs text-slate-700"><span className="font-bold">{riskLabel[zone.riskLevel]}</span><span className="block text-[10px] text-slate-500">{zone.count} verified reports in one mapped cluster</span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">No recurring verified-report clusters meet the display threshold yet.</p>}
        <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500">Demand zones help planning; they do not predict or confirm an incident.</p>
      </section>
    </>
  );
}
