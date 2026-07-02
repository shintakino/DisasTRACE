"use client";

import * as React from "react";
import { toast } from "sonner";
import { 
  Search, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  Calendar, 
  User, 
  Eye, 
  Check, 
  Inbox,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface SupportMessage {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "UNREAD" | "READ" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

export default function SupportMessagesPage() {
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "UNREAD" | "READ" | "RESOLVED">("ALL");
  const [selectedMessage, setSelectedMessage] = React.useState<SupportMessage | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/support/messages");
      const data = await response.json();
      if (response.ok && data.success) {
        setMessages(data.data);
      } else {
        toast.error(data.error || "Failed to load support messages");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load support messages due to a connection issue");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMessages();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "UNREAD" | "READ" | "RESOLVED") => {
    try {
      const response = await fetch("/api/support/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Message marked as ${newStatus.toLowerCase()}`);
        
        // Update local state
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
        
        // Update selected message if open in dialog
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        toast.error(data.error || "Failed to update message status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status due to network error");
    }
  };

  const handleOpenDetails = (msg: SupportMessage) => {
    setSelectedMessage(msg);
    setIsDetailsOpen(true);
    
    // Automatically mark as READ if it is currently UNREAD
    if (msg.status === "UNREAD") {
      handleUpdateStatus(msg.id, "READ");
    }
  };

  // Filter logic
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === "ALL" || msg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Counts for Metric Cards
  const unreadCount = messages.filter(m => m.status === "UNREAD").length;
  const resolvedCount = messages.filter(m => m.status === "RESOLVED").length;
  const totalCount = messages.length;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F3F4F6]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1E3A8A] font-heading">Support Messages</h2>
          <p className="text-muted-foreground text-sm">
            Manage feedback and general inquiries submitted by residents from the mobile app.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Messages</CardTitle>
            <div className="h-9 w-9 bg-slate-100 rounded-full flex items-center justify-center">
              <Inbox className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-black text-slate-800">{totalCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">General submissions received</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Unread Messages</CardTitle>
            <div className="h-9 w-9 bg-amber-50 rounded-full flex items-center justify-center">
              <Mail className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-black text-amber-600">{unreadCount}</div>
            )}
            <p className="text-xs text-amber-600 font-medium mt-1 font-semibold">Require immediate review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resolved Messages</CardTitle>
            <div className="h-9 w-9 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-black text-emerald-600">{resolvedCount}</div>
            )}
            <p className="text-xs text-emerald-600 font-medium mt-1 font-semibold">Successfully addressed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-6">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by sender, email, subject, or message..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              {(["ALL", "UNREAD", "READ", "RESOLVED"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab 
                      ? "bg-white text-[#1E3A8A] shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Table */}
          {loading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : paginatedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-700 text-lg">No Messages Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                {searchQuery || statusFilter !== "ALL" 
                  ? "Try adjusting your search keywords or active status filter."
                  : "No resident inquiries have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-600 py-3.5 pl-6">SENDER</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 py-3.5">SUBJECT</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 py-3.5">RECEIVED ON</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 py-3.5">STATUS</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 py-3.5 text-right pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMessages.map(msg => (
                    <TableRow 
                      key={msg.id}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                        msg.status === "UNREAD" ? "bg-amber-50/10" : ""
                      }`}
                      onClick={() => handleOpenDetails(msg)}
                    >
                      <TableCell className="py-4 pl-6" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col">
                          <span className={`text-slate-800 ${msg.status === "UNREAD" ? "font-bold" : "font-semibold"}`}>
                            {msg.name}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center mt-0.5 font-medium">
                            <Mail className="h-3 w-3 mr-1" />
                            {msg.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate py-4">
                        <span className={`text-slate-800 block truncate ${msg.status === "UNREAD" ? "font-bold" : "font-medium"}`}>
                          {msg.subject}
                        </span>
                        <span className="text-xs text-slate-500 block truncate mt-0.5 font-medium">
                          {msg.message}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm py-4">
                        <div className="flex items-center font-medium">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                          {new Date(msg.createdAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {msg.status === "UNREAD" && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px] tracking-wide px-2 py-0.5">
                            UNREAD
                          </Badge>
                        )}
                        {msg.status === "READ" && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-[10px] tracking-wide px-2 py-0.5">
                            READ
                          </Badge>
                        )}
                        {msg.status === "RESOLVED" && (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px] tracking-wide px-2 py-0.5">
                            RESOLVED
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Message"
                            onClick={() => handleOpenDetails(msg)}
                            className="text-[#1E3A8A] hover:bg-slate-100 h-8 w-8 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {msg.status === "UNREAD" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark as Read"
                              onClick={() => handleUpdateStatus(msg.id, "READ")}
                              className="text-blue-600 hover:bg-blue-50 h-8 w-8 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {msg.status !== "RESOLVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark as Resolved"
                              onClick={() => handleUpdateStatus(msg.id, "RESOLVED")}
                              className="text-emerald-600 hover:bg-emerald-50 h-8 w-8 cursor-pointer"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-4">
              <span className="text-xs font-semibold text-slate-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredMessages.length)} of {filteredMessages.length} inquiries
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-slate-600 cursor-pointer"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold px-3 text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="text-slate-600 cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md p-0 border-0 shadow-2xl rounded-[24px] overflow-hidden bg-white flex flex-col" showCloseButton={true}>
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">Message Details</DialogTitle>
                  <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                    Inquiry from <span className="font-bold text-white">{selectedMessage?.name}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={`font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md ${
                  selectedMessage?.status === "UNREAD" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  selectedMessage?.status === "READ" ? "bg-blue-100 text-blue-800 border-blue-200" :
                  "bg-emerald-100 text-emerald-800 border-emerald-200"
                }`}
              >
                {selectedMessage?.status}
              </Badge>
              {selectedMessage?.createdAt && (
                <span className="text-xs font-medium text-slate-400 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(selectedMessage.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              )}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <DialogTitle className="text-base font-black text-slate-800 leading-tight text-left">
                {selectedMessage?.subject}
              </DialogTitle>
              <div className="h-px bg-slate-100" />
              <div className="space-y-1.5 text-xs text-slate-600 pl-1 text-left">
                <div className="flex"><span className="text-slate-400 font-bold w-16 uppercase">Name:</span> <span className="text-slate-800 font-bold">{selectedMessage?.name}</span></div>
                <div className="flex"><span className="text-slate-400 font-bold w-16 uppercase">Email:</span> <span className="text-slate-800 font-bold truncate select-all">{selectedMessage?.email}</span></div>
                {selectedMessage?.userId && (
                  <div className="flex"><span className="text-slate-400 font-bold w-16 uppercase">User ID:</span> <span className="text-[#1E3A8A] font-bold select-all">{selectedMessage.userId}</span></div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                Inquiry Message
              </label>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-medium shadow-sm">
                {selectedMessage?.message}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t border-slate-100 flex flex-row gap-3 shrink-0">
            {selectedMessage?.status !== "RESOLVED" && (
              <Button
                variant="outline"
                onClick={() => selectedMessage && handleUpdateStatus(selectedMessage.id, "RESOLVED")}
                className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 hover:text-emerald-900 font-bold flex-1 cursor-pointer rounded-xl py-5 h-auto text-sm"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Resolve Message
              </Button>
            )}
            {selectedMessage?.status === "RESOLVED" && (
              <Button
                variant="outline"
                onClick={() => selectedMessage && handleUpdateStatus(selectedMessage.id, "READ")}
                className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 font-bold flex-1 cursor-pointer rounded-xl py-5 h-auto text-sm"
              >
                Reopen Message
              </Button>
            )}
            <Button
              onClick={() => setIsDetailsOpen(false)}
              className="bg-[#1E3A8A] hover:bg-[#152a65] text-white font-bold cursor-pointer rounded-xl px-6 py-5 h-auto text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
