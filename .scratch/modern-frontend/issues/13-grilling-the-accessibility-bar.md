# Grilling: the accessibility bar

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 

## Question

What accessibility level does the UI commit to, and what must the parts we build ourselves meet?

shadcn/ui on Base UI gives accessible primitives (focus, keyboard, ARIA) for what it ships. Find out what Base UI covers, then decide the target (e.g. WCAG 2.2 AA), how it is checked (jsx-a11y is already in lint; axe in component or e2e tests?), and the keyboard and screen-reader behaviour of our own parts: the Category tree picker, the money input, bulk row selection in tables, and the four theme presets' contrast in light and dark.
