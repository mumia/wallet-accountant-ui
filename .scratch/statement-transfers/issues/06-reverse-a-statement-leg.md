# 06: Warn when reversing a statement leg

Status: ready-for-agent
Blocked by: 04
Waits on backend: no, once 02 is in

## What to build

`reverseWarning` (`src/lib/transfers.ts`) gains `statementLeg`: a Matched leg on a statement Account whose Counterpart is a statement Account too. The reverse dialog says: "Its row goes back to To review. {Counterpart}'s side stays Accepted, In transit." A bank leg with a cash Counterpart keeps today's `bankLeg` wording.

## Acceptance criteria

- [ ] `reverseWarning` unit-tested for `statementLeg`, and the existing kinds unchanged
- [ ] Mock reverse: a statement leg never cascades to the other statement leg; the Match goes, the other leg is In transit, only the reversed leg's row goes back to pending
- [ ] E2e: reversing each leg of a Transfer Accepted both: the warning, then the other leg In transit and only the reversed row back in To review

## Spec

[spec.md](../spec.md): story 11; "Reversing a statement leg (ticket 06)".
