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
- **Hover States**: Subtle shadow increase and scale effect on dashboard cards.
- **Animations**: Smooth transitions for the "Welcome to DisasTRACE" login sequence and real-time ambulance tracking updates on the map.
