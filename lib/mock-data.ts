// ============================================================
// MOCK DATA — Placeholder data for dashboard UI development
// Replace with real API calls when backend is ready
// ============================================================

export const mockUser = {
  id: "usr-001",
  name: "Abubakar Ibrahim",
  email: "abubakar.ibrahim@gmail.com",
  image: null,
  role: "user" as const,
  registrationNo: "UG19/ASAC/1025",
  accountStatus: "ACTIVE" as const,
};

export const mockGraduate = {
  id: "grad-001",
  userId: "usr-001",
  registrationNo: "UG19/ASAC/1025",
  fullName: "Abubakar Ibrahim",
  sex: "M" as const,
  stateOfOrigin: "Gombe",
  lga: "Gombe",
  facultyCode: "AS",
  facultyName: "Arts & Social Sciences",
  courseCode: "AC",
  departmentName: "Accounting",
  cgpa: 3.78,
  degreeClass: "SECOND_CLASS_UPPER" as const,
  graduationYear: "2023-2024",
  entryYear: 2019,
  bio: "Passionate about financial technology and community development. Working to bridge the gap between traditional accounting and modern fintech solutions.",
  linkedinUrl: "https://linkedin.com/in/abubakar",
  nyscState: "Lagos",
  nyscYear: 2024,
  profileCompleted: true,
  profileViews: 142,
  availableForMentorship: true,
  openToOpportunities: true,
};

export const mockStats = {
  totalConnections: 48,
  pendingConnections: 5,
  profileViews: 142,
  jobsApplied: 3,
  groupsJoined: 6,
  mentorshipsActive: 2,
};

export const mockProfileViewsChart = [
  { date: "Jan", views: 12 },
  { date: "Feb", views: 19 },
  { date: "Mar", views: 15 },
  { date: "Apr", views: 22 },
  { date: "May", views: 28 },
  { date: "Jun", views: 35 },
  { date: "Jul", views: 42 },
  { date: "Aug", views: 38 },
  { date: "Sep", views: 51 },
  { date: "Oct", views: 47 },
  { date: "Nov", views: 55 },
  { date: "Dec", views: 62 },
];

export const mockActivityFeed = [
  { id: "a1", type: "CONNECTION_ACCEPTED", headline: "Fatima Yusuf accepted your connection request", time: "2h ago" },
  { id: "a2", type: "JOB_MATCH", headline: "New job match: Financial Analyst at Zenith Bank", time: "5h ago" },
  { id: "a3", type: "GROUP_POST", headline: "New post in Accounting Alumni group by Musa Aliyu", time: "1d ago" },
  { id: "a4", type: "PROFILE_VIEW", headline: "Your profile was viewed by 3 alumni this week", time: "2d ago" },
  { id: "a5", type: "ENDORSEMENT", headline: "Amina Bello endorsed your skill in Financial Analysis", time: "3d ago" },
  { id: "a6", type: "MENTORSHIP_REQUEST", headline: "New mentorship request from Yusuf Adamu", time: "4d ago" },
];

export const mockDirectoryGraduates = [
  { id: "g1", fullName: "Fatima Yusuf", departmentName: "Computer Science", facultyName: "Science", graduationYear: "2022-2023", stateOfOrigin: "Borno", degreeClass: "FIRST_CLASS", profileViews: 89, image: null, bio: "Software Engineer at Paystack" },
  { id: "g2", fullName: "Musa Aliyu", departmentName: "Accounting", facultyName: "Arts & Social Sciences", graduationYear: "2021-2022", stateOfOrigin: "Gombe", degreeClass: "SECOND_CLASS_UPPER", profileViews: 67, image: null, bio: "Auditor at PwC Nigeria" },
  { id: "g3", fullName: "Amina Bello", departmentName: "Medicine", facultyName: "Medicine", graduationYear: "2020-2021", stateOfOrigin: "Adamawa", degreeClass: "SECOND_CLASS_UPPER", profileViews: 134, image: null, bio: "Medical Doctor at FMC Gombe" },
  { id: "g4", fullName: "Ibrahim Danjuma", departmentName: "Civil Engineering", facultyName: "Science", graduationYear: "2023-2024", stateOfOrigin: "Taraba", degreeClass: "SECOND_CLASS_LOWER", profileViews: 45, image: null, bio: "Junior Engineer at Julius Berger" },
  { id: "g5", fullName: "Hauwa Mohammed", departmentName: "Pharmacy", facultyName: "Pharmacy", graduationYear: "2022-2023", stateOfOrigin: "Bauchi", degreeClass: "FIRST_CLASS", profileViews: 112, image: null, bio: "Pharmacist at May & Baker" },
  { id: "g6", fullName: "Abdullahi Garba", departmentName: "English", facultyName: "Arts & Social Sciences", graduationYear: "2019-2020", stateOfOrigin: "Yobe", degreeClass: "SECOND_CLASS_UPPER", profileViews: 56, image: null, bio: "Content Strategist at Flutterwave" },
  { id: "g7", fullName: "Zainab Suleiman", departmentName: "Biochemistry", facultyName: "Science", graduationYear: "2021-2022", stateOfOrigin: "Gombe", degreeClass: "FIRST_CLASS", profileViews: 198, image: null, bio: "Research Analyst at NNPC" },
  { id: "g8", fullName: "Usman Bala", departmentName: "Business Administration", facultyName: "Arts & Social Sciences", graduationYear: "2020-2021", stateOfOrigin: "Kano", degreeClass: "SECOND_CLASS_UPPER", profileViews: 78, image: null, bio: "Product Manager at Kuda Bank" },
];

export const mockJobs = [
  { id: "j1", title: "Senior Accountant", companyName: "Deloitte Nigeria", industry: "Consulting", jobType: "FULL_TIME", locationCity: "Lagos", locationState: "Lagos", salaryMin: 500000, salaryMax: 800000, postedBy: "Musa Aliyu", createdAt: "2026-02-25", deadline: "2026-03-30", isActive: true, applications: 12 },
  { id: "j2", title: "Software Engineer", companyName: "Paystack", industry: "Technology", jobType: "FULL_TIME", locationCity: "Lagos", locationState: "Lagos", salaryMin: 700000, salaryMax: 1200000, postedBy: "Fatima Yusuf", createdAt: "2026-02-20", deadline: "2026-03-25", isActive: true, applications: 28 },
  { id: "j3", title: "Medical Officer", companyName: "FMC Gombe", industry: "Healthcare", jobType: "FULL_TIME", locationCity: "Gombe", locationState: "Gombe", salaryMin: 400000, salaryMax: 600000, postedBy: "Amina Bello", createdAt: "2026-02-18", deadline: "2026-03-20", isActive: true, applications: 8 },
  { id: "j4", title: "Data Analyst (Remote)", companyName: "Andela", industry: "Technology", jobType: "REMOTE", locationCity: "Remote", locationState: "Nigeria", salaryMin: 600000, salaryMax: 1000000, postedBy: "Zainab Suleiman", createdAt: "2026-02-15", deadline: "2026-03-15", isActive: true, applications: 34 },
  { id: "j5", title: "Pharmacist", companyName: "Emzor Pharmaceuticals", industry: "Healthcare", jobType: "FULL_TIME", locationCity: "Lagos", locationState: "Lagos", salaryMin: 350000, salaryMax: 550000, postedBy: "Hauwa Mohammed", createdAt: "2026-02-10", deadline: "2026-03-10", isActive: false, applications: 15 },
];

export const mockConnections = [
  { id: "c1", name: "Fatima Yusuf", department: "Computer Science", year: "2022-2023", status: "ACCEPTED", mutualConnections: 12, image: null },
  { id: "c2", name: "Musa Aliyu", department: "Accounting", year: "2021-2022", status: "ACCEPTED", mutualConnections: 8, image: null },
  { id: "c3", name: "Amina Bello", department: "Medicine", year: "2020-2021", status: "ACCEPTED", mutualConnections: 5, image: null },
  { id: "c4", name: "Yusuf Adamu", department: "Economics", year: "2023-2024", status: "PENDING", mutualConnections: 3, image: null },
  { id: "c5", name: "Halima Abubakar", department: "Law", year: "2022-2023", status: "PENDING", mutualConnections: 7, image: null },
  { id: "c6", name: "Ibrahim Danjuma", department: "Civil Engineering", year: "2023-2024", status: "ACCEPTED", mutualConnections: 4, image: null },
];

export const mockGroups = [
  { id: "grp1", name: "2023/2024 Set", slug: "2023-2024-set", type: "COHORT" as const, memberCount: 1240, description: "Official group for the 2023/2024 graduating set", recentPost: "Congratulations to everyone who completed NYSC!", isAuto: true },
  { id: "grp2", name: "Accounting Alumni", slug: "accounting-alumni", type: "DEPARTMENT" as const, memberCount: 342, description: "For all Accounting department graduates", recentPost: "ICAN exam preparation tips shared by Musa Aliyu", isAuto: true },
  { id: "grp3", name: "Faculty of Science", slug: "faculty-of-science", type: "FACULTY" as const, memberCount: 890, description: "All graduates from the Faculty of Science", recentPost: "Research opportunity at NNPC for science graduates", isAuto: true },
  { id: "grp4", name: "Gombe State Alumni", slug: "gombe-state-alumni", type: "STATE" as const, memberCount: 2100, description: "GSU graduates currently in Gombe State", recentPost: "State government job openings for graduates", isAuto: true },
  { id: "grp5", name: "Tech Alumni Network", slug: "tech-alumni-network", type: "CUSTOM" as const, memberCount: 156, description: "For alumni working in tech — share opportunities, knowledge, and resources", recentPost: "Lagos tech meetup this Saturday!", isAuto: false },
  { id: "grp6", name: "GSU Entrepreneurs", slug: "gsu-entrepreneurs", type: "CUSTOM" as const, memberCount: 89, description: "Business owners and aspiring entrepreneurs from GSU", recentPost: "How I raised my first seed round — by Usman Bala", isAuto: false },
];

export const mockMentorships = [
  { id: "m1", mentorName: "Dr. Amina Bello", mentorDepartment: "Medicine", mentorYear: "2020-2021", subject: "Career Guidance in Healthcare", status: "ACCEPTED" as const, skills: ["Healthcare", "Research", "Public Health"], image: null },
  { id: "m2", mentorName: "Fatima Yusuf", mentorDepartment: "Computer Science", mentorYear: "2022-2023", subject: "Software Engineering Career Path", status: "ACCEPTED" as const, skills: ["Python", "JavaScript", "Cloud"], image: null },
  { id: "m3", mentorName: "Usman Bala", mentorDepartment: "Business Administration", mentorYear: "2020-2021", subject: "Product Management", status: "PENDING" as const, skills: ["Product Strategy", "Agile", "Leadership"], image: null },
];

export const mockAvailableMentors = [
  { id: "am1", name: "Dr. Hassan Abubakar", department: "Pharmacy", year: "2018-2019", skills: ["Pharmaceutical Research", "Drug Safety", "Regulatory Affairs"], bio: "15+ years in pharmaceutical industry", image: null },
  { id: "am2", name: "Zainab Suleiman", department: "Biochemistry", year: "2021-2022", skills: ["Data Science", "Research", "Bioinformatics"], bio: "Research Analyst at NNPC with passion for mentoring", image: null },
  { id: "am3", name: "Abdullahi Garba", department: "English", year: "2019-2020", skills: ["Content Strategy", "Technical Writing", "Marketing"], bio: "Content lead at Flutterwave", image: null },
];

export const mockNotifications = [
  { id: "n1", type: "CONNECTION_REQUEST", title: "New Connection Request", body: "Yusuf Adamu wants to connect with you", isRead: false, createdAt: "2026-03-02T10:30:00Z" },
  { id: "n2", type: "JOB_MATCH", title: "Job Match Found", body: "Senior Accountant at Deloitte matches your profile", isRead: false, createdAt: "2026-03-02T08:15:00Z" },
  { id: "n3", type: "ENDORSEMENT", title: "New Endorsement", body: "Amina Bello endorsed you for Financial Analysis", isRead: false, createdAt: "2026-03-01T16:45:00Z" },
  { id: "n4", type: "GROUP_POST", title: "New Group Post", body: "Musa Aliyu posted in Accounting Alumni group", isRead: true, createdAt: "2026-03-01T12:00:00Z" },
  { id: "n5", type: "MESSAGE_RECEIVED", title: "New Message", body: "Fatima Yusuf sent you a message", isRead: true, createdAt: "2026-02-28T20:30:00Z" },
  { id: "n6", type: "MENTORSHIP_ACCEPTED", title: "Mentorship Accepted", body: "Dr. Amina Bello accepted your mentorship request", isRead: true, createdAt: "2026-02-27T14:00:00Z" },
  { id: "n7", type: "PROFILE_VIEW", title: "Profile Viewed", body: "Your profile was viewed 3 times this week", isRead: true, createdAt: "2026-02-26T09:00:00Z" },
  { id: "n8", type: "ADMIN_BROADCAST", title: "Platform Update", body: "New features added: Skills endorsements and alumni map", isRead: true, createdAt: "2026-02-25T11:00:00Z" },
];

export const mockEmployment = [
  { id: "e1", jobTitle: "Financial Analyst", companyName: "Access Bank PLC", industry: "Banking", employmentType: "FULL_TIME", city: "Lagos", state: "Lagos", country: "Nigeria", isCurrent: true, startDate: "2025-03-01", endDate: null },
  { id: "e2", jobTitle: "NYSC Corp Member", companyName: "Lagos State Ministry of Finance", industry: "Government", employmentType: "CONTRACT", city: "Lagos", state: "Lagos", country: "Nigeria", isCurrent: false, startDate: "2024-03-01", endDate: "2025-02-28" },
];

export const mockEducation = [
  { id: "ed1", institution: "Gombe State University", degree: "B.Sc", fieldOfStudy: "Accounting", startYear: 2019, endYear: 2024, isCurrent: false },
  { id: "ed2", institution: "Institute of Chartered Accountants (ICAN)", degree: "Professional", fieldOfStudy: "Chartered Accountancy", startYear: 2025, endYear: null, isCurrent: true },
];

export const mockSkills = [
  { id: "s1", name: "Financial Analysis", proficiency: "EXPERT", endorsements: 12 },
  { id: "s2", name: "Auditing", proficiency: "EXPERT", endorsements: 8 },
  { id: "s3", name: "Tax Accounting", proficiency: "INTERMEDIATE", endorsements: 5 },
  { id: "s4", name: "Excel & Financial Modeling", proficiency: "EXPERT", endorsements: 15 },
  { id: "s5", name: "Data Analysis", proficiency: "INTERMEDIATE", endorsements: 3 },
];

// ── Admin Mock Data ──

export const mockAdminStats = {
  totalGraduates: 10842,
  activeUsers: 3456,
  pendingAccounts: 7386,
  totalUploads: 24,
  totalJobs: 156,
  totalGroups: 89,
  graduatesThisMonth: 128,
  jobsThisMonth: 12,
};

export const mockGraduatesByFaculty = [
  { faculty: "Arts & Social Sciences", count: 3420 },
  { faculty: "Science", count: 2890 },
  { faculty: "Education", count: 2100 },
  { faculty: "Medicine", count: 1340 },
  { faculty: "Pharmacy", count: 1092 },
];

export const mockDegreeDistribution = [
  { name: "First Class", value: 540, fill: "var(--color-chart-1)" },
  { name: "Second Upper", value: 3800, fill: "var(--color-chart-2)" },
  { name: "Second Lower", value: 4200, fill: "var(--color-chart-3)" },
  { name: "Third Class", value: 1502, fill: "var(--color-chart-4)" },
  { name: "Pass", value: 800, fill: "var(--color-chart-5)" },
];

export const mockUploadLogs = [
  { id: "u1", fileName: "2023_2024_graduates.xlsx", totalRows: 1245, created: 1230, updated: 0, skipped: 10, failed: 5, status: "COMPLETED" as const, startedAt: "2026-02-20T14:30:00Z", completedAt: "2026-02-20T14:32:00Z", uploadedBy: "Admin" },
  { id: "u2", fileName: "2022_2023_graduates.xlsx", totalRows: 1180, created: 1175, updated: 0, skipped: 3, failed: 2, status: "COMPLETED" as const, startedAt: "2026-02-15T10:00:00Z", completedAt: "2026-02-15T10:02:00Z", uploadedBy: "Admin" },
  { id: "u3", fileName: "2021_2022_graduates.xlsx", totalRows: 1050, created: 1045, updated: 0, skipped: 5, failed: 0, status: "COMPLETED" as const, startedAt: "2026-02-10T09:00:00Z", completedAt: "2026-02-10T09:01:30Z", uploadedBy: "Admin" },
  { id: "u4", fileName: "midyear_correction.xlsx", totalRows: 45, created: 0, updated: 42, skipped: 3, failed: 0, status: "COMPLETED" as const, startedAt: "2026-02-28T16:00:00Z", completedAt: "2026-02-28T16:00:15Z", uploadedBy: "Admin" },
];

export const mockAdminGraduates = [
  { id: "ag1", registrationNo: "UG19/ASAC/1025", fullName: "Abubakar Ibrahim", facultyName: "Arts & Social Sciences", departmentName: "Accounting", graduationYear: "2023-2024", degreeClass: "SECOND_CLASS_UPPER", accountStatus: "ACTIVE" },
  { id: "ag2", registrationNo: "UG19/SC/0342", fullName: "Fatima Yusuf", facultyName: "Science", departmentName: "Computer Science", graduationYear: "2022-2023", degreeClass: "FIRST_CLASS", accountStatus: "ACTIVE" },
  { id: "ag3", registrationNo: "UG18/ASAC/0891", fullName: "Musa Aliyu", facultyName: "Arts & Social Sciences", departmentName: "Accounting", graduationYear: "2021-2022", degreeClass: "SECOND_CLASS_UPPER", accountStatus: "ACTIVE" },
  { id: "ag4", registrationNo: "UG17/MD/0156", fullName: "Amina Bello", facultyName: "Medicine", departmentName: "Medicine", graduationYear: "2020-2021", degreeClass: "SECOND_CLASS_UPPER", accountStatus: "ACTIVE" },
  { id: "ag5", registrationNo: "UG20/SC/0678", fullName: "Ibrahim Danjuma", facultyName: "Science", departmentName: "Civil Engineering", graduationYear: "2023-2024", degreeClass: "SECOND_CLASS_LOWER", accountStatus: "PENDING" },
  { id: "ag6", registrationNo: "UG19/PH/0234", fullName: "Hauwa Mohammed", facultyName: "Pharmacy", departmentName: "Pharmacy", graduationYear: "2022-2023", degreeClass: "FIRST_CLASS", accountStatus: "ACTIVE" },
  { id: "ag7", registrationNo: "UG16/ASAC/0445", fullName: "Abdullahi Garba", facultyName: "Arts & Social Sciences", departmentName: "English", graduationYear: "2019-2020", degreeClass: "SECOND_CLASS_UPPER", accountStatus: "ACTIVE" },
  { id: "ag8", registrationNo: "UG18/SC/0112", fullName: "Zainab Suleiman", facultyName: "Science", departmentName: "Biochemistry", graduationYear: "2021-2022", degreeClass: "FIRST_CLASS", accountStatus: "ACTIVE" },
  { id: "ag9", registrationNo: "UG17/ASAC/0789", fullName: "Usman Bala", facultyName: "Arts & Social Sciences", departmentName: "Business Administration", graduationYear: "2020-2021", degreeClass: "SECOND_CLASS_UPPER", accountStatus: "SUSPENDED" },
  { id: "ag10", registrationNo: "UG20/ED/0567", fullName: "Halima Abubakar", facultyName: "Education", departmentName: "Educational Psychology", graduationYear: "2023-2024", degreeClass: "SECOND_CLASS_LOWER", accountStatus: "PENDING" },
];

// ── Events Mock Data ──

export const mockEvents = [
  { id: "ev1", title: "GSU Alumni Homecoming 2026", description: "Annual homecoming celebration for all graduating sets. Join us for a day of networking, panels, and reunions.", date: "2026-04-15", time: "10:00 AM", location: "GSU Main Campus, Gombe", type: "REUNION" as const, attendees: 342, isUpcoming: true, coverImage: null },
  { id: "ev2", title: "Tech Alumni Meetup — Lagos", description: "Monthly tech meetup for GSU alumni in Lagos. Talks on AI, FinTech, and career growth.", date: "2026-03-22", time: "2:00 PM", location: "Zone Tech Park, Victoria Island, Lagos", type: "MEETUP" as const, attendees: 56, isUpcoming: true, coverImage: null },
  { id: "ev3", title: "Career Workshop: CV & Interview Prep", description: "Free career workshop for recent graduates. Learn how to write compelling CVs and ace interviews.", date: "2026-03-15", time: "11:00 AM", location: "Virtual (Zoom)", type: "WORKSHOP" as const, attendees: 128, isUpcoming: true, coverImage: null },
  { id: "ev4", title: "Entrepreneurship Networking Night", description: "Connect with fellow alumni entrepreneurs. Pitch ideas, find co-founders, and share resources.", date: "2026-04-05", time: "6:00 PM", location: "Transcorp Hilton, Abuja", type: "NETWORKING" as const, attendees: 89, isUpcoming: true, coverImage: null },
  { id: "ev5", title: "2025 Alumni Awards Night", description: "Celebrating outstanding achievements of GSU alumni across all fields.", date: "2025-12-10", time: "5:00 PM", location: "GSU Auditorium, Gombe", type: "REUNION" as const, attendees: 450, isUpcoming: false, coverImage: null },
  { id: "ev6", title: "Medical Alumni Symposium", description: "Annual symposium for medical and pharmacy graduates discussing healthcare challenges in Nigeria.", date: "2025-11-20", time: "9:00 AM", location: "Federal Teaching Hospital, Gombe", type: "WORKSHOP" as const, attendees: 75, isUpcoming: false, coverImage: null },
  { id: "ev7", title: "GSU Founders Day Lecture", description: "Special lecture commemorating the founding of Gombe State University.", date: "2026-05-10", time: "10:00 AM", location: "GSU Senate Building, Gombe", type: "REUNION" as const, attendees: 210, isUpcoming: true, coverImage: null },
];

// ── Achievements & Badges Mock Data ──

export const mockAchievements = [
  { id: "ach1", title: "Best Graduating Student — Accounting", description: "Awarded Best Graduating Student in the Department of Accounting, 2023/2024 session.", year: 2024, verified: true, verifiedAt: "2025-01-15" },
  { id: "ach2", title: "ICAN Foundation Level — Distinction", description: "Passed all papers at Distinction level in the ICAN Foundation examination.", year: 2025, verified: true, verifiedAt: "2025-06-20" },
  { id: "ach3", title: "Published Research Paper", description: "Co-authored 'Fintech Adoption Among SMEs in Northeast Nigeria' in the Journal of Financial Innovation.", year: 2025, verified: false, verifiedAt: null },
  { id: "ach4", title: "Volunteer — Gombe Tech Hub", description: "100+ hours of volunteer teaching programming and financial literacy to secondary school students.", year: 2025, verified: false, verifiedAt: null },
  { id: "ach5", title: "Access Bank Graduate Trainee — Top Performer", description: "Recognized as Top Performing Graduate Trainee for Q3 2025.", year: 2025, verified: true, verifiedAt: "2025-10-01" },
];

export const mockBadges = [
  { id: "b1", badgeType: "PROFILE_COMPLETE" as const, label: "Profile Complete", description: "Achieved 100% profile completion", awardedAt: "2025-04-10", icon: "shield-check", locked: false },
  { id: "b2", badgeType: "EARLY_ADOPTER" as const, label: "Early Adopter", description: "Among the first 500 to join the platform", awardedAt: "2025-03-01", icon: "rocket", locked: false },
  { id: "b3", badgeType: "FIRST_CLASS_HONOURS" as const, label: "First Class Honours", description: "Graduated with First Class Honours", awardedAt: null, icon: "award", locked: true },
  { id: "b4", badgeType: "MENTOR" as const, label: "Mentor", description: "Active mentor helping fellow alumni", awardedAt: null, icon: "graduation-cap", locked: true },
  { id: "b5", badgeType: "JOB_POSTER" as const, label: "Job Poster", description: "Posted 3+ job opportunities", awardedAt: null, icon: "briefcase", locked: true },
  { id: "b6", badgeType: "TOP_CONNECTOR" as const, label: "Top Connector", description: "Received 50+ profile views", awardedAt: "2026-01-15", icon: "users", locked: false },
  { id: "b7", badgeType: "VERIFIED" as const, label: "Verified Employment", description: "Employment verified by admin", awardedAt: "2025-08-20", icon: "badge-check", locked: false },
];

// ── Activity Feed Mock Data ──

export const mockFeedItems = [
  { id: "f1", graduateName: "Fatima Yusuf", department: "Computer Science", actionType: "UPDATED_JOB" as const, headline: "Fatima Yusuf updated her job to Senior Software Engineer at Paystack", createdAt: "2026-03-02T09:30:00Z", isPublic: true },
  { id: "f2", graduateName: "Musa Aliyu", department: "Accounting", actionType: "POSTED_JOB" as const, headline: "Musa Aliyu posted a new job: Senior Accountant at Deloitte Nigeria", createdAt: "2026-03-01T14:15:00Z", isPublic: true },
  { id: "f3", graduateName: "Amina Bello", department: "Medicine", actionType: "JOINED_GROUP" as const, headline: "Amina Bello joined the Medical Alumni Symposium group", createdAt: "2026-03-01T11:00:00Z", isPublic: true },
  { id: "f4", graduateName: "Ibrahim Danjuma", department: "Civil Engineering", actionType: "JOINED_PLATFORM" as const, headline: "Ibrahim Danjuma joined Alumni Connect — welcome!", createdAt: "2026-02-28T16:45:00Z", isPublic: true },
  { id: "f5", graduateName: "Hauwa Mohammed", department: "Pharmacy", actionType: "PROFILE_COMPLETED" as const, headline: "Hauwa Mohammed completed her profile — 100% done!", createdAt: "2026-02-28T10:30:00Z", isPublic: true },
  { id: "f6", graduateName: "Zainab Suleiman", department: "Biochemistry", actionType: "POSTED_IN_GROUP" as const, headline: "Zainab Suleiman posted in Faculty of Science Alumni: 'Research opportunity at NNPC'", createdAt: "2026-02-27T15:20:00Z", isPublic: true },
  { id: "f7", graduateName: "Usman Bala", department: "Business Administration", actionType: "POSTED_JOB" as const, headline: "Usman Bala posted a new job: Product Manager at Kuda Bank", createdAt: "2026-02-27T09:00:00Z", isPublic: true },
  { id: "f8", graduateName: "Abdullahi Garba", department: "English", actionType: "GRADUATION_ANNIVERSARY" as const, headline: "Abdullahi Garba celebrates 6 years since graduation 🎉", createdAt: "2026-02-26T08:00:00Z", isPublic: true },
  { id: "f9", graduateName: "Abubakar Ibrahim", department: "Accounting", actionType: "UPDATED_JOB" as const, headline: "Abubakar Ibrahim started a new role as Financial Analyst at Access Bank", createdAt: "2026-02-25T12:00:00Z", isPublic: true },
  { id: "f10", graduateName: "Halima Abubakar", department: "Educational Psychology", actionType: "JOINED_PLATFORM" as const, headline: "Halima Abubakar joined Alumni Connect — welcome!", createdAt: "2026-02-24T18:30:00Z", isPublic: true },
];

// ── Admin Mentorship Mock Data ──

export const mockAdminMentorships = [
  { id: "am1", mentorName: "Dr. Amina Bello", mentorDept: "Medicine", menteeName: "Abubakar Ibrahim", menteeDept: "Accounting", subject: "Career Guidance in Healthcare", status: "ACCEPTED" as const, createdAt: "2026-01-15", acceptedAt: "2026-01-16" },
  { id: "am2", mentorName: "Fatima Yusuf", mentorDept: "Computer Science", menteeName: "Ibrahim Danjuma", menteeDept: "Civil Engineering", subject: "Transition to Tech", status: "ACCEPTED" as const, createdAt: "2026-02-01", acceptedAt: "2026-02-03" },
  { id: "am3", mentorName: "Usman Bala", mentorDept: "Business Admin", menteeName: "Halima Abubakar", menteeDept: "Education", subject: "Product Management Career", status: "PENDING" as const, createdAt: "2026-02-25", acceptedAt: null },
  { id: "am4", mentorName: "Zainab Suleiman", mentorDept: "Biochemistry", menteeName: "Musa Aliyu", menteeDept: "Accounting", subject: "Data Science for Finance", status: "ACCEPTED" as const, createdAt: "2026-01-10", acceptedAt: "2026-01-12" },
  { id: "am5", mentorName: "Abdullahi Garba", mentorDept: "English", menteeName: "Hauwa Mohammed", menteeDept: "Pharmacy", subject: "Content Writing & Personal Brand", status: "COMPLETED" as const, createdAt: "2025-10-01", acceptedAt: "2025-10-02" },
  { id: "am6", mentorName: "Dr. Hassan Abubakar", mentorDept: "Pharmacy", menteeName: "Fatima Yusuf", menteeDept: "Computer Science", subject: "Pharmaceutical Tech", status: "DECLINED" as const, createdAt: "2026-02-20", acceptedAt: null },
];

// ── Admin Network/Connections Mock Data ──

export const mockAdminNetworkStats = {
  totalConnections: 2840,
  acceptedConnections: 2156,
  pendingConnections: 489,
  blockedConnections: 195,
  avgConnectionsPerUser: 4.2,
};

export const mockConnectionsByFaculty = [
  { faculty: "Arts & Social Sciences", connections: 980 },
  { faculty: "Science", connections: 756 },
  { faculty: "Education", connections: 520 },
  { faculty: "Medicine", connections: 340 },
  { faculty: "Pharmacy", connections: 244 },
];

export const mockConnectionsGrowth = [
  { month: "Sep", connections: 120 },
  { month: "Oct", connections: 340 },
  { month: "Nov", connections: 580 },
  { month: "Dec", connections: 890 },
  { month: "Jan", connections: 1450 },
  { month: "Feb", connections: 2156 },
];

export const mockTopConnectors = [
  { id: "tc1", name: "Fatima Yusuf", department: "Computer Science", connections: 67, image: null },
  { id: "tc2", name: "Musa Aliyu", department: "Accounting", connections: 54, image: null },
  { id: "tc3", name: "Zainab Suleiman", department: "Biochemistry", connections: 48, image: null },
  { id: "tc4", name: "Usman Bala", department: "Business Admin", connections: 45, image: null },
  { id: "tc5", name: "Abubakar Ibrahim", department: "Accounting", connections: 42, image: null },
];