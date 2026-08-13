# Guest and Chatbot Emergency Intake

## Purpose

Allow a person facing an emergency to start a report without an account, while
keeping account verification in place for all non-emergency app access.

## Shared intake

Guests use the conversational intake. Approved residents have two explicitly
separate reporting choices: **HELP** opens the direct camera/form path, while
**Emergency Chatbot** opens the conversational intake. Guests provide a valid
Philippine mobile contact number. Registered residents skip that question: the
server uses their verified account number. The chatbot collects automatic GPS
coordinates plus a nearby landmark/reference (not a full address), what
happened, the exact number of people affected, victim condition, and a required
photo/evidence attachment. It automatically requests the device's current
location when the bot opens for both guests and registered residents; location
permission and a GPS capture are required to continue.
Follow-up questions are selected from the stated incident type.

The mobile presentation is a compact, step-by-step emergency conversation: a
bot prompt is followed by a single focused response card, red response and
emergency accents, captured GPS/evidence cards, progress indicators, and a
separate review-and-submit summary. This presentation is shared by guest and
registered-resident chatbot reporting; it does not replace the resident HELP
camera/form flow. Required steps show immediate, specific validation guidance;
the user can attach required evidence with either the camera or photo library.
GPS outside the Baliwag service area is visibly warned but remains submittable
for PACC coordination rather than silently blocking a person in need.

Before submission, chatbot evidence is sent to the server-mediated emergency-intake
evidence API rather than directly from a guest device to Supabase Storage. The
API accepts only JPEG, PNG, or WebP images up to 5MB and returns the stored
public URL for the report.

## Initial triage

The API records an auditable, deterministic classification and its reasons:

- `HIGH_CONFIDENCE_EMERGENCY`: complete emergency report, valid Baliwag GPS,
  consistent incident answers, and no nearby recent duplicate. The normal
  ambulance dispatch engine is started.
- `HIGH_CONFIDENCE_NON_EMERGENCY`: complete non-emergency report. It remains
  visible to PACC for coordination and is never emergency-dispatched.
- `UNCERTAIN_INCOMPLETE`: missing/invalid/contradictory details. PACC reviews it.
- `SUSPICIOUS_POSSIBLE_PRANK`: a nearby recent duplicate or a repeat-pattern
  signal. PACC reviews it before dispatch.

The triage result is an initial recommendation, not a replacement for human
judgment. PACC can override it, and the original assessment/reasons remain on
the record.

## Guest privacy and status

Guest reports have no user account or resident foreign key. A random per-report
access token is returned only to the submitting device and authorizes that device
to read its response status and the responder's safe live-tracking details. After
a responder is assigned, guests can open the same live ambulance map/tracker as
registered residents without gaining access to any other protected data.

## PACC queue

The queue is grouped into **For Action** (both high-confidence emergency and
non-emergency) and **For Review** (uncertain or suspicious). Existing verified,
rejected, and duplicate outcomes remain available as operational states.

PACC has the same reject, manual-dispatch, and duplicate-merge controls for
guest and registered reports. Merging a duplicate marks it `DUPLICATE` and
removes it from the active PACC queues.

## CDRRMO Super Admin report separation

In **User Submitted Reports**, the CDRRMO Super Admin can switch between **All
Reports**, **Registered Residents**, and **Guest Reports**. The selection is
enforced by the report API using the recorded reporter type, so the table,
count, and PDF summary export all cover only the selected report source. Guest
reports remain incident-linked and never imply a registered resident account.

## Agency coordination status

PACC can record one or more agencies being coordinated for any report, including
PNP, BFP, CDRRMO, Barangay, DSWD, and Hospital. The reporting device subscribes
to the report and incident records. It renders the current message from those
records: for example, `Coordinating with PNP and BFP`, followed by `Responders
are on the way` after an ambulance responder is assigned or en route. This is
coordination visibility only; the existing automated dispatch engine remains
limited to ambulance responders.
