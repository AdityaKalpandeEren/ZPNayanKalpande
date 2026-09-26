# ZP Nayan Kalpande – Study Apps

Free learning apps for Zilla Parishad schools (Amravati, Maharashtra), Standard 6 and 7.

- **Nayan Kalpande Math** – Marathi medium: मसावि–लसावि, कोन, त्रिकोण, चौकोन, शेकडेवारी, practice tests
- **Nayan Kalpande English** – word reading, sentence making, grammar, vocabulary, reading, speaking, English → Marathi

Website: https://adityakalpandeeren.github.io/ZPNayanKalpande/

Download the Android apps: https://github.com/AdityaKalpandeEren/ZPNayanKalpande/releases/latest

## Files
| File | Purpose |
|---|---|
| `math/index.html`, `english/index.html` | The two apps (edit these to add lessons) |
| `shared/auth.js` | Login (mobile + PIN), registration, Top 10, update popup |
| `config.js` | Firebase settings |
| `version.json` | Latest Android app version (drives the update popup) |
| `sw.js` | Offline support |
| `privacy.html` | Privacy policy |
| `firestore.rules` | Database security rules (paste into Firebase console) |

Login data is stored in Google Firebase (Mumbai region). No ads. No SMS.

## Copyright
© 2026 Nayan Kalpande. All rights reserved. Free for non-commercial learning use only.
Copying, modifying, re-publishing or selling the code or content is not permitted without written permission.
See [LICENSE](LICENSE).

## Official digital signature
All official APKs are signed with this certificate. Anything else is not an official release.

| | |
|---|---|
| Signer | CN=Nayan Kalpande, O=ZP School, L=Amravati, ST=Maharashtra, C=IN |
| SHA-256 | `BA:2C:FB:22:05:C6:64:05:CE:CE:04:55:F4:8A:81:5B:BE:A8:7B:C7:5B:EF:F4:AC:B4:19:2C:85:DE:74:8C:B8` |

To check an APK on a computer: `apksigner verify --print-certs Nayan-Kalpande-Math.apk`
