---
name: tab-management
description: Multi-tab creation, switching, closing, and lifecycle coordination
triggers: ["tab", "new tab", "close tab", "switch tab", "tabs"]
version: 1.0.0
---

## Procedural Workflow:
1. **Query Tab States**: Retrieve list of open tabs with IDs and active URLs.
2. **Switching**: Focus target tab via `switch_tab({ tab_id })`.
3. **Creation**: Open target URL in a new tab via `new_tab({ url })`.
4. **Closing**: Safely close completed tabs via `close_tab({ tab_id })`.
5. **Verification**: Confirm active tab ID matches expected target.
