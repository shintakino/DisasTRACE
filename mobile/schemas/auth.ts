import { z } from "zod";

// Step 1 Schema
export const PersonalInfoSchema = z.object({
  firstName: z.string().min(2, "First name is required").transform(v => v.toUpperCase()),
  middleName: z.string().optional().transform(v => v?.toUpperCase()),
  lastName: z.string().min(2, "Surname is required").transform(v => v.toUpperCase()),
  suffix: z.string().optional().transform(v => v?.toUpperCase()),
  gender: z.enum(["Male", "Female"]),
});
export type PersonalInfoType = z.infer<typeof PersonalInfoSchema>;

// Step 2 Schema
export const ContactDetailsSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  mobileNumber: z.string().regex(/^(09)\d{9}$/, "Invalid Philippine mobile number (e.g. 09123456789)"),
  province: z.string().min(2, "Province is required").transform(v => v.toUpperCase()),
  city: z.string().min(2, "City/Municipality is required").transform(v => v.toUpperCase()),
  barangay: z.string().min(2, "Barangay is required").transform(v => v.toUpperCase()),
  street: z.string().min(2, "Street/House No. is required").transform(v => v.toUpperCase()),
});
export type ContactDetailsType = z.infer<typeof ContactDetailsSchema>;

// Step 3 Schema
export const VerificationSchema = z.object({
  idCardUri: z.string().min(1, "Identification card image is required"),
  idCardType: z.string().min(1, "ID type is required"),
  role: z.enum(["public_user", "ambulance_responder"]),
});
export type VerificationType = z.infer<typeof VerificationSchema>;

// Step 4 Schema
export const PasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type PasswordType = z.infer<typeof PasswordSchema>;

// Combined Sign Up Payload
export const SignUpPayloadSchema = PersonalInfoSchema
  .and(ContactDetailsSchema)
  .and(VerificationSchema)
  .and(PasswordSchema);
export type SignUpPayloadType = z.infer<typeof SignUpPayloadSchema>;

// Login Schema
export const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or Mobile is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginType = z.infer<typeof LoginSchema>;
