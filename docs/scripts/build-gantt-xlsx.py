"""Build HelmQuest Gantt Excel file with real date cells."""
from datetime import datetime

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    raise SystemExit("Run: pip install openpyxl")

ROWS = [
    ("WBS ID", "Task Name", "Start Date", "End Date", "Duration (Weeks)", "Phase", "Phase Color"),
    ("1", "Planning Phase", datetime(2026, 4, 1), datetime(2026, 4, 30), 4, "Planning", "4472C4"),
    ("1.1", "Project Initiation and Requirements Scoping", datetime(2026, 4, 1), datetime(2026, 4, 15), 2, "Planning", "4472C4"),
    ("1.2", "Technology Selection and 3D Asset Planning", datetime(2026, 4, 16), datetime(2026, 4, 30), 2, "Planning", "4472C4"),
    ("2", "Analysis and Design Phase", datetime(2026, 5, 1), datetime(2026, 6, 30), 8, "Analysis and Design", "70AD47"),
    ("2.1", "Literature Review and Navigation Training Standards", datetime(2026, 5, 1), datetime(2026, 5, 31), 4, "Analysis and Design", "70AD47"),
    ("2.2", "System Architecture, ERD, JSON Schema and UI Wireframes", datetime(2026, 6, 1), datetime(2026, 6, 30), 4, "Analysis and Design", "70AD47"),
    ("3", "Implementation Phase (Agile Sprints)", datetime(2026, 7, 1), datetime(2026, 11, 30), 18, "Implementation", "ED7D31"),
    ("3.1", "3D Environment and Vessel Assets", datetime(2026, 7, 1), datetime(2026, 8, 15), 6, "Implementation", "ED7D31"),
    ("3.2", "Simulation Engine and Training Modules", datetime(2026, 8, 1), datetime(2026, 10, 31), 13, "Implementation", "ED7D31"),
    ("3.3", "Student/Instructor Dashboards and Progress Persistence", datetime(2026, 10, 15), datetime(2026, 11, 30), 6, "Implementation", "ED7D31"),
    ("3.4", "Helm Bridge, Cameras and Navigation HUD", datetime(2026, 9, 1), datetime(2026, 10, 31), 8, "Implementation", "ED7D31"),
    ("4", "Testing and Evaluation Phase", datetime(2026, 12, 1), datetime(2027, 1, 31), 7, "Testing", "7030A0"),
    ("4.1", "Unit and Integration Testing", datetime(2026, 12, 1), datetime(2026, 12, 24), 3, "Testing", "7030A0"),
    ("4.2", "User Acceptance Testing", datetime(2027, 1, 1), datetime(2027, 1, 31), 4, "Testing", "7030A0"),
    ("5", "Documentation and Project Closure", datetime(2027, 2, 1), datetime(2027, 3, 31), 8, "Documentation", "A5A5A5"),
    ("5.1", "Bug Fixing, Performance Tuning and Polish", datetime(2027, 2, 1), datetime(2027, 2, 28), 4, "Documentation", "A5A5A5"),
    ("5.2", "Final Report, ERD, JSON Schema and Submission", datetime(2027, 3, 1), datetime(2027, 3, 31), 4, "Documentation", "A5A5A5"),
]

OUT = __file__.replace("scripts\\build-gantt-xlsx.py", "helmquest-gantt.xlsx").replace(
    "scripts/build-gantt-xlsx.py", "helmquest-gantt.xlsx"
)

wb = Workbook()
ws = wb.active
ws.title = "Gantt Chart"

header_fill = PatternFill("solid", fgColor="1F2937")
header_font = Font(bold=True, color="FFFFFF")
thin = Side(style="thin", color="CBD5E1")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

for r_idx, row in enumerate(ROWS, 1):
    for c_idx, value in enumerate(row, 1):
        cell = ws.cell(row=r_idx, column=c_idx, value=value)
        cell.border = border
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        if r_idx == 1:
            cell.fill = header_fill
            cell.font = header_font
        elif c_idx in (3, 4) and r_idx > 1:
            cell.number_format = "DD-MMM-YYYY"
        elif c_idx == 5 and r_idx > 1:
            cell.number_format = "0"
        elif c_idx == 7 and r_idx > 1 and value:
            cell.fill = PatternFill("solid", fgColor=str(value))

ws.column_dimensions["A"].width = 8
ws.column_dimensions["B"].width = 52
ws.column_dimensions["C"].width = 14
ws.column_dimensions["D"].width = 14
ws.column_dimensions["E"].width = 16
ws.column_dimensions["F"].width = 22
ws.column_dimensions["G"].width = 12
ws.freeze_panes = "A2"

wb.save(OUT)
print(f"Wrote {OUT}")
