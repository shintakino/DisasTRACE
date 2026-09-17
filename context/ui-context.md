# UI Context

## Brand Identity
- **Primary Color**: #1E3A8A (Navy Blue) - Sidebar background, headers, primary buttons.
- **Secondary Color**: #EF4444 (Red) - Logo accent ("DISAS"), critical alerts, and urgent status.
- **Background**: #F3F4F6 (Light Grey) - General page background for both web and mobile.
- **Surface**: #FFFFFF (White) - Cards, modals, and input fields.

## Status Colors
- **Success**: #22C55E (Green) - Resolved incidents and active responder status.
- **Warning**: #F97316 (Orange) - Pending incidents and average response indicators.
- **Info**: #3B82F6 (Blue) - General incident counts and informational badges.
- **Error**: #EF4444 (Red) - Critical incident markers and urgent system alerts.

## Typography
- **Font Family**: Sans-serif (Inter preferred).
- **Headings**: Bold, Primary Navy Blue.
- **Body Text**: Regular, Dark Grey (#4B5563).
- **Dashboard Stats**: Large, Extra Bold numbers for high-visibility metrics.
- **Operational Text**: Critical labels, times, locations, and status metadata use at least 12px; 9–10px text is reserved for nonessential decoration only.

## Operational Hierarchy and Feedback

- Command surfaces designate at most one item as **Priority now**. Actionable work precedes terminal history; severity, reassignment need, and recency determine prominence. Other records remain readable but visually quieter.
- Red and persistent animation are reserved for the single most urgent actionable state. Secondary cards use neutral surfaces and status accents so multiple incidents do not compete equally.
- Incident essentials (severity, type, location, affected people, current status, and recommended next action) appear before evidence, automation metadata, or reporter history.
- Every major workflow action provides persistent, accessible feedback with four parts: what is happening or happened, the server-confirmed result, what happens next, and what the user should do. Errors retain the server reason and a retry/refresh path.
- Mobile status views retain the last confirmed report state during a weak-network refresh failure, mark it as stale, and provide Retry. Locally queued responder work uses amber/pending language and must never look server-confirmed.
- A dispatch offer awaiting acceptance is shown in a separate, read-only **Awaiting Responder** lane with its deadline; it does not block the PACC operator or look like a completed dispatch.
- Mobile sign-up provides an inspectable Data Privacy Policy before its required consent control. Registration stays visibly disabled until the form and consent are valid.
- Use the same Guest Mode allowance banner on pending review, active response, resolution, and device-local history so a direct dispatch never skips the remaining-count reminder.

## Design Tokens
- **Border Radius**:
  - Cards & Modals: 12px.
  - Buttons & Inputs: 8px.
- **Shadows**: Subtle elevation (shadow-sm) on cards to distinguish from background.
- **Spacing**: 16px (4 units) or 24px (6 units) standard padding for container elements.

## Components
- **Sidebar (Web)**: Fixed left sidebar in dark navy, containing Vuesax Bold icons for navigation.
- **Navigation Bar (Mobile)**: Bottom tab bar with labels and icons for easy thumb access.
- **Dashboard Cards**: White background, 12px radius, containing stat icons, labels, and large metrics.
- **Charts**: 
  - Bar Charts: Multi-colored stacked bars for incident summaries.
  - Pie Charts: Legend-based distribution for incident types.

## Icons (Vuesax Bold)
- Dashboard: `category`
- Map: `map`
- Reports: `document-text`
- Logs/Status: `folder-open`
- Users: `people`
- Profile: `user-tick`

## Interactions
- **Hover States**: Subtle shadow or border changes on dashboard cards; avoid scale motion on dense operational grids.
- **Animations**: Smooth transitions for the "Welcome to DisasTRACE" login sequence and real-time ambulance tracking updates on the map.
