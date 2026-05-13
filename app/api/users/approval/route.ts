import { NextResponse } from "next/server";
import { Applicant } from "@/types/approval";

const mockApplicants: Applicant[] = [
  {
    id: "user_1",
    fullName: "Juan Dela Cruz",
    email: "juan.dc@example.com",
    phone: "09123456789",
    address: "123 Street, Baliwag, Bulacan",
    roleRequested: "public_user",
    status: "PENDING",
    identityDocument: {
      type: "National ID",
      imageUrl: "https://placehold.co/600x400/1e3a8a/white?text=National+ID+Juan+Dela+Cruz",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "user_2",
    fullName: "Maria Clara",
    email: "maria.clara@example.com",
    phone: "09987654321",
    address: "456 Avenue, Baliwag, Bulacan",
    roleRequested: "ambulance_responder",
    status: "PENDING",
    identityDocument: {
      type: "Driver's License",
      imageUrl: "https://placehold.co/600x400/1e3a8a/white?text=Driver+License+Maria+Clara",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    },
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "user_3",
    fullName: "Jose Rizal",
    email: "jose.rizal@example.com",
    phone: "09223334455",
    address: "789 Blvd, Baliwag, Bulacan",
    roleRequested: "public_user",
    status: "PENDING",
    identityDocument: {
      type: "Passport",
      imageUrl: "https://placehold.co/600x400/1e3a8a/white?text=Passport+Jose+Rizal",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    },
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export async function GET() {
  // In a real app, we would check for pacc_admin or cdrrmo_super_admin role here
  // const { sessionClaims } = await auth();
  // if (sessionClaims?.metadata.role !== 'pacc_admin' && sessionClaims?.metadata.role !== 'cdrrmo_super_admin') {
  //   return new NextResponse("Unauthorized", { status: 403 });
  // }

  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    applicants: mockApplicants,
    summary: {
      pending: mockApplicants.length,
      reviewedToday: 12, // Mocked value
    },
  });
}
