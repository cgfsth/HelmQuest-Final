# Tasks: Instructor Dashboard Responsive Design

## Phase 1: Foundation and Setup

### 1.1 Setup Responsive Infrastructure
- [ ] Add viewport meta tag to index.html: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] Define CSS custom properties for breakpoint values in App.vue
- [ ] Create responsive utilities section in styles
- [ ] Add base mobile-first styles reset

**Acceptance Criteria**: Viewport is configured, breakpoint variables are defined and documented

**Depends on**: None

---

### 1.2 Implement Base Responsive Container
- [ ] Update `.missions-hub` class with CSS Grid responsive columns
- [ ] Add media queries for tablet (768px-1919px) and mobile (<768px) breakpoints
- [ ] Implement grid-template-columns transitions between breakpoints
- [ ] Test container adapts correctly at each breakpoint

**Acceptance Criteria**: Dashboard container uses CSS Grid and adapts layout at defined breakpoints (Requirements 1.1, 1.2, 1.3, 10.3)

**Depends on**: Task 1.1

---

## Phase 2: Sidebar Navigation Responsiveness

### 2.1 Desktop Sidebar Styles
- [ ] Ensure `.hub-sidebar` is fixed at 280px width on desktop (≥1920px)
- [ ] Verify sidebar is sticky and visible by default
- [ ] Test sidebar navigation items display correctly

**Acceptance Criteria**: Sidebar displays at 280px width on desktop screens (Requirements 2.1)

**Depends on**: Task 1.2

---

### 2.2 Tablet Sidebar Implementation
- [ ] Add tablet media query (768px-1919px) for sidebar with 240px width
- [ ] Implement collapsible sidebar functionality
- [ ] Add collapse toggle button (visible on tablet only)
- [ ] Implement `.hub-sidebar--collapsed` state styling
- [ ] Add CSS transitions for smooth collapse/expand animation

**Acceptance Criteria**: Sidebar is collapsible on tablet with smooth animation and 240px default width (Requirements 2.2, 2.4, 15.2)

**Depends on**: Task 2.1

---

### 2.3 Mobile Off-Canvas Sidebar
- [ ] Add mobile media query (<768px) for sidebar
- [ ] Position sidebar as fixed off-canvas (translateX(-100%))
- [ ] Create hamburger menu button in header
- [ ] Implement `.hub-sidebar--open` state (translateX(0))
- [ ] Add backdrop overlay when sidebar is open
- [ ] Implement touch-friendly close button
- [ ] Add sidebar z-index (1000) and backdrop styling

**Acceptance Criteria**: Sidebar transforms to off-canvas menu on mobile with overlay backdrop (Requirements 2.3, 2.5, 2.6)

**Depends on**: Task 2.2

---

### 2.4 Sidebar Navigation Accessibility
- [ ] Add keyboard navigation support (Tab, Escape to close)
- [ ] Implement ARIA attributes (aria-expanded, aria-controls)
- [ ] Add screen reader announcements for sidebar state changes
- [ ] Test focus management when opening/closing sidebar

**Acceptance Criteria**: Sidebar is fully keyboard accessible and screen reader compatible (Requirements 17.3, 17.4, 17.5)

**Depends on**: Task 2.3

---

## Phase 3: Statistics Cards Grid Responsiveness

### 3.1 Desktop Statistics Grid
- [ ] Verify `.instructor-stats-grid` uses 3-column layout on desktop
- [ ] Ensure 14px gap between cards
- [ ] Test all three stat cards (Total Students, Enrolled Students, Average Score) display correctly

**Acceptance Criteria**: Statistics grid displays 3 columns on desktop with proper spacing (Requirements 3.1, 3.5)

**Depends on**: Task 1.2

---

### 3.2 Tablet Statistics Grid
- [ ] Add media query for tablet (768px-1199px)
- [ ] Change grid to 2 columns: `grid-template-columns: repeat(2, minmax(0, 1fr))`
- [ ] Maintain 14px gap
- [ ] Test card layout at boundary widths (768px, 1199px)

**Acceptance Criteria**: Statistics grid displays 2 columns on tablet screens (Requirements 3.2, 3.5)

**Depends on**: Task 3.1

---

### 3.3 Mobile Statistics Grid
- [ ] Add mobile media query (<768px)
- [ ] Change grid to single column: `grid-template-columns: 1fr`
- [ ] Reduce gap to 12px
- [ ] Update card padding to 16px on mobile
- [ ] Test font sizes remain readable

**Acceptance Criteria**: Statistics grid displays 1 column on mobile with reduced spacing (Requirements 3.3, 3.4, 3.5, 22.1, 22.2)

**Depends on**: Task 3.2

---

## Phase 4: Level Completion Cards Responsiveness

### 4.1 Responsive Level Cards Grid
- [ ] Update `.instructor-level-completion` to use auto-fit: `repeat(auto-fit, minmax(220px, 1fr))`
- [ ] Ensure 14px gap on desktop/tablet
- [ ] Test cards wrap correctly at various widths

**Acceptance Criteria**: Level cards grid uses auto-fit with 220px minimum width (Requirements 4.1, 4.4)

**Depends on**: Task 1.2

---

### 4.2 Mobile Level Cards
- [ ] Add mobile media query (<768px)
- [ ] Force single column: `grid-template-columns: 1fr`
- [ ] Reduce gap to 12px
- [ ] Verify progress bars, badges, and captions remain visible
- [ ] Test touch interaction on cards

**Acceptance Criteria**: Level cards display in single column on mobile with all content visible (Requirements 4.2, 4.3, 4.4)

**Depends on**: Task 4.1

---

## Phase 5: Students Table Responsiveness

### 5.1 Desktop Students Table
- [ ] Ensure table displays all columns at full width
- [ ] Verify table has minimum width of 800px
- [ ] Test all columns (Student ID, Name, Mission Score, Quiz Score, Latest Activity, Actions) are visible

**Acceptance Criteria**: Students table displays all columns on desktop (Requirements 5.1, 5.7)

**Depends on**: Task 1.2

---

### 5.2 Tablet Table Horizontal Scroll
- [ ] Add `.instructor-table-wrap` with `overflow-x: auto`
- [ ] Add `-webkit-overflow-scrolling: touch` for iOS smooth scrolling
- [ ] Set table minimum width to 800px
- [ ] Add visual scroll indicator (shadow/gradient) at edges
- [ ] Test horizontal scrolling on tablet devices

**Acceptance Criteria**: Table enables horizontal scrolling on tablet when content exceeds viewport (Requirements 5.2, 5.3, 5.7)

**Depends on**: Task 5.1

---

### 5.3 Mobile Card-Based Layout
- [ ] Create `.instructor-students-cards` container for mobile
- [ ] Hide table on mobile: `.instructor-table { display: none; }`
- [ ] Create `.instructor-student-card` component styles
- [ ] Layout card with vertical stack: student ID, name, mission score, quiz score, latest activity
- [ ] Add action buttons row at bottom of card
- [ ] Style cards with background, border, and padding
- [ ] Add 12px gap between cards

**Acceptance Criteria**: Students table transforms to card layout on mobile (<768px) with all information visible (Requirements 5.4, 5.5, 5.6)

**Depends on**: Task 5.2

---

### 5.4 Mobile Student Card Actions
- [ ] Ensure Review, Reset, Remove buttons are visible in cards
- [ ] Make buttons meet 44x44px touch target minimum
- [ ] Add adequate spacing between action buttons (8px minimum)
- [ ] Test touch interaction on all buttons

**Acceptance Criteria**: Action buttons in student cards meet touch target requirements (Requirements 5.6, 6.1, 6.3)

**Depends on**: Task 5.3

---

## Phase 6: Touch Target Accessibility

### 6.1 Global Touch Target Standards
- [ ] Audit all interactive elements (buttons, links, inputs)
- [ ] Add CSS rules for minimum 44x44px on mobile
- [ ] Use padding to increase touch target size: `padding: 12px`
- [ ] Add minimum height/width where needed: `min-width: 44px; min-height: 44px`
- [ ] Test on actual mobile devices with various finger sizes

**Acceptance Criteria**: All interactive elements meet 44x44px minimum on mobile (Requirements 6.1, 6.2)

**Depends on**: Task 1.2

---

### 6.2 Button Spacing Mobile
- [ ] Add 8px minimum spacing between adjacent buttons
- [ ] Implement margin or gap properties in button containers
- [ ] Test accidental tap prevention on densely packed button groups

**Acceptance Criteria**: Interactive elements have adequate spacing to prevent mis-taps (Requirements 6.3)

**Depends on**: Task 6.1

---

### 6.3 Full-Width Mobile Buttons
- [ ] Identify primary action buttons (Export CSV, Add Student, etc.)
- [ ] Add mobile styles: `width: 100%; justify-content: center`
- [ ] Stack buttons vertically with flex-direction: column
- [ ] Test visual hierarchy of button importance

**Acceptance Criteria**: Primary action buttons are full-width on mobile when stacked (Requirements 6.4, 8.2, 8.3)

**Depends on**: Task 6.1

---

## Phase 7: Typography Responsiveness

### 7.1 Base Typography System
- [ ] Convert fixed pixel font sizes to rem units where appropriate
- [ ] Set minimum body text size to 14px (0.875rem)
- [ ] Ensure line-height is at least 1.4 for all text
- [ ] Test text readability at all breakpoints

**Acceptance Criteria**: All text uses relative units and meets minimum size requirements (Requirements 7.1, 7.2, 7.4)

**Depends on**: Task 1.1

---

### 7.2 Responsive Heading Sizes
- [ ] Implement clamp() for instructor brand title: `clamp(2rem, 5vw, 2.75rem)`
- [ ] Add clamp() for section headings: `clamp(1rem, 3vw, 1.25rem)`
- [ ] Test heading sizes scale appropriately across devices
- [ ] Ensure headings remain distinguishable at all sizes

**Acceptance Criteria**: Headings use clamp() function for responsive sizing (Requirements 7.3, 7.5)

**Depends on**: Task 7.1

---

### 7.3 Mobile Typography Adjustments
- [ ] Review all text elements for mobile readability
- [ ] Adjust small text (hints, captions) to meet 14px minimum
- [ ] Test text wrapping and overflow handling
- [ ] Verify contrast ratios meet WCAG AA standards on mobile

**Acceptance Criteria**: All text remains readable on mobile devices (Requirements 3.4, 18.1, 18.2)

**Depends on**: Task 7.2

---

## Phase 8: Action Buttons Layout

### 8.1 Desktop/Tablet Button Layout
- [ ] Ensure `.instructor-panel-actions` uses flexbox with row direction
- [ ] Set gap to 8px between buttons
- [ ] Enable flex-wrap for overflow handling
- [ ] Test button layout with multiple buttons

**Acceptance Criteria**: Action buttons display in horizontal row with wrapping on desktop/tablet (Requirements 8.1, 8.4)

**Depends on**: Task 1.2

---

### 8.2 Mobile Button Stack
- [ ] Add mobile media query for `.instructor-panel-actions`
- [ ] Change flex-direction to column
- [ ] Make buttons full-width: `width: 100%`
- [ ] Maintain 8px gap between stacked buttons
- [ ] Test Export CSV and other action buttons

**Acceptance Criteria**: Action buttons stack vertically and become full-width on mobile (Requirements 8.2, 8.3)

**Depends on**: Task 8.1

---

## Phase 9: Header and Navigation Bar

### 9.1 Responsive Header Layout
- [ ] Update `.instructor-console-header` with flexible layout
- [ ] Ensure header content wraps on smaller screens
- [ ] Add gap property for spacing between elements
- [ ] Test header at various widths

**Acceptance Criteria**: Header displays correctly on all screen sizes (Requirements 9.1, 9.4)

**Depends on**: Task 1.2

---

### 9.2 Mobile Header Stack
- [ ] Add mobile media query for header
- [ ] Change flex-direction to column: `flex-direction: column`
- [ ] Reduce padding: use smaller values on mobile
- [ ] Ensure toggle button is prominent
- [ ] Test header doesn't overflow on narrow screens

**Acceptance Criteria**: Header elements stack vertically on mobile without overflow (Requirements 9.2, 9.3, 9.4)

**Depends on**: Task 9.1

---

## Phase 10: Container and Layout Constraints

### 10.1 Relative Width Containers
- [ ] Audit all containers for fixed pixel widths
- [ ] Convert to relative widths: `width: 100%`, `max-width: 1200px`
- [ ] Remove fixed widths from main content areas
- [ ] Test content adapts to viewport width

**Acceptance Criteria**: Main content uses relative widths instead of fixed pixels (Requirements 10.1)

**Depends on**: Task 1.2

---

### 10.2 Horizontal Scroll Prevention
- [ ] Add `overflow-x: hidden` to body element
- [ ] Add `overflow-x: hidden` to main dashboard containers
- [ ] Ensure all child elements respect container width
- [ ] Test no horizontal scrolling occurs on mobile

**Acceptance Criteria**: Dashboard prevents horizontal scrolling on mobile (Requirements 10.2, 18.4)

**Depends on**: Task 10.1

---

### 10.3 Flexbox Responsive Patterns
- [ ] Update component layouts to use flexbox with flex-wrap
- [ ] Test components wrap correctly at narrow widths
- [ ] Ensure flex items have appropriate min-width values

**Acceptance Criteria**: Flexbox layouts wrap appropriately for responsiveness (Requirements 10.4)

**Depends on**: Task 10.1

---

## Phase 11: Additional Sections Responsiveness

### 11.1 Needs Improvement Section
- [ ] Ensure `.instructor-needs-improvement-list` displays as vertical list
- [ ] Add mobile padding increase for better touch interaction
- [ ] Verify review button meets 44x44px touch target
- [ ] Test list items wrap content appropriately

**Acceptance Criteria**: Needs Improvement section displays correctly on all devices (Requirements 11.1, 11.2, 11.3, 11.4)

**Depends on**: Task 1.2

---

### 11.2 Mission Cards Responsive Grid
- [ ] Update mission cards grid: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
- [ ] Reduce minimum width to 280px on mobile
- [ ] Test mission cards display one per row on mobile
- [ ] Ensure Edit, Create Quiz, Delete buttons remain accessible

**Acceptance Criteria**: Mission cards use responsive grid and display properly on mobile (Requirements 12.1, 12.2, 12.3)

**Depends on**: Task 1.2

---

### 11.3 Long Content Wrapping
- [ ] Add `overflow-wrap: break-word` to mission titles and descriptions
- [ ] Test long text wraps without breaking layout
- [ ] Implement line-clamp for long descriptions if needed

**Acceptance Criteria**: Long mission content wraps appropriately on narrow screens (Requirements 12.4, 18.3)

**Depends on**: Task 11.2

---

### 11.4 Leaderboards Responsiveness
- [ ] Ensure leaderboard tabs have adequate touch targets
- [ ] Make leaderboard table scrollable horizontally on mobile if needed
- [ ] Verify rank medals and statistics remain visible
- [ ] Test abbreviation or wrapping of long statistics labels

**Acceptance Criteria**: Leaderboards display correctly on all screen sizes (Requirements 13.1, 13.2, 13.3, 13.4)

**Depends on**: Task 1.2

---

### 11.5 Pending Approvals Mobile
- [ ] Style pending approval items as vertical cards
- [ ] Ensure Approve/Reject buttons meet touch target size
- [ ] Test student info (name, email, ID) wraps gracefully
- [ ] Add adequate visual spacing

**Acceptance Criteria**: Pending approvals section works well on mobile (Requirements 14.1, 14.2, 14.3, 14.4)

**Depends on**: Task 1.2

---

## Phase 12: Performance Optimization

### 12.1 CSS Performance
- [ ] Add `contain: layout style` to independent components
- [ ] Use CSS transforms for animations instead of position properties
- [ ] Ensure sidebar animation uses transform: translateX
- [ ] Limit use of will-change property to actively animating elements
- [ ] Test animation performance on lower-end devices

**Acceptance Criteria**: Layout transitions complete within 300ms with smooth performance (Requirements 15.1, 15.2, 15.3)

**Depends on**: All Phase 1-11 tasks

---

### 12.2 Prevent Layout Reflow
- [ ] Test media query transitions don't cause content flash
- [ ] Ensure skeleton loaders match actual content dimensions
- [ ] Add aspect ratio boxes for images to prevent layout shift
- [ ] Monitor cumulative layout shift (CLS) metric

**Acceptance Criteria**: Media query changes don't cause visible reflow or flash (Requirements 15.4, 25.1, 25.2)

**Depends on**: Task 12.1

---

### 12.3 Debounce Resize Events
- [ ] Implement resize event debouncing (300ms delay)
- [ ] Add passive event listeners for scroll events
- [ ] Test smooth performance during window resize

**Acceptance Criteria**: Resize handling is optimized and performant (Non-functional requirements: Performance)

**Depends on**: Task 12.1

---

## Phase 13: Accessibility Enhancements

### 13.1 Reduced Motion Support
- [ ] Add `@media (prefers-reduced-motion: reduce)` media query
- [ ] Disable or reduce animations for users with motion sensitivity
- [ ] Test with system reduced motion setting enabled

**Acceptance Criteria**: System respects prefers-reduced-motion preference (Requirements 17.1)

**Depends on**: Task 1.1

---

### 13.2 Focus Indicators
- [ ] Ensure focus outlines are visible at all screen sizes
- [ ] Test focus indicators at 200% zoom level
- [ ] Add high-contrast focus styles for better visibility
- [ ] Verify focus order is logical on all devices

**Acceptance Criteria**: Focus indicators remain visible at all sizes and zoom levels (Requirements 17.2, 17.5)

**Depends on**: Task 1.2

---

### 13.3 ARIA Attributes and Labels
- [ ] Audit all interactive elements for ARIA labels
- [ ] Add aria-label to icon-only buttons
- [ ] Implement proper button roles and states
- [ ] Add aria-live regions for dynamic content updates

**Acceptance Criteria**: All interactive elements have appropriate ARIA attributes (Requirements 17.5)

**Depends on**: Task 13.2

---

## Phase 14: Modal Dialogs Responsiveness

### 14.1 Modal Size Adaptation
- [ ] Add max-width constraints to modal dialogs: `max-width: min(600px, 90vw)`
- [ ] On mobile, make modals near full-screen with small margins
- [ ] Test Quiz Editor and Mission Editor modals

**Acceptance Criteria**: Modals adapt size appropriately to screen width (Requirements 21.1, 21.2)

**Depends on**: Task 1.2

---

### 14.2 Modal Button Layout
- [ ] Stack modal action buttons vertically on mobile
- [ ] Ensure modal buttons meet touch target requirements
- [ ] Test modal scrolling when content is taller than viewport

**Acceptance Criteria**: Modal buttons stack vertically on mobile with proper touch targets (Requirements 21.3, 21.4)

**Depends on**: Task 14.1

---

## Phase 15: Testing and Validation

### 15.1 Breakpoint Testing
- [ ] Test at exact breakpoint boundaries: 767px, 768px, 1919px, 1920px
- [ ] Test at common device widths: 320px, 375px, 414px, 768px, 1024px, 1366px, 1920px
- [ ] Verify smooth transitions when resizing browser
- [ ] Test on actual devices (iPhone, iPad, Android phone/tablet)

**Acceptance Criteria**: Layout works correctly at all breakpoints and common device widths (Requirements 1.1, 1.2, 1.3)

**Depends on**: All previous tasks

---

### 15.2 Cross-Browser Testing
- [ ] Test on Chrome (desktop and mobile)
- [ ] Test on Firefox (desktop and mobile)
- [ ] Test on Safari (macOS and iOS)
- [ ] Test on Edge (desktop)
- [ ] Verify CSS Grid and Flexbox compatibility
- [ ] Test backdrop-filter fallbacks

**Acceptance Criteria**: Design works on all major browsers (Requirements 16.1, 16.2, 16.3, 16.4)

**Depends on**: Task 15.1

---

### 15.3 Touch Interaction Testing
- [ ] Test all touch targets on actual mobile devices
- [ ] Verify buttons are easily tappable without mis-taps
- [ ] Test sidebar swipe gestures if implemented
- [ ] Test horizontal scroll on tables (tablet)
- [ ] Verify iOS smooth scrolling works correctly

**Acceptance Criteria**: Touch interactions work smoothly on mobile devices (Requirements 6.1, 16.3)

**Depends on**: Task 15.2

---

### 15.4 Accessibility Audit
- [ ] Run axe-core accessibility scanner at each breakpoint
- [ ] Test keyboard navigation on all screen sizes
- [ ] Test screen reader compatibility (VoiceOver, NVDA, TalkBack)
- [ ] Verify all WCAG 2.1 AA criteria are met
- [ ] Test with browser zoom at 200%

**Acceptance Criteria**: Dashboard passes accessibility audit on all screen sizes (Requirements 17.1, 17.2, 17.3, 17.4, 17.5)

**Depends on**: Task 15.3

---

### 15.5 Performance Metrics
- [ ] Measure layout recalculation time on resize
- [ ] Verify transitions complete within 300ms
- [ ] Check CSS file size increase is under 25KB
- [ ] Measure First Contentful Paint (FCP) on mobile
- [ ] Monitor Cumulative Layout Shift (CLS)

**Acceptance Criteria**: Performance metrics meet specified requirements (Non-functional requirements: Performance)

**Depends on**: Task 15.4

---

### 15.6 User Acceptance Testing
- [ ] Have instructor users test on their devices
- [ ] Collect feedback on usability across screen sizes
- [ ] Verify all dashboard tasks can be completed on mobile
- [ ] Identify any pain points or confusion
- [ ] Make adjustments based on feedback

**Acceptance Criteria**: Instructors can successfully use dashboard on all devices (Non-functional requirements: Usability)

**Depends on**: Task 15.5

---

## Phase 16: Documentation and Cleanup

### 16.1 Code Documentation
- [ ] Add comments explaining complex responsive logic
- [ ] Document breakpoint values and rationale
- [ ] Create inline comments for media queries
- [ ] Document any browser-specific workarounds

**Acceptance Criteria**: Responsive CSS is well-documented (Non-functional requirements: Maintainability)

**Depends on**: All implementation tasks

---

### 16.2 Style Organization
- [ ] Organize CSS by component or breakpoint sections
- [ ] Group related media queries together
- [ ] Remove any unused or duplicate styles
- [ ] Ensure consistent formatting and naming

**Acceptance Criteria**: CSS is organized and maintainable (Non-functional requirements: Maintainability)

**Depends on**: Task 16.1

---

### 16.3 Developer Guide
- [ ] Create documentation for adding new responsive components
- [ ] Document responsive patterns and best practices
- [ ] Provide examples of proper breakpoint usage
- [ ] Include troubleshooting guide for common issues

**Acceptance Criteria**: Developers have clear guide for maintaining responsive design (Non-functional requirements: Maintainability, Scalability)

**Depends on**: Task 16.2

---

## Summary

**Total Tasks**: 58 tasks across 16 phases

**Key Dependencies**:
- Phase 1 (Foundation) must be completed first
- Phases 2-11 (Component implementations) can run in parallel after Phase 1
- Phase 12 (Performance) requires all component phases complete
- Phase 13 (Accessibility) can run alongside other phases
- Phase 14 (Modals) depends on foundation
- Phase 15 (Testing) requires all implementation complete
- Phase 16 (Documentation) is final phase

**Estimated Timeline**:
- Phase 1: 1-2 days
- Phases 2-11: 5-7 days (parallel work possible)
- Phase 12: 1-2 days
- Phase 13: 1-2 days
- Phase 14: 1 day
- Phase 15: 2-3 days
- Phase 16: 1-2 days

**Total Estimate**: 12-19 days depending on team size and parallel work
