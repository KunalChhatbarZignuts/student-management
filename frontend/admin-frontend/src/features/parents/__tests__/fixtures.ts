import { ParentWithChildren, LinkedChildDetail } from '../api';

export const mockLinkedChild: LinkedChildDetail = {
  id: 'child-101',
  relationship_id: 'link-101',
  student_id: 'stu-101',
  student_code: '2026-CS-0001',
  enrollment_number: 'STU-2026-00001',
  first_name: 'Ada',
  last_name: 'Lovelace',
  dob: '2008-12-10',
  class_name: 'Grade 12',
  section: '12-A',
  department: 'CS',
  academic_year: '2026-2027',
  class_teacher_name: 'Alan Turing',
  relationship_type: 'Father',
  is_primary_guardian: true,
  verification_status: 'verified',
  status: 'active',
  linked_at: '2026-11-02T14:54:36Z',
};

export const mockParentActive: ParentWithChildren = {
  id: 'parent-1',
  user_id: 'user-p1',
  email: 'lord.byron@example.com',
  first_name: 'Lord',
  last_name: 'Byron',
  phone: '+1 555-0100',
  address: '10 Downing St, London',
  user_status: 'active',
  children_count: 1,
  children: [mockLinkedChild],
  created_at: '2026-11-01T10:00:00Z',
};

export const mockParentSuspended: ParentWithChildren = {
  id: 'parent-2',
  user_id: 'user-p2',
  email: 'meera.kapoor@example.com',
  first_name: 'Meera',
  last_name: 'Kapoor',
  phone: '+91 98220 11224',
  address: 'Mumbai, India',
  user_status: 'suspended',
  children_count: 0,
  children: [],
  created_at: '2026-11-02T11:00:00Z',
};

export const mockParentInvited: ParentWithChildren = {
  id: 'parent-3',
  user_id: 'user-p3',
  email: 'new.parent@example.com',
  first_name: 'New',
  last_name: 'Guardian',
  phone: '',
  address: '',
  user_status: 'invited',
  children_count: 0,
  children: [],
  created_at: '2026-11-03T12:00:00Z',
};

export const mockStudentOptions = [
  {
    id: 'stu-201',
    label: 'Charles Babbage (STU-2026-00002) - Grade 11 (11-B)',
  },
  {
    id: 'stu-202',
    label: 'Grace Hopper (STU-2026-00003) - Grade 10 (10-A)',
  },
];
