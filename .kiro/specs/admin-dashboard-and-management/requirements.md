# Requirements Document

## Introduction

HelmQuest requires administrative tools to manage users, monitor system performance, and analyze student learning outcomes. The Admin Dashboard and Management System will provide instructors and administrators with centralized access to student and instructor account management, real-time performance statistics, and comprehensive simulation analytics. This feature includes a dashboard displaying key metrics, user management capabilities for CRUD operations, and reporting functionality to export performance data. These tools enable instructors to efficiently track student progress, manage classroom enrollment, and make data-driven instructional decisions.

## Glossary

- **Administrator**: A privileged user role with full system access and management capabilities
- **Instructor**: An authorized educator with access to student data, dashboard analytics, and user management
- **Student**: A learner account that completes simulations and missions; restricted from accessing admin features
- **Admin_Dashboard**: The primary interface displaying system metrics and performance statistics
- **User_Management_System**: The subsystem handling create, read, update, delete (CRUD) operations for user accounts
- **User_Account**: A data record representing a student or instructor including credentials, profile information, and role assignment
- **Simulation_Result**: A data record capturing performance metrics from a completed simulation attempt including time, score, and execution details
- **Key_Metric**: A computed statistic aggregating system data (total students, total instructors, total missions, total attempts)
- **Performance_Report**: A compiled dataset of simulation results with filtering and aggregation capabilities
- **Export_Format**: A data exchange format for report distribution (Excel .xlsx, PDF .pdf)
- **Dashboard_Widget**: A visual component on the Admin_Dashboard displaying a specific metric or statistic
- **User_Role**: An authorization classification determining feature access (Administrator, Instructor, Student)

## Requirements

### Requirement 1: Display Admin Dashboard Overview

**User Story:** As an administrator, I want to see a dashboard with key system metrics at a glance, so that I can monitor overall system health and user engagement.

#### Acceptance Criteria

1. WHEN an Administrator accesses the Admin_Dashboard, THE Dashboard_Widget displaying total Student count SHALL show the accurate current number of Student_Accounts
2. WHEN an Administrator accesses the Admin_Dashboard, THE Dashboard_Widget displaying total Instructor count SHALL show the accurate current number of Instructor_Accounts
3. WHEN an Administrator accesses the Admin_Dashboard, THE Dashboard_Widget displaying total Mission count SHALL show the accurate total number of available Missions
4. WHEN an Administrator accesses the Admin_Dashboard, THE Dashboard_Widget displaying total Simulation_Attempt count SHALL show the accurate total number of completed Simulation_Results
5. WHEN the Admin_Dashboard loads, THE system SHALL retrieve all Key_Metrics from the database within 2 seconds and display them without errors
6. THE Admin_Dashboard SHALL display all four Key_Metrics (students, instructors, missions, attempts) in a visually distinct and organized layout
7. WHILE viewing the Admin_Dashboard, IF a user creates a new Student_Account, THE Dashboard_Widget SHALL reflect the updated total Student count within 5 seconds

### Requirement 2: View Student List and Management Interface

**User Story:** As an instructor, I want to view all students in a list with their information, so that I can manage student accounts and track their status.

#### Acceptance Criteria

1. THE User_Management_System SHALL display a list view containing all Student_Accounts with columns for Student ID, name, email, enrollment status, and date created
2. WHEN an Instructor navigates to the student list view, THE system SHALL retrieve and display all Student_Accounts in a paginated table with no more than 50 rows per page
3. WHEN an Instructor searches for a Student by name or email, THE list view SHALL filter results to show only matching Student_Accounts
4. THE list view interface SHALL allow sorting Student_Accounts by any column (ID, name, email, enrollment status, date)
5. WHEN an Instructor selects a Student from the list, THE system SHALL display the Student's full profile including contact information, enrollment date, and simulation history
6. IF a Student_Account status changes (active to inactive), THE list view SHALL update to reflect the new status without requiring a manual page refresh

### Requirement 3: View Instructor List and Management Interface

**User Story:** As an administrator, I want to view all instructors and their information, so that I can manage instructor accounts and permissions.

#### Acceptance Criteria

1. THE User_Management_System SHALL display a list view containing all Instructor_Accounts with columns for Instructor ID, name, email, department, and date created
2. WHEN an Administrator navigates to the instructor list view, THE system SHALL retrieve and display all Instructor_Accounts in a paginated table with no more than 50 rows per page
3. WHEN an Administrator searches for an Instructor by name or email, THE list view SHALL filter results to show only matching Instructor_Accounts
4. THE list view interface SHALL allow sorting Instructor_Accounts by any column (ID, name, email, department, date)
5. WHEN an Administrator selects an Instructor from the list, THE system SHALL display the Instructor's full profile including credentials, department, contact information, and student roster
6. IF an Instructor_Account status changes (active to inactive), THE list view SHALL update to reflect the new status without requiring a manual page refresh

### Requirement 4: Add New Student User

**User Story:** As an instructor, I want to add new students to the system, so that I can enroll learners in my courses.

#### Acceptance Criteria

1. WHEN an Instructor accesses the "Add Student" form, THE system SHALL display input fields for first name, last name, email, username, password, and enrollment date
2. WHEN an Instructor submits the "Add Student" form with all required fields, THE system SHALL create a new Student_Account and store it in the database
3. IF an Instructor attempts to create a Student_Account with an email that already exists, THE system SHALL reject the submission and display an error message indicating the email is already in use
4. IF an Instructor attempts to create a Student_Account with an invalid email format, THE system SHALL reject the submission and display an error message describing the required format
5. WHEN a new Student_Account is created successfully, THE system SHALL return a confirmation message with the Student ID and username
6. WHEN a Student_Account is created, THE system SHALL assign the Student_Role automatically to control feature access
7. AFTER creating a new Student_Account, THE list view on the student management page SHALL reflect the new student without requiring a manual refresh

### Requirement 5: Add New Instructor User

**User Story:** As an administrator, I want to add new instructors to the system, so that I can onboard educators and assign them to courses.

#### Acceptance Criteria

1. WHEN an Administrator accesses the "Add Instructor" form, THE system SHALL display input fields for first name, last name, email, username, password, department, and date
2. WHEN an Administrator submits the "Add Instructor" form with all required fields, THE system SHALL create a new Instructor_Account and store it in the database
3. IF an Administrator attempts to create an Instructor_Account with an email that already exists, THE system SHALL reject the submission and display an error message indicating the email is already in use
4. IF an Administrator attempts to create an Instructor_Account with an invalid email format, THE system SHALL reject the submission and display an error message describing the required format
5. WHEN a new Instructor_Account is created successfully, THE system SHALL return a confirmation message with the Instructor ID and username
6. WHEN an Instructor_Account is created, THE system SHALL assign the Instructor_Role automatically to control feature access
7. AFTER creating a new Instructor_Account, THE list view on the instructor management page SHALL reflect the new instructor without requiring a manual refresh

### Requirement 6: Edit User Information

**User Story:** As an administrator, I want to edit user information, so that I can update account details and correct data entry errors.

#### Acceptance Criteria

1. WHEN an Administrator selects a User_Account from a list view, THE system SHALL display an edit form pre-populated with the User's current information
2. WHEN an Administrator modifies fields in the edit form and submits the changes, THE system SHALL validate all input fields before updating the database
3. IF an Administrator modifies the email field, THE system SHALL verify the new email is not already associated with another User_Account
4. WHEN the edit form is submitted with valid data, THE system SHALL update the User_Account in the database and display a confirmation message
5. IF an edit submission fails due to validation errors, THE system SHALL display error messages indicating which fields are invalid and why
6. AFTER a User_Account is updated successfully, THE list view SHALL reflect the changes without requiring a manual page refresh
7. THE system SHALL maintain an audit log recording WHO updated a User_Account, WHEN the update occurred, and WHAT fields were changed

### Requirement 7: Delete User Accounts

**User Story:** As an administrator, I want to delete user accounts when necessary, so that I can manage inactive or duplicate accounts.

#### Acceptance Criteria

1. WHEN an Administrator attempts to delete a User_Account, THE system SHALL display a confirmation dialog describing the action and its consequences
2. IF an Administrator confirms deletion of a User_Account, THE system SHALL remove the User_Account from the database and all associated data
3. IF an Administrator confirms deletion of a Student_Account, THE system SHALL preserve Simulation_Results and Historical data for reporting purposes while removing the User_Account
4. WHEN a User_Account is deleted successfully, THE system SHALL display a confirmation message to the Administrator
5. AFTER a User_Account is deleted, THE list view SHALL no longer display the deleted user without requiring a manual refresh
6. THE system SHALL maintain an audit log recording WHO deleted a User_Account, WHEN the deletion occurred, and the User_Account details

### Requirement 8: View Overall Simulation Results Report

**User Story:** As an instructor, I want to view comprehensive simulation results, so that I can analyze student performance and identify learning gaps.

#### Acceptance Criteria

1. WHEN an Instructor accesses the Reports section, THE system SHALL display a Performance_Report containing all Simulation_Results with columns for student name, simulation name, completion date, duration, score, and status
2. WHEN the Performance_Report loads, THE system SHALL retrieve all Simulation_Results from the database and display them in a table format with pagination (50 results per page)
3. WHEN an Instructor filters the Performance_Report by Student, THE system SHALL display only Simulation_Results for the selected Student
4. WHEN an Instructor filters the Performance_Report by Simulation type, THE system SHALL display only Simulation_Results for the selected mission or simulation
5. WHEN an Instructor filters the Performance_Report by date range, THE system SHALL display only Simulation_Results completed within the specified timeframe
6. THE Performance_Report interface SHALL allow sorting results by any column (student name, date, score, duration)
7. WHEN an Instructor views a specific Simulation_Result, THE system SHALL display detailed performance metrics including start time, end time, waypoint accuracy, and any errors encountered

### Requirement 9: Export Reports to Excel Format

**User Story:** As an instructor, I want to export simulation reports to Excel, so that I can share data with colleagues and perform external analysis.

#### Acceptance Criteria

1. WHEN an Instructor views the Performance_Report, THE system SHALL display an "Export to Excel" button in the user interface
2. WHEN an Instructor clicks the "Export to Excel" button, THE system SHALL generate a .xlsx file containing all Performance_Report data including headers and formatted columns
3. WHEN exporting a filtered Performance_Report, THE generated Excel file SHALL contain only the filtered results (matching student, date range, or simulation type)
4. THE Excel export file SHALL include columns for student name, student ID, simulation name, completion date, duration in minutes, score, and pass/fail status
5. WHEN the Excel file is generated successfully, THE system SHALL automatically download the file to the user's computer with a filename format: helmquest-report-[YYYY-MM-DD].xlsx
6. IF the report contains no data, THE system SHALL inform the user that no data is available for export rather than generating an empty file

### Requirement 10: Export Reports to PDF Format

**User Story:** As an instructor, I want to export simulation reports to PDF, so that I can create printable documents for distribution and archival.

#### Acceptance Criteria

1. WHEN an Instructor views the Performance_Report, THE system SHALL display an "Export to PDF" button in the user interface
2. WHEN an Instructor clicks the "Export to PDF" button, THE system SHALL generate a .pdf file containing all Performance_Report data formatted for printing
3. WHEN exporting a filtered Performance_Report, THE generated PDF file SHALL contain only the filtered results (matching student, date range, or simulation type)
4. THE PDF export file SHALL include a header with report title, generation date, and instructor name
5. THE PDF document SHALL include columns for student name, student ID, simulation name, completion date, duration in minutes, score, and pass/fail status with appropriate visual formatting
6. WHEN the PDF file is generated successfully, THE system SHALL automatically download the file to the user's computer with a filename format: helmquest-report-[YYYY-MM-DD].pdf
7. IF the report contains no data, THE system SHALL inform the user that no data is available for export rather than generating an empty file

### Requirement 11: Role-Based Access Control

**User Story:** As an administrator, I want admin features to be restricted to authorized users, so that sensitive data and operations remain protected.

#### Acceptance Criteria

1. WHEN a Student attempts to navigate to the admin dashboard URL, THE system SHALL redirect them to the main game interface without displaying any admin content
2. WHEN a User with Student_Role attempts to access user management pages, THE system SHALL deny access and display an appropriate authorization error message
3. WHEN a User with Instructor_Role attempts to access all admin features, THE system SHALL grant access to student management, reports, and dashboard metrics
4. WHEN an Administrator logs in, THE system SHALL grant full access to all admin features including instructor management, user management, reports, and dashboard
5. WHEN a User's role is modified, THE system SHALL apply the new access restrictions on their next page load or session refresh
6. THE system SHALL prevent direct access to admin API endpoints for users lacking appropriate User_Role authorization

### Requirement 12: Admin Features UI Navigation

**User Story:** As an administrator, I want a clear navigation structure for admin features, so that I can access different sections intuitively.

#### Acceptance Criteria

1. WHEN an Administrator is logged in, THE system SHALL display a navigation menu or sidebar with links to Dashboard, Student Management, Instructor Management, and Reports
2. WHEN an Administrator clicks a navigation link, THE system SHALL load the selected admin section without page reload errors
3. THE navigation interface SHALL show the currently active section highlighted or indicated visually
4. WHEN an Administrator is viewing the admin interface, THE system SHALL prevent accidental navigation away from incomplete forms without warning
5. THE Admin_Dashboard link SHALL be the default landing page when an Administrator enters the admin section
