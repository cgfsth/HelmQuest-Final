# How to open the HelmQuest Gantt chart (with dates)

If **Start Date**, **End Date**, and **Duration** look empty, Excel is usually putting **all CSV text in one column**.

## Best fix — open the Excel file

Open this file (dates are already set correctly):

**`d:\tabang\docs\helmquest-gantt.xlsx`**

Double-click it. You should see columns:

| A | B | C | D | E |
|---|---|---|---|---|
| WBS ID | Task Name | Start Date | End Date | Duration (Weeks) |

Dates show as **01-Apr-2026** style in columns C and D.

---

## If you must use CSV

### Option A — semicolon file (Philippines / EU Excel)

1. Open Excel → **File → Open**
2. Choose **`helmquest-gantt-semicolon.csv`**
3. If asked, set **delimiter: Semicolon**

### Option B — comma file (US Excel)

1. **Data → Get Data → From File → From Text/CSV**
2. Choose **`helmquest-gantt.csv`**
3. Set delimiter to **Comma**
4. Click **Load**

Do **not** only double-click the `.csv` if your PC uses semicolon as list separator.

---

## Regenerate Excel file

```powershell
python d:\tabang\docs\scripts\build-gantt-xlsx.py
```

Requires: `pip install openpyxl` (once).
