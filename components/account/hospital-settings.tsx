"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Hospital, 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  Check, 
  X, 
  Loader2,
  AlertCircle 
} from "lucide-react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface HospitalItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  caters?: boolean;
  phone?: string | null;
}

const BALIWAG_CENTER = {
  latitude: 14.9547,
  longitude: 120.8969,
  zoom: 13,
};

export function HospitalSettings() {
  const mapRef = useRef<MapRef>(null);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latInput, setLatInput] = useState<number | "">("");
  const [lngInput, setLngInput] = useState<number | "">("");
  const [caters, setCaters] = useState(true);
  const [phone, setPhone] = useState("");

  // Map States
  const [previewPin, setPreviewPin] = useState<{ lat: number; lng: number } | null>(null);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/map/hospitals");
      if (!res.ok) throw new Error("Failed to fetch hospitals");
      const data = await res.json();
      setHospitals(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load hospitals list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleMapClick = (e: any) => {
    const { lng, lat } = e.lngLat;
    setLatInput(Number(lat.toFixed(6)));
    setLngInput(Number(lng.toFixed(6)));
    setPreviewPin({ lat, lng });
    toast.info(`Coordinates pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  const handleEdit = (hosp: HospitalItem) => {
    setEditingId(hosp.id);
    setName(hosp.name);
    setAddress(hosp.address);
    setLatInput(hosp.lat);
    setLngInput(hosp.lng);
    setCaters(hosp.caters !== false);
    setPhone(hosp.phone || "");
    setPreviewPin({ lat: hosp.lat, lng: hosp.lng });

    // Fly camera to the hospital coordinates on edit
    mapRef.current?.flyTo({
      center: [hosp.lng, hosp.lat],
      zoom: 15,
      duration: 1500,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setLatInput("");
    setLngInput("");
    setCaters(true);
    setPhone("");
    setPreviewPin(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Hospital name is required");
    if (!address.trim()) return toast.error("Hospital address is required");
    if (latInput === "" || isNaN(Number(latInput))) return toast.error("Valid latitude is required");
    if (lngInput === "" || isNaN(Number(lngInput))) return toast.error("Valid longitude is required");

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      address: address.trim(),
      lat: Number(latInput),
      lng: Number(lngInput),
      caters,
      phone: phone.trim() || null,
    };

    try {
      const url = editingId ? `/api/admin/hospitals/${editingId}` : "/api/admin/hospitals";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${editingId ? 'update' : 'create'} hospital`);
      }

      toast.success(editingId ? "Hospital updated successfully!" : "Hospital added successfully!");
      handleCancel();
      fetchHospitals();
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hospital? This action cannot be undone.")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/admin/hospitals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete hospital");
      }

      toast.success("Hospital deleted successfully!");
      if (editingId === id) handleCancel();
      fetchHospitals();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete hospital");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      {/* Left side: CRUD Form & Hospital Cards */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
              <Hospital className="h-5 w-5 text-blue-600" />
              {editingId ? "Edit Hospital Marker" : "Add New Hospital Marker"}
            </h3>
            {editingId && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 h-8 rounded-lg"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel Edit
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <Label htmlFor="hosp-name" className="text-xs font-bold text-[#1E293B]">Hospital Name</Label>
                <Input
                  id="hosp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Allied Care Experts (ACE) Medical Center"
                  className="h-10 border-[#CBD5E1] rounded-xl px-3 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <Label htmlFor="hosp-address" className="text-xs font-bold text-[#1E293B]">Street Address</Label>
                <Input
                  id="hosp-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., DRT Highway, Pinagbarilan, Baliwag"
                  className="h-10 border-[#CBD5E1] rounded-xl px-3 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-phone" className="text-xs font-bold text-[#1E293B]">Contact Number</Label>
                <Input
                  id="hosp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., (044) 795 3000"
                  className="h-10 border-[#CBD5E1] rounded-xl px-3 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 px-3 h-10 border border-[#CBD5E1] rounded-xl bg-slate-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caters}
                    onChange={(e) => setCaters(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Emergency Catering</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-lat" className="text-xs font-bold text-[#1E293B]">Latitude</Label>
                <Input
                  id="hosp-lat"
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value !== "" ? Number(e.target.value) : "")}
                  placeholder="e.g., 14.9664"
                  className="h-10 border-[#CBD5E1] rounded-xl px-3 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-lng" className="text-xs font-bold text-[#1E293B]">Longitude</Label>
                <Input
                  id="hosp-lng"
                  type="number"
                  step="0.000001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value !== "" ? Number(e.target.value) : "")}
                  placeholder="e.g., 120.9145"
                  className="h-10 border-[#CBD5E1] rounded-xl px-3 text-sm bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-2.5">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-600">
                <strong>Tip:</strong> You don't have to type the latitude and longitude manually! Simply scroll/zoom the interactive map on the right and **click any street/point** to immediately set the coordinate pins and auto-fill the forms.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Save Changes" : "Create Hospital Marker"}
            </Button>
          </form>
        </div>

        {/* Hospitals List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Hospital Locations ({hospitals.length})</h4>

          {loading ? (
            <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : hospitals.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-sm font-medium text-slate-500">No hospitals registered in the database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {hospitals.map((hosp) => (
                <div 
                  key={hosp.id}
                  onClick={() => {
                    // Pan map to clicked card hospital
                    mapRef.current?.flyTo({
                      center: [hosp.lng, hosp.lat],
                      zoom: 15,
                      duration: 1000,
                    });
                    setPreviewPin({ lat: hosp.lat, lng: hosp.lng });
                  }}
                  className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl border transition-all cursor-pointer ${
                    editingId === hosp.id 
                      ? 'bg-blue-50/40 border-blue-200' 
                      : 'bg-white border-slate-100 shadow-sm hover:shadow hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{hosp.name}</span>
                      {hosp.caters !== false ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Caters Emergencies
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          No Catering
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{hosp.address}</p>
                    
                    <div className="flex gap-4 text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hosp.lat.toFixed(5)}, {hosp.lng.toFixed(5)}
                      </span>
                      {hosp.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {hosp.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 md:mt-0 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(hosp)}
                      className="h-8 w-8 text-blue-600 border-slate-200 hover:bg-blue-50/50 rounded-lg"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={deletingId === hosp.id}
                      onClick={() => handleDelete(hosp.id)}
                      className="h-8 w-8 text-rose-600 border-slate-200 hover:bg-rose-50/50 rounded-lg"
                    >
                      {deletingId === hosp.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Maplibre Interactive Visual Locator */}
      <div className="lg:col-span-5 flex flex-col h-[500px] lg:h-[650px] space-y-3">
        <div className="flex justify-between items-center shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Interactive Visual Locator Map</span>
          {previewPin && (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="h-3 w-3 fill-current" />
              Marker preview active
            </span>
          )}
        </div>

        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative bg-[#0a0a1a]">
          <Map
            ref={mapRef}
            initialViewState={BALIWAG_CENTER}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://tiles.openfreemap.org/styles/dark"
            onClick={handleMapClick}
            attributionControl={false}
          >
            <NavigationControl position="bottom-right" />

            {/* Existing Active Hospitals */}
            {hospitals.map((hosp) => (
              <Marker
                key={hosp.id}
                latitude={hosp.lat}
                longitude={hosp.lng}
                anchor="bottom"
              >
                <div className="relative group cursor-pointer flex flex-col items-center">
                  <div className="absolute -top-7 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap bg-slate-900 text-white shadow opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {hosp.name}
                  </div>
                  <div className="relative z-10 p-1 rounded-full border bg-blue-600 border-white text-white shadow-md scale-105">
                    <Hospital size={14} fill="currentColor" />
                  </div>
                </div>
              </Marker>
            ))}

            {/* Red Preview Pin for adding/editing coordinate select */}
            {previewPin && (
              <Marker
                latitude={previewPin.lat}
                longitude={previewPin.lng}
                anchor="bottom"
              >
                <div className="flex flex-col items-center">
                  <div className="absolute -top-7 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap bg-rose-600 text-white shadow z-50">
                    Pin Location
                  </div>
                  <div className="relative z-10 p-1 bg-rose-600 border border-white text-white rounded-full shadow-lg scale-125 animate-bounce">
                    <MapPin size={16} fill="currentColor" />
                  </div>
                </div>
              </Marker>
            )}
          </Map>
        </div>
      </div>
    </div>
  );
}
