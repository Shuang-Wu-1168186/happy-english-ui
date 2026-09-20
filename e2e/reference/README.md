These images were rendered from the original HappyEnglish Jinja templates and CSS, not approved from the React output.

Source: `/Users/wushuang/Desktop/606GIS/HappyEnglish/loginapp`, 2026-09-20.
Viewport: 1280 × 900, Chromium on macOS; full-page capture; administrator account.
Data: the same disposable fixtures as `happy-english/tests/support.py`, with no saved progress. Original templates were rendered with Jinja in a temporary environment, with the original scripts and assets served locally. Bootstrap 5.3.3 was served locally to eliminate CDN timing differences.

Run `npm run test:visual` on the same platform. System fonts and emoji differ on other operating systems. The 0.1% pixel tolerance allows rasterisation and empty optional-field differences; it is not permission to replace these baselines with a redesigned screen. To change a baseline, render and compare the corresponding original template first.

The homepage now includes the user-requested administrator shortcut beside Logout. Only `.home-admin-link` is hidden during the original screenshot comparison; the original baseline stays unchanged. Functional browser tests cover its visibility, navigation, mobile access and role restriction.
