# Guest and Chatbot Emergency Intake

## Purpose

Allow a person facing an emergency to start a report without an account, while
keeping account verification in place for all non-emergency app access.

## Shared intake

Guests use the conversational intake. Approved residents have two explicitly
separate reporting choices: **HELP** opens the direct camera/form path, while
**Emergency Chatbot** opens the conversational intake. The chatbot collects a
contact number, GPS coordinates plus a written location, what happened, people
affected, victim condition, and an optional photo/evidence attachment. Follow-up
questions are selected from the stated incident type; the conversation never
requires evidence before an emergency can be submitted.

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

## Agency coordination status

PACC can record one or more agencies being coordinated for any report, including
PNP, BFP, CDRRMO, Barangay, DSWD, and Hospital. The reporting device subscribes
to the report and incident records. It renders the current message from those
records: for example, `Coordinating with PNP and BFP`, followed by `Responders
are on the way` after an ambulance responder is assigned or en route. This is
coordination visibility only; the existing automated dispatch engine remains
limited to ambulance responders.
