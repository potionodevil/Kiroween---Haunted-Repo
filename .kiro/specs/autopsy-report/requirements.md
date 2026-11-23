# Requirements: autopsy report, SBOM and badge (features 19, 20, 21)

1. The report SHALL list every open finding with severity, CWE, OWASP, location and fix, plus summary, stack, fix list and timeline.
2. The report SHALL print to PDF from the browser and download as Markdown.
3. The SBOM SHALL be CycloneDX 1.5 JSON with purls and OSV vulnerabilities.
4. The README badge SHALL be an SVG with the Haunting score, cached for one hour per repo.
