// Older missions stored the creator in createdBy; new records use instructorId.
export function missionOwner(mission) {
  return mission?.instructorId || mission?.instructorid || mission?.createdBy || null;
}

export function canViewMission(mission, viewer) {
  if (!viewer?.id) return false;
  if (viewer.role === 'admin') return true;
  const owner = missionOwner(mission);
  if (!owner) return false;
  if (viewer.role === 'instructor') return owner === viewer.id;
  if (viewer.role === 'student') {
    const assignedInstructor = viewer.instructorid || viewer.instructorId;
    return Boolean(assignedInstructor) && owner === assignedInstructor;
  }
  return false;
}

export function canManageMission(mission, viewer) {
  return viewer?.role === 'instructor' && missionOwner(mission) === viewer.id;
}
