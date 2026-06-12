# products — 04 Questions (decided / deferred)

| #   | Question                                                | Status   | Resolution                                                                              |
| --- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Q-1 | Is `stock` required on create?                          | decided  | Optional, defaults to 0 — spec `default: 0`; covered by TC-002                          |
| Q-2 | Missing field vs invalid value — one error code or two? | decided  | Two: VALIDATION_FAILED (missing) vs INVALID_DATA (invalid). One TC each                 |
| Q-3 | Does a rejected PATCH partially apply?                  | decided  | Must not — TC-012 reads the resource back after the 400                                 |
| Q-4 | Is `costPrice` ever exposed?                            | decided  | Never, on any read path — TC-010 asserts absence on list (currently RED: seeded BUG #2) |
| Q-5 | Status machine coverage now or later?                   | deferred | Later — reserved as the learner exercise (REQ-008); rows ready in 03-flow               |
