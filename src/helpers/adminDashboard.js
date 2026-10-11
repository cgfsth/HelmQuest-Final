/**
 * Admin Dashboard Helper Functions
 * Manages administrative functionality including user management, reports, and analytics
 */

// Admin Tabs Configuration
export const ADMIN_TABS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'students', icon: '👤', label: 'Students' },
  { id: 'instructors', icon: '👨‍🏫', label: 'Instructors' },
  { id: 'reports', icon: '📈', label: 'Reports' }
];

// Initialize admin state
export function initializeAdminState() {
  return {
    adminActiveTab: 'dashboard',
    adminSearch: '',
    adminStats: {
      totalStudents: 0,
      totalInstructors: 0,
      totalMissions: 0,
      totalAttempts: 0
    },
    showAddStudentForm: false,
    showEditStudentForm: false,
    showAddInstructorForm: false,
    showEditInstructorForm: false,
    currentUserForm: {
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      department: '',
      status: 'active'
    },
    reportFilter: {
      student: '',
      dateFrom: '',
      dateTo: '',
      status: ''
    },
    allStudents: [],
    allInstructors: [],
    allSimulationResults: []
  };
}

// Calculate admin dashboard statistics
export function calculateAdminStats(progressData, navigationMissions) {
  const stats = {
    totalStudents: 0,
    totalInstructors: 0,
    totalMissions: navigationMissions?.length || 0,
    totalAttempts: 0
  };

  if (progressData?.students) {
    stats.totalStudents = progressData.students.filter(s => s.role === 'student').length;
  }

  if (progressData?.students) {
    stats.totalInstructors = progressData.students.filter(s => s.role === 'instructor').length;
  }

  if (progressData?.sessions) {
    stats.totalAttempts = progressData.sessions.length;
  }

  return stats;
}

// Get filtered students list
export function getFilteredStudents(allStudents, searchQuery) {
  if (!searchQuery) return allStudents;
  const query = searchQuery.toLowerCase();
  return allStudents.filter(s => 
    s.name.toLowerCase().includes(query) || 
    s.email.toLowerCase().includes(query)
  );
}

// Get filtered instructors list
export function getFilteredInstructors(allInstructors, searchQuery) {
  if (!searchQuery) return allInstructors;
  const query = searchQuery.toLowerCase();
  return allInstructors.filter(i => 
    i.name.toLowerCase().includes(query) || 
    i.email.toLowerCase().includes(query)
  );
}

// Get filtered simulation results
export function getFilteredResults(allResults, filters) {
  let filtered = [...allResults];

  if (filters.student) {
    filtered = filtered.filter(r => r.studentId === filters.student);
  }

  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(r => new Date(r.completedAt) >= dateFrom);
  }

  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    filtered = filtered.filter(r => new Date(r.completedAt) <= dateTo);
  }

  if (filters.status) {
    if (filters.status === 'passed') {
      filtered = filtered.filter(r => r.passed);
    } else if (filters.status === 'failed') {
      filtered = filtered.filter(r => !r.passed);
    }
  }

  return filtered;
}

// Export to Excel
export function exportToExcel(data, filename = 'helmquest-report') {
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.xlsx`;

  // Create CSV content (Excel can import CSV)
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Student,Student ID,Mission,Date,Duration (min),Score,Status\n';

  data.forEach(row => {
    const line = [
      row.studentName,
      row.studentId,
      row.missionName,
      new Date(row.completedAt).toLocaleDateString(),
      row.duration,
      row.score,
      row.passed ? 'PASSED' : 'FAILED'
    ].join(',');
    csvContent += line + '\n';
  });

  // Create and download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fullFilename.replace('.xlsx', '.csv'));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to PDF
export function exportToPDF(data, filename = 'helmquest-report') {
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.pdf`;

  // For now, export as text that user can copy to PDF
  // In production, use a library like jsPDF or pdfkit
  let content = `HELMQUEST SIMULATION RESULTS REPORT\n`;
  content += `Generated: ${new Date().toLocaleString()}\n\n`;
  content += `=====================================\n\n`;

  data.forEach((row, idx) => {
    content += `${idx + 1}. ${row.studentName} (ID: ${row.studentId})\n`;
    content += `   Mission: ${row.missionName}\n`;
    content += `   Date: ${new Date(row.completedAt).toLocaleDateString()}\n`;
    content += `   Duration: ${row.duration} minutes\n`;
    content += `   Score: ${row.score}%\n`;
    content += `   Status: ${row.passed ? 'PASSED' : 'FAILED'}\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format date helper
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Validate email
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if email already exists
export function emailExists(email, allUsers, excludeId = null) {
  return allUsers.some(u => u.email === email && u.id !== excludeId);
}

// Generate user ID
export function generateUserId(role) {
  const prefix = role === 'student' ? 'STU' : 'INS';
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
}
