/**
 * CDRRMO DisasTRACE PDF Export Utility
 * Handles client-side PDF generation for reports summary and detailed incident reports.
 * 
 * Uses dynamic imports to safely run client-side only libraries (jsPDF and jsPDF-AutoTable)
 * in Next.js App Router without SSR compilation crashes.
 */

import { ReportEntry, DetailedIncidentReport } from "@/types/reports";
import { UserManagementEntry } from "@/types/users";

/**
 * Format date helper
 */
const getFormattedDate = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Helper to load images safely inside jsPDF and convert them to base64
 */
const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load image for PDF:", error);
    return null;
  }
};

/**
 * Exports a summary list of incident reports as a beautifully formatted PDF
 */
export async function exportReportsSummaryPDF(
  reports: ReportEntry[],
  filters: { search?: string; type?: string; status?: string } = {}
) {
  if (typeof window === "undefined") return;

  try {
    // Dynamic import to prevent SSR errors
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // --- Branded Header Styles ---
    // Background Navy Header Banner
    doc.setFillColor(30, 58, 138); // #1E3A8A Navy
    doc.rect(0, 0, pageWidth, 40, "F");

    // Baliwag Accent Bar
    doc.setFillColor(239, 68, 68); // #EF4444 Red
    doc.rect(0, 40, pageWidth, 2, "F");

    // Header Typography
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CDRRMO BALIWAG CITY", 14, 15);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(147, 197, 253); // text-blue-300
    doc.text("PUBLIC ASSISTANCE AND COMMAND CENTER (PACC)", 14, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("EMERGENCY INCIDENT REPORTS SUMMARY", 14, 32);

    // --- Document Meta Information ---
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Left meta block
    doc.setFont("helvetica", "bold");
    doc.text("DATE GENERATED:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(getFormattedDate(), 47, 52);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL RECORDS:", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`${reports.length} Reports Listed`, 47, 58);

    // Right meta block (filters applied)
    const activeFilters = [];
    if (filters.search) activeFilters.push(`Search: "${filters.search}"`);
    if (filters.type) activeFilters.push(`Type: ${filters.type}`);
    if (filters.status) activeFilters.push(`Status: ${filters.status}`);
    const filterText = activeFilters.length > 0 ? activeFilters.join(" | ") : "None";

    doc.setFont("helvetica", "bold");
    doc.text("FILTERS APPLIED:", 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(filterText, 154, 52);

    doc.setFont("helvetica", "bold");
    doc.text("STATUS STATUS:", 120, 58);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL REGISTERED LOGS", 154, 58);

    // Divider line
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(14, 64, pageWidth - 14, 64);

    // --- Reports Table ---
    const tableColumns = [
      { header: "REPORT ID", dataKey: "id" },
      { header: "RESPONDER NAME", dataKey: "responderName" },
      { header: "INCIDENT TYPE", dataKey: "type" },
      { header: "STATUS", dataKey: "status" },
      { header: "DATE & TIME", dataKey: "dateTime" },
      { header: "LOCATION", dataKey: "location" },
    ];

    const tableRows = reports.map((r) => ({
      id: r.id,
      responderName: r.responderName,
      type: r.type,
      status: r.status,
      dateTime: `${r.date}\n${r.time}`,
      location: r.location,
    }));

    autoTable(doc, {
      startY: 70,
      columns: tableColumns,
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 8.5,
        font: "helvetica",
        cellPadding: 4,
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 58, 138], // Navy Blue #1E3A8A
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        id: { fontStyle: "bold", textColor: [30, 58, 138], cellWidth: 28 },
        responderName: { fontStyle: "bold", cellWidth: 35 },
        type: { cellWidth: 32 },
        status: { fontStyle: "bold", cellWidth: 22 },
        dateTime: { cellWidth: 30 },
        location: { cellWidth: 43 },
      },
      didParseCell: (data) => {
        // Dynamic styling for status values
        if (data.section === "body" && data.column.dataKey === "status") {
          const val = data.cell.raw as string;
          if (val === "COMPLETED") {
            data.cell.styles.textColor = [22, 163, 74]; // Green-600
          } else if (val === "ONGOING") {
            data.cell.styles.textColor = [217, 119, 6]; // Yellow-600
          } else if (val === "RESPONDING") {
            data.cell.styles.textColor = [37, 99, 235]; // Blue-600
          }
        }
      },
      didDrawPage: (data) => {
        // Footer signature & Page numbers
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Gray-400
        
        // Footer divider
        doc.setDrawColor(229, 231, 235);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        // Footer text
        doc.text("CDRRMO Baliwag City DisasTRACE Platform - System Log", 14, pageHeight - 10);
        
        const pageText = `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`;
        doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 10);
      },
    });

    // --- Sign-off Section ---
    // Append at the bottom of the final page, or new page if tight space
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 25;
    }

    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text("Verified and Compiled By:", 14, finalY);
    doc.line(14, finalY + 15, 75, finalY + 15); // Signature Line
    doc.setFont("helvetica", "bold");
    doc.text("CDRRMO ADMINISTRATOR", 14, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Public Assistance and Command Center", 14, finalY + 24);

    doc.setFontSize(9);
    doc.text("Approved and Noted By:", 120, finalY);
    doc.line(120, finalY + 15, 185, finalY + 15); // Signature Line
    doc.setFont("helvetica", "bold");
    doc.text("LDRRMO IV", 120, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Baliwag Disaster Risk Reduction & Management Office", 120, finalY + 24);

    // Save the PDF
    const filename = `CDRRMO_IncidentReports_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    console.error("Failed to generate PDF summary:", error);
    throw error;
  }
}

/**
 * Exports a single highly detailed incident report as a beautifully designed PDF
 */
export async function exportSingleIncidentReportPDF(report: DetailedIncidentReport) {
  if (typeof window === "undefined") return;

  try {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // --- Header Section ---
    // Dark Navy Blue Accent
    doc.setFillColor(30, 58, 138); // #1E3A8A
    doc.rect(0, 0, pageWidth, 40, "F");

    // Red divider line
    doc.setFillColor(239, 68, 68); // #EF4444
    doc.rect(0, 40, pageWidth, 2, "F");

    // Headings
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("CDRRMO BALIWAG CITY", 14, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(147, 197, 253);
    doc.text("PACC - DISASTRACE EMERGENCY REPORTING SERVICES", 14, 21);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`OFFICIAL INCIDENT REPORT FILE: ${report.id}`, 14, 32);

    // Dynamic Status Badge in Header
    const statusText = report.status;
    doc.setFontSize(9);
    doc.setFillColor(statusText === "COMPLETED" ? 34 : 245, statusText === "COMPLETED" ? 197 : 158, statusText === "COMPLETED" ? 94 : 11); // Green vs Orange
    doc.rect(pageWidth - 45, 14, 31, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, pageWidth - 45 + 15.5 - doc.getTextWidth(statusText)/2, 19, { align: "left" });

    // --- Meta Details Grid (2-column layout) ---
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. BASIC INCIDENT INFORMATION", 14, 52);
    
    // Draw grid border box
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.rect(14, 56, pageWidth - 28, 48, "FD");

    doc.setTextColor(75, 85, 99); // Text Gray-600
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    // Left Column Info
    doc.setFont("helvetica", "bold").text("Incident Case ID:", 18, 63);
    doc.setFont("helvetica", "normal").text(report.id, 55, 63);

    doc.setFont("helvetica", "bold").text("Assigned Unit:", 18, 71);
    doc.setFont("helvetica", "normal").text(report.vehicleId || "AMB-001", 55, 71);

    doc.setFont("helvetica", "bold").text("Emergency Type:", 18, 79);
    doc.setFont("helvetica", "normal").text(report.type, 55, 79);

    doc.setFont("helvetica", "bold").text("Severity Level:", 18, 87);
    doc.setFont("helvetica", "normal").text(report.severityLevel || "Critical", 55, 87);

    doc.setFont("helvetica", "bold").text("People Involved:", 18, 95);
    doc.setFont("helvetica", "normal").text(`${report.peopleInvolved || 0} Person(s)`, 55, 95);

    // Right Column Info
    doc.setFont("helvetica", "bold").text("Dispatch Nature:", 110, 63);
    doc.setFont("helvetica", "normal").text(report.natureOfCall || "Emergency", 145, 63);

    doc.setFont("helvetica", "bold").text("Report Date:", 110, 71);
    doc.setFont("helvetica", "normal").text(report.date, 145, 71);

    doc.setFont("helvetica", "bold").text("Triage Time:", 110, 79);
    doc.setFont("helvetica", "normal").text(report.time, 145, 79);

    doc.setFont("helvetica", "bold").text("Location:", 110, 87);
    const locationLines = doc.splitTextToSize(report.location, pageWidth - 145 - 8);
    doc.setFont("helvetica", "normal").text(locationLines, 145, 87);

    // --- Section 2: Resident & Dispatch Triage Findings ---
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. INITIAL EMERGENCY DISPATCH CALL DETAILS", 14, 114);

    doc.setFillColor(255, 255, 255);
    doc.rect(14, 118, pageWidth - 28, 20, "D");
    doc.setTextColor(55, 65, 81); // Gray-700
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const residentDescLines = doc.splitTextToSize(
      report.residentReportDescription || "Emergency report filed by verified resident. Dispatch logs initiated automatically.",
      pageWidth - 36
    );
    doc.text(residentDescLines, 18, 124);

    // --- Section 3: Responder Clinical Findings & Notes ---
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("3. AMBULANCE CREW ACTUAL CLINICAL FINDINGS", 14, 148);

    doc.setFillColor(255, 255, 255);
    doc.rect(14, 152, pageWidth - 28, 28, "D");
    doc.setTextColor(55, 65, 81);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const crewFindingsLines = doc.splitTextToSize(
      report.crewFindings || "No clinical logs or responder findings recorded. Logged successfully in records.",
      pageWidth - 36
    );
    doc.text(crewFindingsLines, 18, 158);

    // --- Section 4: Patient Roster ---
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("4. PATIENT & PARTICIPANT ROSTER", 14, 190);

    const checkY = 194;
    // Patient columns headers
    doc.setFillColor(243, 244, 246); // Gray-100
    doc.rect(14, checkY, pageWidth - 28, 6, "F");
    doc.setDrawColor(229, 231, 235);
    doc.line(14, checkY + 6, pageWidth - 14, checkY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text("PATIENT FULL NAME", 18, checkY + 4);
    doc.text("CONTACT NUMBER", 80, checkY + 4);
    doc.text("CLINICAL TRIAGE STATUS", 140, checkY + 4);

    let currentY = checkY + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);

    const patients = report.participants && report.participants.length > 0
      ? report.participants 
      : [{ name: "Unavailable / Scene Clearance Completed", contact: "N/A", triageStatus: "Treated & Released" }];

    patients.forEach((p, idx) => {
      // Grid row dividers
      doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);
      
      doc.text(String(p.name || `Patient #${idx + 1}`), 18, currentY + 4.5);
      doc.text(String(p.contact || "N/A"), 80, currentY + 4.5);
      doc.setFont("helvetica", "bold");
      
      const tri = String(p.triageStatus || "Cleared");
      if (tri.toLowerCase().includes("critical") || tri.toLowerCase().includes("red")) {
        doc.setTextColor(239, 68, 68); // Red
      } else if (tri.toLowerCase().includes("stable") || tri.toLowerCase().includes("green")) {
        doc.setTextColor(34, 197, 94); // Green
      } else {
        doc.setTextColor(30, 58, 138); // Blue
      }
      doc.text(tri, 140, currentY + 4.5);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      currentY += 7;
    });

    // --- Section 5: Incident Timeline ---
    let timelineStartY = currentY + 12;
    if (timelineStartY + 40 > pageHeight) {
      doc.addPage();
      timelineStartY = 25;
    }

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("5. DISPATCH RESPONSE TIMELINE LOGS", 14, timelineStartY);

    let logY = timelineStartY + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128); // Gray-500

    const logs = report.logs && report.logs.length > 0 
      ? report.logs 
      : [
          { action: "Incident Dispatched", time: report.time },
          { action: "Ambulance Arrived at Scene", time: report.time },
          { action: "Emergency Treatment & Scene Resolved", time: report.time }
        ];

    logs.forEach((log) => {
      // Timeline bullet
      doc.setFillColor(30, 58, 138);
      doc.circle(18, logY + 3, 1, "F");
      doc.setDrawColor(229, 231, 235);
      // Vert line
      doc.line(18, logY + 4, 18, logY + 10);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(log.action, 24, logY + 4);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175);
      doc.text(log.time, 150, logY + 4);
      
      logY += 7;
    });

    // --- Section 6: Photos Evidence (Optional) ---
    let finalSignY = logY + 12;

    // A. Resident reported photo evidence
    if (report.residentPhotoUrl) {
      const base64Img = await getBase64ImageFromUrl(report.residentPhotoUrl);
      if (base64Img) {
        let photoY = finalSignY;
        if (photoY + 65 > pageHeight) {
          doc.addPage();
          photoY = 25;
        }
        
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("6. RESIDENT ATTACHED EMERGENCY PHOTO EVIDENCE", 14, photoY);

        try {
          doc.addImage(base64Img, "JPEG", 14, photoY + 4, 85, 52);
          finalSignY = photoY + 62;
        } catch (imgError) {
          console.error("Failed to add resident image to jsPDF:", imgError);
          finalSignY = photoY + 8;
        }
      }
    }

    // B. Crew clinical scene photos evidence
    if (report.scenePhotos && report.scenePhotos.length > 0) {
      // Find a clean spot for crew photos
      let photoY = finalSignY + 8;
      if (photoY + 65 > pageHeight) {
        doc.addPage();
        photoY = 25;
      }

      doc.setTextColor(30, 58, 138);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("7. CLINICAL CREW EMERGENCY SCENE PHOTOS", 14, photoY);

      let currentX = 14;
      let maxImageHeightOnRow = 0;
      
      // Limit to max 2 scene photos to avoid page overflows
      const photosToRender = report.scenePhotos.slice(0, 2);
      
      for (let idx = 0; idx < photosToRender.length; idx++) {
        const photo = photosToRender[idx];
        const base64Img = await getBase64ImageFromUrl(photo);
        if (base64Img) {
          try {
            doc.addImage(base64Img, "JPEG", currentX, photoY + 4, 85, 52);
            currentX += 92;
            maxImageHeightOnRow = 58;
          } catch (imgError) {
            console.error(`Failed to add crew scene photo #${idx + 1} to jsPDF:`, imgError);
          }
        }
      }
      
      finalSignY = photoY + 4 + maxImageHeightOnRow;
    }

    // --- Formal Signatures Block ---
    if (finalSignY + 35 > pageHeight) {
      doc.addPage();
      finalSignY = 25;
    }

    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Divider line before signatures
    doc.setDrawColor(229, 231, 235);
    doc.line(14, finalSignY, pageWidth - 14, finalSignY);
    
    const signatureY = finalSignY + 8;

    doc.text("Ambulance Primary Responder:", 14, signatureY);
    doc.line(14, signatureY + 12, 75, signatureY + 12);
    doc.setFont("helvetica", "bold");
    doc.text(report.responderName || "RENZY BASTES", 14, signatureY + 16);
    doc.setFont("helvetica", "normal");
    doc.text("Ambulance Crew Member", 14, signatureY + 20);

    doc.text("Attending PACC Officer:", 120, signatureY);
    doc.line(120, signatureY + 12, 185, signatureY + 12);
    doc.setFont("helvetica", "bold");
    doc.text("PACC EMERGENCY DISPATCHER", 120, signatureY + 16);
    doc.setFont("helvetica", "normal");
    doc.text("Baliwag Super Admin Control Division", 120, signatureY + 20);

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let pIndex = 1; pIndex <= totalPages; pIndex++) {
      doc.setPage(pIndex);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      doc.text("CDRRMO Baliwag City DisasTRACE - CONFIDENTIAL - EMERGENCY LOGS", 14, pageHeight - 8);
      doc.text(`Page ${pIndex} of ${totalPages}`, pageWidth - 28, pageHeight - 8);
    }

    doc.save(`CDRRMO_IncidentReport_${report.id}.pdf`);
    return true;
  } catch (error) {
    console.error("Failed to generate single report PDF:", error);
    throw error;
  }
}

/**
 * Exports a summary list of user accounts as a beautifully formatted PDF
 */
export async function exportUsersListPDF(
  users: UserManagementEntry[],
  filters: { search?: string; role?: string; status?: string } = {}
) {
  if (typeof window === "undefined") return;

  try {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // --- Branded Header Styles ---
    doc.setFillColor(30, 58, 138); // #1E3A8A Navy
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFillColor(239, 68, 68); // #EF4444 Red
    doc.rect(0, 40, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CDRRMO BALIWAG CITY", 14, 15);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(147, 197, 253); // text-blue-300
    doc.text("PUBLIC ASSISTANCE AND COMMAND CENTER (PACC)", 14, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("USER ACCOUNTS REGISTRY LOGS", 14, 32);

    // --- Document Meta Information ---
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    doc.setFont("helvetica", "bold");
    doc.text("DATE GENERATED:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }), 47, 52);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL USERS:", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`${users.length} Accounts Listed`, 47, 58);

    // Filters text
    const activeFilters = [];
    if (filters.search) activeFilters.push(`Search: "${filters.search}"`);
    if (filters.role) {
      const labels: Record<string, string> = {
        public_user: "PUBLIC USER",
        ambulance_responder: "RESPONDER",
        pacc_admin: "PACC ADMIN",
        cdrrmo_super_admin: "SUPER ADMIN",
      };
      activeFilters.push(`Role: ${labels[filters.role] || filters.role}`);
    }
    if (filters.status) activeFilters.push(`Status: ${filters.status}`);
    const filterText = activeFilters.length > 0 ? activeFilters.join(" | ") : "None";

    doc.setFont("helvetica", "bold");
    doc.text("FILTERS APPLIED:", 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(filterText, 154, 52);

    doc.setFont("helvetica", "bold");
    doc.text("REGISTRY TYPE:", 120, 58);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL REGISTERED USERS", 154, 58);

    // Divider line
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(14, 64, pageWidth - 14, 64);

    // --- Users Table ---
    const tableColumns = [
      { header: "FULL NAME", dataKey: "fullName" },
      { header: "EMAIL ADDRESS", dataKey: "email" },
      { header: "ROLE", dataKey: "role" },
      { header: "STATUS", dataKey: "status" },
      { header: "JOINED DATE", dataKey: "joinedDate" },
      { header: "LAST ACTIVE", dataKey: "lastActive" },
    ];

    const roleLabels: Record<string, string> = {
      public_user: "PUBLIC USER",
      ambulance_responder: "RESPONDER",
      pacc_admin: "PACC ADMIN",
      cdrrmo_super_admin: "SUPER ADMIN",
    };

    const tableRows = users.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      role: roleLabels[u.role] || u.role,
      status: u.status,
      joinedDate: u.joinedDate,
      lastActive: u.lastActive,
    }));

    autoTable(doc, {
      startY: 70,
      columns: tableColumns,
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 8.5,
        font: "helvetica",
        cellPadding: 4,
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 58, 138], // Navy Blue #1E3A8A
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        fullName: { fontStyle: "bold", cellWidth: 35 },
        email: { cellWidth: 45 },
        role: { cellWidth: 28 },
        status: { fontStyle: "bold", cellWidth: 24 },
        joinedDate: { cellWidth: 28 },
        lastActive: { cellWidth: 28 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.dataKey === "status") {
          const val = data.cell.raw as string;
          if (val === "ACTIVE") {
            data.cell.styles.textColor = [22, 163, 74]; // Green-600
          } else if (val === "SUSPENDED") {
            data.cell.styles.textColor = [217, 119, 6]; // Yellow-600
          } else if (val === "DEACTIVATED") {
            data.cell.styles.textColor = [220, 38, 38]; // Red-600
          }
        }
      },
      didDrawPage: (data) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Gray-400
        
        doc.setDrawColor(229, 231, 235);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        doc.text("CDRRMO Baliwag City DisasTRACE Platform - User Registry Log", 14, pageHeight - 10);
        
        const pageText = `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`;
        doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 10);
      },
    });

    // --- Sign-off Section ---
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 25;
    }

    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text("Verified and Compiled By:", 14, finalY);
    doc.line(14, finalY + 15, 75, finalY + 15);
    doc.setFont("helvetica", "bold");
    doc.text("CDRRMO ADMINISTRATOR", 14, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Public Assistance and Command Center", 14, finalY + 24);

    doc.setFontSize(9);
    doc.text("Approved and Noted By:", 120, finalY);
    doc.line(120, finalY + 15, 185, finalY + 15);
    doc.setFont("helvetica", "bold");
    doc.text("LDRRMO IV", 120, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Baliwag Disaster Risk Reduction & Management Office", 120, finalY + 24);

    const filename = `CDRRMO_UsersList_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    console.error("Failed to generate Users PDF:", error);
    throw error;
  }
}
