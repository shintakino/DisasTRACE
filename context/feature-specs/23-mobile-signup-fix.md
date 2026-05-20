# Feature Spec 23: Mobile Sign-Up Flow Fix

## Overview

This specification addresses all critical bugs, major issues, and minor code-quality problems identified during an audit of the mobile sign-up flow for both **Public User (Resident)** and **Ambulance Responder** roles. The current sign-up wizard (defined in Feature Spec 19) is structurally complete but contains dependency incompatibilities, storage misconfigurations, and data-handling errors that prevent the flow from completing successfully.

**Root Cause Summary:** The sign-up flow was built against Feature Spec 19 and Feature Spec 21 (CDRRMO ID Validation & Storage), but the implementation in `sign-up.tsx` drifted from the storage utility established in Spec 21. Additionally, a Zod major-version upgrade introduced an incompatibility with the form validation resolver.

---

## Problem Analysis

### 🔴 Critical Issues

#### C1. Zod v4 Incompatible with `zodResolver`

| Detail | Value |
|--------|-------|
| **Files** | `package.json`, all Step components (`Step1–4.tsx`), `schemas/auth.ts` |
| **Installed** | `zod@4.4.3` (Zod v4), `@hookform/resolvers@5.2.2` |
| **Problem** | `zodResolver` from `@hookform/resolvers` does not officially support Zod v4. Zod v4 changed its internal type structures, causing TypeScript compilation errors and potential runtime validation failures when used with the v3-targeted resolver. |
| **Impact** | Every form step calls `zodResolver(Schema)`. If the resolver silently fails or throws, users **cannot advance through any step** of the sign-up wizard. |

#### C2. Wrong Storage Bucket Name

| Detail | Value |
|--------|-------|
| **File** | `mobile/app/(auth)/sign-up.tsx` — lines 76, 86 |
| **Problem** | The inline upload code references bucket `'ids'`, but the actual Supabase bucket is `'user-ids'` (created in `db/storage-setup.sql`, used correctly in `mobile/lib/storage.ts`). |
| **Impact** | Every ID card upload fails with a "bucket not found" error. User profiles are created in Supabase Auth, but without the government ID — making CDRRMO Super Admin verification impossible. |

#### C3. Inline Upload Ignores Existing `lib/storage.ts` Utility

| Detail | Value |
|--------|-------|
| **Files** | `mobile/app/(auth)/sign-up.tsx` (lines 67–103) vs `mobile/lib/storage.ts` |
| **Problem** | `sign-up.tsx` contains its own file upload implementation that (a) uses the wrong bucket name, (b) uses the wrong file path pattern (`${userId}/${timestamp}.ext` instead of `ids/${userId}/id-card.png`), and (c) does not use the `base64-arraybuffer` approach proven in `lib/storage.ts`. The RLS policy requires `(storage.foldername(name))[1] = 'ids'`, so the inline path pattern would be **denied by RLS** even if the bucket name were correct. |
| **Impact** | Double failure: wrong bucket + wrong path = upload always fails. |

### 🟠 Major Issues

#### M1. `getPublicUrl` Called on a Private Bucket

| Detail | Value |
|--------|-------|
| **File** | `mobile/app/(auth)/sign-up.tsx` — lines 85–87 |
| **Problem** | After upload, the code calls `getPublicUrl()` and saves the resulting URL to the `id_image_url` column. The `user-ids` bucket is **private** (`public: false`). Public URLs for private buckets return a URL that serves a `400 Bad Request`. |
| **Impact** | The stored `id_image_url` in the `users` table would be a broken/unusable URL. The CDRRMO admin portal in Spec 21 correctly uses `createSignedUrl()` for the review workflow, so storing the file path (not URL) is the correct approach. |

#### M2. Verification Status Case Mismatch in Fallback Path

| Detail | Value |
|--------|-------|
| **File** | `mobile/hooks/use-auth-status.ts` — line 58–59 |
| **Problem** | The API-based path works correctly (`.toLowerCase()` on line 47 normalizes the uppercase DB value). But the **fallback path** (when the API call fails) reads `app_metadata.verification_status` which contains the raw uppercase value (`'PENDING'`, `'APPROVED'`, `'REJECTED'`) and does **not** normalize it. The routing logic in `_layout.tsx` compares against lowercase values. |
| **Impact** | If the Next.js API is unreachable (network error, wrong `MOBILE_API_URL`), approved users would be stuck on the "Pending Verification" screen because `'APPROVED' !== 'approved'`. |

### 🟡 Minor Issues

#### N1. Unused `initialRole` Variable

| Detail | Value |
|--------|-------|
| **File** | `mobile/app/(auth)/sign-up.tsx` — line 19 |
| **Problem** | `const initialRole = role;` is declared but never referenced. |
| **Impact** | Dead code. No functional impact. |

---

## Requirements

### 1. Downgrade Zod to v3 (Fixes C1)

Downgrade `zod` from `4.4.3` to the latest stable v3 release (`^3.23.8`). This restores compatibility with `@hookform/resolvers/zod`'s `zodResolver`.

**Rationale:** The alternative — switching to `standardSchemaResolver` — would require changing every form step and is less battle-tested. Downgrading Zod is the lowest-risk fix.

**Scope of impact:**
- `mobile/package.json` — change `zod` version.
- `mobile/schemas/auth.ts` — **no changes needed**. All schemas (`z.object`, `z.string`, `z.enum`, `.refine`) are Zod v3-compatible.
- `mobile/hooks/use-auth-status.ts` — `z.enum` usage is v3-compatible.
- Run `npm install` to regenerate `package-lock.json`.

### 2. Replace Inline Upload with `uploadGovernmentID()` (Fixes C2, C3, M1)

Refactor the `handleRegister()` function in `sign-up.tsx` to:

1. **Remove** the entire inline upload block (lines 67–103).
2. **Import and call** `uploadGovernmentID(userId, currentData.idCardUri)` from `mobile/lib/storage.ts`.
3. **Store the returned file path** (not a public URL) in the `id_image_url` column:

```typescript
// After supabase.auth.signUp() succeeds:
if (currentData.idCardUri) {
  try {
    const filePath = await uploadGovernmentID(userId, currentData.idCardUri);

    await supabase
      .from('users')
      .update({
        id_image_url: filePath,       // Store path, not public URL
        id_type: currentData.idCardType,
        address: `${currentData.street}, ${currentData.barangay}, ${currentData.city}, ${currentData.province}`,
        phone: currentData.mobileNumber,
      })
      .eq('id', userId);
  } catch (uploadErr) {
    console.error('Error handling ID upload:', uploadErr);
    // Registration still succeeds — user can re-upload later
  }
}
```

4. **Remove** the `import { File } from 'expo-file-system';` import (no longer needed).

This aligns the sign-up flow with the storage architecture established in Feature Spec 21.

### 3. Normalize Verification Status Fallback (Fixes M2)

In `mobile/hooks/use-auth-status.ts`, normalize the fallback `app_metadata` value to lowercase before assigning:

```typescript
// Before (line 58-59):
const metaStatus = currentUser.app_metadata?.verification_status as VerificationStatus | undefined;
setVerificationStatus(metaStatus || 'pending');

// After:
const metaStatus = currentUser.app_metadata?.verification_status;
const normalizedStatus = typeof metaStatus === 'string'
  ? metaStatus.toLowerCase() as VerificationStatus
  : undefined;
setVerificationStatus(normalizedStatus || 'pending');
```

### 4. Remove Dead Code (Fixes N1)

In `mobile/app/(auth)/sign-up.tsx`, remove the unused variable:

```diff
-  const initialRole = role;
```

---

## Files Changed

| File | Action | Reason |
|------|--------|--------|
| `mobile/package.json` | MODIFY | Downgrade `zod` from `^4.4.3` to `^3.23.8` |
| `mobile/package-lock.json` | REGENERATE | `npm install` after zod downgrade |
| `mobile/app/(auth)/sign-up.tsx` | MODIFY | Replace inline upload with `uploadGovernmentID()`, remove `File` import, remove unused `initialRole` |
| `mobile/hooks/use-auth-status.ts` | MODIFY | Normalize fallback verification status to lowercase |

---

## Verification Criteria

- [ ] `npm install` in `mobile/` completes without errors after zod downgrade.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with no type errors in `schemas/auth.ts`, all Step components, and `use-auth-status.ts`.
- [ ] **Resident sign-up flow**: All 4 steps complete without form validation errors. ID card is uploaded to the `user-ids` bucket under path `ids/{userId}/id-card.png`. User profile is created with `verification_status: PENDING` and the file path stored in `id_image_url`.
- [ ] **Responder sign-up flow**: Same as Resident, with `role: ambulance_responder` propagated to `public.users` and `auth.users.raw_user_meta_data`.
- [ ] After sign-up, the success modal displays and the user is redirected to the Sign In screen.
- [ ] After sign-in, the user is routed to the "Pending Verification" screen.
- [ ] Fallback verification status path (when API is unreachable) correctly handles uppercase `APPROVED`/`PENDING`/`REJECTED` values from `app_metadata`.
- [ ] No dead code (`initialRole`, `File` import) remains in `sign-up.tsx`.
