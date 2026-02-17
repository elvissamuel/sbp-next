/**
 * Constants for job titles and departments
 * Used in user registration and employee management
 */

export const JOB_TITLES = [
  "Chief Executive Officer (CEO)",
  "Chief Technology Officer (CTO)",
  "Chief Financial Officer (CFO)",
  "Chief Operating Officer (COO)",
  "Chief Marketing Officer (CMO)",
  "Chief Human Resources Officer (CHRO)",
  "Vice President",
  "Director",
  "Senior Manager",
  "Manager",
  "Senior Engineer",
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Engineer",
  "Data Scientist",
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "UX Designer",
  "UI Designer",
  "Marketing Manager",
  "Sales Manager",
  "Account Manager",
  "Customer Success Manager",
  "HR Manager",
  "Recruiter",
  "Finance Manager",
  "Operations Manager",
  "Quality Assurance Engineer",
  "Technical Writer",
  "Content Manager",
  "Social Media Manager",
  "Administrative Assistant",
  "Executive Assistant",
  "Intern",
  "Consultant",
  "Other",
] as const

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "Human Resources",
  "Finance",
  "Operations",
  "Legal",
  "Security",
  "IT Support",
  "Research & Development",
  "Business Development",
  "Quality Assurance",
  "Content",
  "Communications",
  "Executive",
  "Administration",
  "Other",
] as const

export type JobTitle = typeof JOB_TITLES[number]
export type Department = typeof DEPARTMENTS[number]

