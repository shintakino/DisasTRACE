Read `AGENTS.md` and `context/ui-context.md` before starting.

We're adding the design system and UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn components:

---
title: Components
description: Here you can find all the components available in the library. We are working on adding more components.
---

- [Alert](https://ui.shadcn.com/docs/components/alert): Displays a callout for user attention.
- [Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog): A modal dialog that interrupts the user with important content and expects a response.
- [Avatar](https://ui.shadcn.com/docs/components/avatar): An image element with a fallback for representing the user.
- [Badge](https://ui.shadcn.com/docs/components/badge): Displays a badge or a component that looks like a badge.
- [Breadcrumb](https://ui.shadcn.com/docs/components/breadcrumb): Displays the path to the current resource using a hierarchy of links.
- [Button](https://ui.shadcn.com/docs/components/button): Displays a button or a component that looks like a button.
- [Calendar](https://ui.shadcn.com/docs/components/calendar): A calendar component that allows users to select a date or a range of dates.
- [Card](https://ui.shadcn.com/docs/components/card): Displays a card with header, content, and footer.
- [Chart](https://ui.shadcn.com/docs/components/chart): Beautiful charts. Built using Recharts. Copy and paste into your apps.
- [Checkbox](https://ui.shadcn.com/docs/components/checkbox): A control that allows the user to toggle between checked and not checked.
- [Command](https://ui.shadcn.com/docs/components/command): Command menu for search and quick actions.
- [Data Table](https://ui.shadcn.com/docs/components/data-table): Powerful table and datagrids built using TanStack Table.
- [Date Picker](https://ui.shadcn.com/docs/components/date-picker): A date picker component with range and presets.
- [Dialog](https://ui.shadcn.com/docs/components/dialog): A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
- [Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu): Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- [Empty](https://ui.shadcn.com/docs/components/empty): Use the Empty component to display an empty state.
- [Input](https://ui.shadcn.com/docs/components/input): A text input component for forms and user data entry.
- [Label](https://ui.shadcn.com/docs/components/label): Renders an accessible label associated with controls.
- [Pagination](https://ui.shadcn.com/docs/components/pagination): Pagination with page navigation, next and previous links.
- [Popover](https://ui.shadcn.com/docs/components/popover): Displays rich content in a portal, triggered by a button.
- [Scroll Area](https://ui.shadcn.com/docs/components/scroll-area): Augments native scroll functionality for custom, cross-browser styling.
- [Select](https://ui.shadcn.com/docs/components/select): Displays a list of options for the user to pick from—triggered by a button.
- [Separator](https://ui.shadcn.com/docs/components/separator): Visually or semantically separates content.
- [Sheet](https://ui.shadcn.com/docs/components/sheet): Extends the Dialog component to display content that complements the main content of the screen.
- [Sidebar](https://ui.shadcn.com/docs/components/sidebar): A composable, themeable and customizable sidebar component.
- [Skeleton](https://ui.shadcn.com/docs/components/skeleton): Use to show a placeholder while content is loading.
- [Sonner](https://ui.shadcn.com/docs/components/sonner): An opinionated toast component for React.
- [Spinner](https://ui.shadcn.com/docs/components/spinner): An indicator that can be used to show a loading state.
- [Table](https://ui.shadcn.com/docs/components/table): A responsive table component.
- [Tabs](https://ui.shadcn.com/docs/components/tabs): A set of layered sections of content—known as tab panels—that are displayed one at a time.
- [Textarea](https://ui.shadcn.com/docs/components/textarea): Displays a form textarea or a component that looks like a textarea.
- [Tooltip](https://ui.shadcn.com/docs/components/tooltip): A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.

---

Do not modify the generated `components/ui/*` files after installation.

Also Install `lucide-react`.

Create `lib/utils.ts` with a reusable `cn()` helper for merging Tailwind classes.

Ensure all components match the existing dark theme in `globals.css`.

### Check when done

- All components import without errors
- `cn()` works properly
- No default light styling appears
