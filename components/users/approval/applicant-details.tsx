"use client";

import { Applicant } from "@/types/approval";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, CreditCard, ExternalLink } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface ApplicantDetailsProps {
  applicant: Applicant;
}

export function ApplicantDetails({ applicant }: ApplicantDetailsProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{applicant.fullName}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Mail className="w-4 h-4" />
                {applicant.email}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Phone className="w-4 h-4" />
                {applicant.phone}
              </div>
            </div>
          </div>
          <Badge className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 px-3 py-1">
            {applicant.roleRequested.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          {/* Identity Verification Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-100 p-1.5 rounded text-[#1E3A8A]">
                <CreditCard className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Identity Verification
              </h2>
            </div>
            
            <Card className="overflow-hidden border-2 border-slate-100">
              <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase">
                  Government ID: {applicant.identityDocument.type}
                </span>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-orange-600 border-orange-200 bg-orange-50 px-2 py-0">
                    Confidential: Review Only
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Uploaded on {format(new Date(applicant.identityDocument.uploadedAt), "MMM d, yyyy • h:mm a")}
                  </span>
                </div>
              </div>
              <div className="relative aspect-video bg-slate-200 group">
                {applicant.identityDocument.imageUrl ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="w-full h-full relative overflow-hidden cursor-pointer" role="button" tabIndex={0}>
                        <Image
                          src={applicant.identityDocument.imageUrl}
                          alt="Government ID"
                          fill
                          className="object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-900 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Click to Enlarge
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl h-[80vh]">
                      <div className="relative w-full h-full">
                        <Image
                          src={applicant.identityDocument.imageUrl}
                          alt="Government ID Full"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50 text-slate-400 text-sm font-medium">
                    No ID image uploaded
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Personal Information & Address */}
          <section className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-slate-100 p-1.5 rounded text-slate-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Residential Address
                  </h2>
                </div>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                  {applicant.address}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-slate-100 p-1.5 rounded text-slate-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Registration Timeline
                  </h2>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Registered on</span>
                    <span className="font-bold text-slate-700">
                      {format(new Date(applicant.registeredAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Wait time</span>
                    <span className="font-bold text-[#1E3A8A]">
                      {format(new Date(applicant.registeredAt), "h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 items-start">
            <div className="bg-blue-200 p-1.5 rounded text-blue-700 mt-0.5">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Verification Guide</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Ensure the name on the Government ID matches the profile name exactly. 
                Verify the ID is not expired and all text is legible. Cross-reference 
                the residential address with the document if provided.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
