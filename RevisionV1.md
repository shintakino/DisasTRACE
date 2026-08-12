# DisasTRACE Revision V1: Emergency Reporting Scenarios

This document describes the current guest, registered resident, PACC, responder,
coordination, map, and report-export workflows.

## 1. Guest emergency workflow

```text
Login as Guest
→ Emergency Chatbot
→ Automated initial triage
→ Dispatch or PACC review
→ Emergency Response Status
→ Live Ambulance Map once a responder is assigned
```

A guest does not need an account, registration, OTP, or account approval to
submit an emergency report. The guest uses only the emergency flow and cannot
open resident tabs, profile, report history, or other protected features.

### Chatbot information collection

The guided chatbot collects:

1. Contact number
2. Emergency or non-emergency nature
3. Incident type
4. Number of people affected
5. Victim or scene condition
6. GPS location and written landmark/address
7. Optional photo/evidence

### Guest triage scenarios

| Situation | Initial classification | Outcome |
| --- | --- | --- |
| Complete emergency report, valid Baliwag GPS, consistent answers, no duplicate | High-confidence emergency | The ambulance dispatch engine starts. |
| Complete non-emergency report | High-confidence non-emergency | PACC coordinates appropriate handling; there is no automatic ambulance dispatch. |
| Missing GPS, unclear answers, or conflicting details | Uncertain/incomplete | PACC reviews before deciding. |
| Nearby similar report within 20 minutes or repeated recent contact | Suspicious/possible prank | PACC reviews, rejects, or merges the duplicate. |
| No responder available after an actionable emergency | For Action | PACC manually coordinates or assigns a responder. |

### Guest response status and map

After a responder is assigned, a guest sees the same live ambulance tracker as
a registered resident. The guest receives safe responder tracking data through
the report access token and follows the existing live telemetry channel.

The screen shows a live response card below the map. Its message is derived
from PACC coordination and the actual incident state, for example:

- `Coordinating with PNP`
- `Coordinating with PNP and BFP`
- `Coordinating with PNP and BFP. Responders are on the way. Please remain available for further instructions.`
- `Responders have arrived at your location.`

## 2. Registered resident workflow

```text
Approved resident logs in
→ Taps HELP
→ Emergency Chatbot
→ Automated initial triage
→ Dispatch or PACC review
→ Emergency Response Status and Live Map
```

The registered resident uses the same chatbot, triage checks, classifications,
agency coordination messages, response-status screen, and live map as a guest.

| Account state | Result |
| --- | --- |
| Approved and active | Can use HELP and submit a report. |
| Pending approval | Blocked by the verification gate. |
| Rejected, suspended, or deactivated | Blocked. |
| Logged out during an emergency | Can use Login as Guest. |

## 3. PACC workflow

PACC receives reports in two main queue sections.

### For Action

Contains:

- High-confidence emergencies
- High-confidence non-emergencies
- Actionable emergencies where no responder was secured automatically

PACC can review the chatbot answers, GPS, evidence, contact number, triage
reasons, and incident history. PACC can select a responder manually and override
the automated classification when human judgment differs.

### For Review

Contains:

- Uncertain/incomplete reports
- Suspicious/possible prank reports
- Conflicting or duplicate-looking reports

PACC can review the report, change its classification, reject it, merge it with
an existing emergency, or treat it as actionable after human verification.

### Agency coordination

PACC can record one or more agencies actively being coordinated:

- PNP
- BFP
- CDRRMO
- Barangay
- DSWD
- Hospital

These PACC selections update the resident and guest status screens in real time.
For example:

```text
PACC selects PNP
→ Coordinating with PNP

PACC adds BFP
→ Coordinating with PNP and BFP

Ambulance responder is assigned or en route
→ Coordinating with PNP and BFP. Responders are on the way.
```

### PACC and CDRRMO web maps

Both registered and guest reports appear in the protected realtime map feed.
Guest reports are labelled **Guest Reporter** and include the submitted callback
number, incident type, severity, location, and dispatch state. After dispatch,
the dashboard follows the ambulance telemetry in real time.

## 4. Responder workflow

The responder workflow is incident-based, not account-type-based. A guest
incident and a registered-resident incident follow the same responder process.

```text
Responder receives dispatch
→ Accepts
→ En route
→ Arrives at scene
→ Selects outcome
→ Completes incident report, PCR, and trip ticket
→ Incident resolved
```

On arrival, an active ambulance responder has three outcome options:

1. **Handled on Scene**
2. **Transport to Hospital**
3. **Patient Refused / Other**

The reporting guest or resident sees arrival and subsequent response progress on
the tracker, but does not select the responder outcome.

## 5. CDRRMO report and export workflow

An active ambulance responder can create the normal incident report, patient
care report (PCR), and driver trip ticket for either a guest or a registered
resident because these records are linked to the dispatched incident.

CDRRMO can view and export the completed report, including responder findings,
PCR, trip ticket, scene photos, and timestamps.

For guest reports, the exported details show:

- Reporter: **Guest Reporter**
- Callback number: the number supplied in the chatbot
- Address: `Guest report — no home address collected`

For registered residents, the export uses the available resident account details.

## 6. Scope boundary

The system automatically dispatches ambulance responders only. PNP, BFP,
hospital, and other agencies are currently PACC-recorded coordination actions:
they are visible in realtime to the reporter and dashboard, but the app does not
directly dispatch external agency units.
