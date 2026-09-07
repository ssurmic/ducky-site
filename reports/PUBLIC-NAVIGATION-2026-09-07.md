# Public product navigation · 2026-09-07

Owner request: simplify the homepage navigation, name creator research clearly, demote the track-record page, and expose the available tools with accurate registration and Pro access.

## Result

- Shared public header: Explore tools, Creators / KOLs, Research examples and Pro. Chinese creator label is 博主 / KOL 观点. Historical records and FAQ remain in the menu footer; the complete ledger also remains in the page footer.
- One catalogue groups 13 tools by following stocks, finding ideas and deeper research. Free, Free / Pro and Pro badges describe existing entitlements. Each link opens the matching homepage preview, whose access sentence explains the actual distinction. Public creator samples remain directly accessible.
- Tool previews have stable shareable hashes, one visible panel, correct selection and keyboard focus, Back support, and preserve the current homepage concept/theme. The app links retain their canonical route through the existing sign-in and email-setup flow.
- Desktop menu closes on Escape, outside click or focus leaving it. Phone groups open one at a time; account and language actions remain available. Opening research from the menu uses the existing native dialog and returns focus to the menu trigger after closing.
- Removed the duplicate mobile bottom registration/subscription bar because the persistent header already carries the start action. It previously covered the feature preview's secondary action. Common header/menu/preview actions have at least 44px targets.

No new subscription tier or entitlement enforcement is introduced. The menu does not request account state or paid research. The application navigation and application module graph are unchanged (`709c276538d054c89899`); current Pro payloads remain API-gated. No price, event, evidence, ledger record or calculation is modified.

## Verification

- Full frontend: **307 passed**, including seven new public-navigation regressions. Final targeted run after CSS/copy cleanup: **21 passed**.
- Build: 20 bilingual pages, i18n parity; copy lint and **1306 internal links** passed.
- Asset release isolation: **4 passed, 1 existing fixture skipped**.
- Backend invariant gate: **ALL GREEN**, **783 pytest passed, 1 warning**, TEST_MODE=1.
- Browser, real clicks: all 13 menu destinations selected the matching preview, closed the menu, moved focus to that preview, and had zero page overflow. Escape restored the menu trigger. A secondary English privacy page returned to the English calendar preview. Calendar preview → sign-in → registration forms were reached without submitting an account.
- Sign-in return and email setup were checked by regression for every catalogue destination, not by creating a real user or completing payment.
- Phone viewport layouts: **320×600 and 393×650**, Chinese and English, light and dark (8 combinations). No horizontal overflow. Header height 65px leaves 535/585px below it. At 320px, the expanded research group shows three complete useful rows before scrolling; the panel has its own bounded 528px scrolling region and the account actions remain reachable. Feature preview begins at approximately y=90 and its actions are 44px or larger without a covering bottom bar.
- Phone research dialog at 393px is 377px wide, keeps the menu closed, and restores focus to the menu trigger on close. Desktop Chinese dark and English light menus visually reviewed; 900×650 secondary-page layout remains usable with an internally scrolling menu.

Browser acceptance uses Chrome viewport resizing and ordinary pointer/keyboard input. It is not a physical-device or touch-emulation certification. No live alert, account setting, subscription, email or Telegram action was submitted. Other tasks' worktrees remain untouched.
