"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  ShieldCheck, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  Info,
  ChevronRight,
  ChevronDown,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
};

type SupportDetails = {
  phone: string;
  email: string;
  address: string;
  privacyPolicy: string;
  privacyPolicyFull: string;
};

export default function HelpPage() {
  const { role, user } = useAuth();
  const isSuperAdmin = role?.toLowerCase() === "cdrrmo_super_admin";

  const [activeTab, setActiveTab] = useState<string>("privacy");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Data States
  const [support, setSupport] = useState<SupportDetails>({
    phone: "",
    email: "",
    address: "",
    privacyPolicy: "",
    privacyPolicyFull: "",
  });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // Accordion state for read-only FAQs
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // New FAQ Form State
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(0);

  const fetchSupportData = async () => {
    try {
      const response = await fetch("/api/settings/support");
      const data = await response.json();
      if (response.ok && data.success) {
        setSupport(data.support);
        setFaqs(data.faqs || []);
      } else {
        toast.error("Failed to load support settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading support settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
    // Default tab based on role
    if (isSuperAdmin) {
      setActiveTab("contacts-edit");
    } else {
      setActiveTab("privacy");
    }
  }, [role]);

  const handleUpdateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(support),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Help & Support configurations updated successfully!");
        setSupport(data.support);
      } else {
        toast.error(data.error || "Failed to update configurations");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error saving configurations");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("FAQ Question and Answer are required.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/support/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQuestion,
          answer: newAnswer,
          displayOrder: Number(newDisplayOrder) || 0,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("FAQ added successfully!");
        setFaqs(prev => [...prev, data.faq].sort((a, b) => a.displayOrder - b.displayOrder));
        setNewQuestion("");
        setNewAnswer("");
        setNewDisplayOrder(0);
      } else {
        toast.error(data.error || "Failed to add FAQ");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error adding FAQ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    try {
      const response = await fetch(`/api/settings/support/faq/${faqId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("FAQ deleted successfully!");
        setFaqs(prev => prev.filter(f => f.id !== faqId));
      } else {
        toast.error(data.error || "Failed to delete FAQ");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error deleting FAQ");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full bg-slate-50/20 border border-slate-100 rounded-2xl overflow-hidden p-8 gap-8">
        <div className="w-[260px] space-y-3 shrink-0">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="flex-1 space-y-6">
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW A: CDRRMO Super Admin Customization Center
  // -------------------------------------------------------------
  if (isSuperAdmin) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Admin Left Sidebar */}
        <div className="w-[280px] border-r border-[#E2E8F0] p-6 shrink-0 bg-slate-50/50">
          <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-6">
            Helpdesk Configurator
          </div>
          
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("contacts-edit")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
                activeTab === "contacts-edit"
                  ? "bg-[#1E3A8A] text-white shadow-md"
                  : "text-[#64748B] hover:bg-slate-100"
              )}
            >
              <Phone className="h-4.5 w-4.5" />
              Support Contacts
            </button>
            
            <button
              onClick={() => setActiveTab("privacy-edit")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
                activeTab === "privacy-edit"
                  ? "bg-[#1E3A8A] text-white shadow-md"
                  : "text-[#64748B] hover:bg-slate-100"
              )}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              Privacy Policy & Terms
            </button>

            <button
              onClick={() => setActiveTab("faqs-edit")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
                activeTab === "faqs-edit"
                  ? "bg-[#1E3A8A] text-white shadow-md"
                  : "text-[#64748B] hover:bg-slate-100"
              )}
            >
              <HelpCircle className="h-4.5 w-4.5" />
              Manage FAQs
            </button>
          </nav>
        </div>

        {/* Admin Form Panel */}
        <div className="flex-1 p-8 overflow-y-auto bg-white">
          {activeTab === "contacts-edit" && (
            <form onSubmit={handleUpdateSupport} className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Support Contacts Settings</h2>
                <p className="text-slate-500 text-xs mt-1">Configure emergency hotlines and support channels visible on the mobile app.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Phone Hotline</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      value={support.phone}
                      onChange={(e) => setSupport(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(044) 761-0000"
                      className="pl-10 h-10.5 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Support Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      value={support.email}
                      type="email"
                      onChange={(e) => setSupport(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="cdrrmobaliwag@gmail.com"
                      className="pl-10 h-10.5 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Command Center Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Textarea
                      value={support.address}
                      onChange={(e) => setSupport(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Baliwag Government Center..."
                      className="pl-10 min-h-[80px] rounded-xl border-slate-200 py-3"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-xl h-10.5 px-6 font-bold flex items-center gap-2"
              >
                <Save className="h-4.5 w-4.5" />
                Save Contacts
              </Button>
            </form>
          )}

          {activeTab === "privacy-edit" && (
            <form onSubmit={handleUpdateSupport} className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Data Privacy Settings</h2>
                <p className="text-slate-500 text-xs mt-1">Manage data privacy and consent terms populated inside mobile user profile cards.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mobile Privacy Summary (Short)</label>
                  <Textarea
                    value={support.privacyPolicy}
                    onChange={(e) => setSupport(prev => ({ ...prev, privacyPolicy: e.target.value }))}
                    placeholder="Short summary for settings card..."
                    className="min-h-[90px] rounded-xl border-slate-200 p-4 leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Privacy & Consent Policy</label>
                  <Textarea
                    value={support.privacyPolicyFull}
                    onChange={(e) => setSupport(prev => ({ ...prev, privacyPolicyFull: e.target.value }))}
                    placeholder="Full Terms & Privacy agreement..."
                    className="min-h-[220px] rounded-xl border-slate-200 p-4 leading-relaxed font-mono text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-xl h-10.5 px-6 font-bold flex items-center gap-2"
              >
                <Save className="h-4.5 w-4.5" />
                Save Privacy Clauses
              </Button>
            </form>
          )}

          {activeTab === "faqs-edit" && (
            <div className="space-y-8 max-w-3xl">
              {/* Add FAQ form */}
              <form onSubmit={handleAddFaq} className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-5 w-5 text-[#1E3A8A]" />
                  <span className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Add New FAQ</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Question</label>
                      <Input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="e.g. How do I request a non-emergency dispatch?"
                        className="rounded-xl border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Order</label>
                      <Input
                        type="number"
                        value={newDisplayOrder}
                        onChange={(e) => setNewDisplayOrder(Number(e.target.value))}
                        className="rounded-xl border-slate-200 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Answer Description</label>
                    <Textarea
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Detailed answer text..."
                      className="min-h-[80px] rounded-xl border-slate-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-xl font-bold flex items-center gap-1.5 h-9"
                >
                  <Plus className="h-4 w-4" />
                  Add FAQ
                </Button>
              </form>

              {/* FAQs List */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wide">Existing FAQs ({faqs.length})</h3>
                
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4 rounded-xl border border-slate-200 flex gap-4 justify-between items-start">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                            Order {faq.displayOrder}
                          </span>
                          <span className="font-bold text-sm text-slate-800 truncate block">
                            {faq.question}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pr-4">
                          {faq.answer}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-full shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {faqs.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm font-medium italic">
                      No FAQs configured in database yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: Read-Only Help Desk (PACC Admin or standard web staff)
  // -------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-140px)] w-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Read-Only Sidebar */}
      <div className="w-[280px] border-r border-[#E2E8F0] p-6 shrink-0 bg-slate-50/50">
        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-6">
          Support Center
        </div>
        
        <nav className="space-y-1.5">
          <button
            onClick={() => setActiveTab("privacy")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
              activeTab === "privacy"
                ? "bg-[#1E3A8A] text-white"
                : "text-[#64748B] hover:bg-slate-100"
            )}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            Privacy Policy
          </button>
          
          <button
            onClick={() => setActiveTab("terms")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
              activeTab === "terms"
                ? "bg-[#1E3A8A] text-white"
                : "text-[#64748B] hover:bg-slate-100"
            )}
          >
            <FileText className="h-4.5 w-4.5" />
            Terms & Conditions
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
              activeTab === "contacts"
                ? "bg-[#1E3A8A] text-white"
                : "text-[#64748B] hover:bg-slate-100"
            )}
          >
            <Phone className="h-4.5 w-4.5" />
            Hotlines & Contacts
          </button>

          <button
            onClick={() => setActiveTab("faqs")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left",
              activeTab === "faqs"
                ? "bg-[#1E3A8A] text-white"
                : "text-[#64748B] hover:bg-slate-100"
            )}
          >
            <HelpCircle className="h-4.5 w-4.5" />
            FAQs
          </button>
        </nav>
      </div>

      {/* Read-Only Content View */}
      <div className="flex-1 p-10 overflow-y-auto max-w-4xl mx-auto">
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight border-b pb-4">Privacy Policy</h2>
            <div className="text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-6 rounded-2xl border border-slate-100 whitespace-pre-line">
              {support.privacyPolicyFull}
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight border-b pb-4">Terms & Conditions</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-4">
              <p className="font-bold text-slate-800">Welcome to DisasTRACE!</p>
              <p>These terms and conditions outline the rules and regulations for the use of the DisasTRACE centralized digital emergency reporting system.</p>
              <p>By accessing and utilizing this command portal, we assume you accept these terms and conditions in full. Do not continue to operate DisasTRACE if you do not agree to abide by all the guidelines and compliance measures stated herein.</p>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mt-6">Authorized Command Use Only</h3>
              <p>Access to this dashboard is strictly restricted to authenticated CDRRMO Super Administrators and PACC Dispatchers. Sharing credentials, exposing resident private findings, or downloading diagnostic data without official clearance violates public safety protocol and R.A. 10173 (Data Privacy Act).</p>
            </div>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight border-b pb-4">Hotlines & Support Contacts</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1E3A8A]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotline</div>
                    <span className="font-black text-base text-slate-800">{support.phone}</span>
                  </div>
                </div>
                <a href={`tel:${support.phone.replace(/[^\d+]/g, "")}`} className="text-[#1E3A8A] font-bold text-xs hover:underline flex items-center gap-1">
                  Click to dial <ChevronRight className="h-3 w-3" />
                </a>
              </Card>

              <Card className="rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1E3A8A]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</div>
                    <span className="font-black text-sm text-slate-800 truncate block max-w-[170px]">{support.email}</span>
                  </div>
                </div>
                <a href={`mailto:${support.email}`} className="text-[#1E3A8A] font-bold text-xs hover:underline flex items-center gap-1">
                  Send email <ChevronRight className="h-3 w-3" />
                </a>
              </Card>

              <Card className="rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-40 col-span-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1E3A8A]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HQ Center</div>
                    <span className="font-bold text-xs text-slate-800 leading-tight block max-w-[170px]">CDRRMO Baliwag Gov Center</span>
                  </div>
                </div>
                <span className="text-slate-400 font-medium text-[10px] italic">
                  Command Headquarters
                </span>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "faqs" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight border-b pb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                    className="w-full flex justify-between items-center p-5 text-left font-bold text-sm text-slate-800 hover:bg-slate-50/50"
                  >
                    <span className="flex-1 pr-4">{faq.question}</span>
                    {expandedFaqId === faq.id ? (
                      <ChevronDown className="h-4 w-4 text-[#1E3A8A] shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  
                  {expandedFaqId === faq.id && (
                    <div className="px-5 pb-5 pt-1 text-slate-600 text-xs leading-relaxed border-t border-slate-50 bg-slate-50/30 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-sm font-medium italic">
                  No FAQs registered in the database.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
