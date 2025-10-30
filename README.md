# Math Worksheet Generator

Generate customizable math worksheets (addition, subtraction, multiplication, division) as PDFs.

## Features
- Min/Max number constraints
- Operation toggles: addition, subtraction, multiplication, division
- Carry-the-one toggle for addition (enable/disable carrying cases)
- Problems-per-page slider (1–18)
- PDF output with header fields: Name, Date, Score (x / total)
- On-page preview before generating PDF

## Usage
1. Open `index.html` in a modern browser.
2. Set parameters in the Parameters panel.
3. Click "Refresh" to regenerate problems.
4. Click "Generate PDF" to download `worksheet.pdf`.

## Notes
- Division problems produce integer (clean) quotients.
- Subtraction problems avoid negative results.
- If carry is disabled for addition, the generator avoids digit carries; a safe fallback is used if a no-carry pair isn't found quickly.

## Files
- `index.html` – UI and script/style includes
- `styles.css` – basic styling
- `script.js` – generation logic and PDF creation
