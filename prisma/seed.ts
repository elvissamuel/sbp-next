import { PrismaClient } from "@prisma/client"
import { generateSlug } from "../lib/utils"

const prisma = new PrismaClient()

async function main() {
  // Upsert sample organization (creates if not exists, updates if exists)
  const org = await prisma.organization.upsert({
    where: { slug: "sample-org" },
    update: {
      name: "Sample Organization",
      description: "A sample organization for testing",
    },
    create: {
      name: "Sample Organization",
      slug: "sample-org",
      description: "A sample organization for testing",
    },
  })

  console.log("Sample organization upserted:", org)

  // Upsert sample user
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Admin User",
    },
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: "passowrd"
    },
  })

  console.log("Sample user upserted:", user)

  // Upsert organization member
  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {
      role: "admin",
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "admin",
    },
  })

  console.log("Organization member upserted:", member)

  // Create System organization for default courses
  const systemOrg = await prisma.organization.upsert({
    where: { slug: "system-default-courses" },
    update: {
      name: "System Default Courses",
      description: "System organization holding default courses available to all organizations",
    },
    create: {
      name: "System Default Courses",
      slug: "system-default-courses",
      description: "System organization holding default courses available to all organizations",
    },
  })

  console.log("System organization upserted:", systemOrg)

  // Seed default courses
  await seedDefaultCourses(systemOrg.id)
}

async function seedDefaultCourses(organizationId: string) {
  // Course 1: Professional Communication Skills
  const communicationCourse = await prisma.course.upsert({
    where: { slug: "professional-communication-skills" },
    update: {
      title: "Professional Communication Skills",
      description: "Master the art of effective communication in professional settings. This course covers verbal and written communication, active listening, presentation skills, and cross-cultural communication.",
      status: "published",
      level: "beginner",
    },
    create: {
      organizationId,
      title: "Professional Communication Skills",
      description: "Master the art of effective communication in professional settings. This course covers verbal and written communication, active listening, presentation skills, and cross-cultural communication.",
      slug: "professional-communication-skills",
      status: "published",
      level: "beginner",
      price: 0,
    },
  })

  console.log("Communication course created:", communicationCourse.id)

  // Course 1 Lessons - Delete existing lessons first, then create new ones
  await prisma.lesson.deleteMany({
    where: { courseId: communicationCourse.id },
  })

  const commLesson1 = await prisma.lesson.create({
    data: {
      courseId: communicationCourse.id,
      title: "Introduction to Professional Communication",
      content: `# Introduction to Professional Communication

Effective communication is the cornerstone of professional success. Whether you're interacting with colleagues, clients, or stakeholders, your ability to communicate clearly and effectively can make or break your professional relationships and career advancement.

## Why Communication Matters

Professional communication skills are essential because they:

- Build trust and credibility with colleagues and clients
- Enhance teamwork and collaboration
- Improve problem-solving and decision-making
- Increase productivity and efficiency
- Support career advancement and leadership opportunities

## Types of Professional Communication

In the workplace, you'll encounter various forms of communication:

- **Verbal Communication**: Face-to-face conversations, phone calls, video conferences
- **Written Communication**: Emails, reports, memos, documentation
- **Non-verbal Communication**: Body language, facial expressions, tone of voice
- **Digital Communication**: Instant messaging, collaboration platforms, social media

## Key Principles

Effective professional communication follows these core principles:

- **Clarity**: Use clear, concise language that your audience can easily understand
- **Respect**: Show consideration for others' perspectives and time
- **Active Listening**: Pay attention and respond thoughtfully to what others are saying
- **Appropriateness**: Match your communication style to the context and audience
- **Professionalism**: Maintain a professional tone and demeanor at all times

## What You'll Learn

Throughout this course, you'll develop skills in:

- Written communication and email etiquette
- Verbal communication and public speaking
- Active listening and empathetic responses
- Non-verbal communication awareness
- Cross-cultural communication
- Conflict resolution and difficult conversations

Let's begin your journey to becoming a more effective professional communicator!`,
      order: 1,
      duration: 15,
    },
  })

  const commLesson2 = await prisma.lesson.create({
    data: {
      courseId: communicationCourse.id,
      title: "Written Communication and Email Etiquette",
      content: `# Written Communication and Email Etiquette

In today's digital workplace, written communication, especially email, is one of the most common forms of professional interaction. Mastering email etiquette and written communication skills is crucial for maintaining professional relationships and ensuring your messages are received positively.

## The Importance of Clear Writing

Well-written messages:

- Save time for both sender and recipient
- Reduce misunderstandings and errors
- Project professionalism and competence
- Enhance your personal and organizational brand
- Improve decision-making through clear information

## Email Best Practices

### Subject Lines

- Use clear, descriptive subject lines that summarize the email's purpose
- Include action items or deadlines when relevant
- Keep it concise (ideally under 50 characters)
- Update subject lines when the topic changes in a thread

### Structure and Formatting

- Start with a polite greeting
- Use paragraphs to organize your thoughts
- Keep paragraphs short (3-4 sentences)
- Use bullet points for lists
- Include a clear call-to-action or next steps
- End with a professional closing

### Tone and Language

- Use a professional but friendly tone
- Avoid jargon unless your audience is familiar with it
- Be concise but complete
- Proofread before sending
- Avoid ALL CAPS (it looks like shouting)
- Use exclamation marks sparingly

## Common Email Mistakes to Avoid

- Sending emails when a conversation would be more appropriate
- Including too many people (CC/BCC abuse)
- Replying to all unnecessarily
- Sending emails when you're emotional or angry
- Using vague or unclear language
- Forgetting to attach files you mentioned
- Ignoring emails that require a response

## Responding to Emails

- Respond within 24-48 hours, even if just to acknowledge receipt
- Read the entire email before responding
- Address all questions or requests
- Keep responses concise and to the point
- Use "Reply All" only when everyone needs the information

## Other Written Communication Formats

Beyond email, professionals often use:

- **Reports**: Formal documents with analysis and recommendations
- **Memos**: Internal communications for policies or announcements
- **Proposals**: Documents outlining plans or solutions
- **Documentation**: Technical or procedural writing

Each format has its own conventions and best practices, but they all share the need for clarity, organization, and professionalism.`,
      order: 2,
      duration: 20,
    },
  })

  const commLesson3 = await prisma.lesson.create({
    data: {
      courseId: communicationCourse.id,
      title: "Active Listening and Empathetic Communication",
      content: `# Active Listening and Empathetic Communication

Listening is more than just hearing words—it's about understanding the full message, including emotions, intentions, and underlying concerns. Active listening and empathy are skills that can transform your professional relationships and make you a more effective communicator.

## The Difference Between Hearing and Listening

- **Hearing**: The physical process of receiving sound waves
- **Listening**: The active process of understanding and interpreting what you hear
- **Active Listening**: Engaging fully with the speaker to understand their complete message

Many people think they're good listeners, but research shows that we typically remember only 25-50% of what we hear. Active listening helps bridge this gap.

## Components of Active Listening

### Paying Full Attention

- Put away distractions (phone, computer, other tasks)
- Make eye contact (or maintain focus in virtual settings)
- Show through body language that you're engaged
- Avoid interrupting the speaker

### Understanding the Message

- Focus on both words and non-verbal cues
- Listen for main ideas and supporting details
- Identify the speaker's emotions and concerns
- Ask clarifying questions when needed

### Responding Appropriately

- Provide verbal and non-verbal feedback
- Summarize or paraphrase to confirm understanding
- Ask relevant questions
- Offer thoughtful responses

## Barriers to Effective Listening

Common obstacles include:

- **Prejudgment**: Making assumptions before hearing the full message
- **Interrupting**: Cutting off the speaker to share your own thoughts
- **Distractions**: External noise or internal thoughts
- **Emotional reactions**: Becoming defensive or emotional
- **Information overload**: Trying to process too much at once
- **Preparing your response**: Focusing on what you'll say next instead of listening

## Empathetic Communication

Empathy involves understanding and sharing the feelings of another person. In professional settings, this means:

- Recognizing emotions in others
- Understanding different perspectives
- Responding with compassion and respect
- Validating others' experiences without judgment

## Techniques for Active Listening

1. **Paraphrasing**: Restate what you heard in your own words
   - "So if I understand correctly, you're saying..."
   - "It sounds like you feel..."

2. **Reflecting Feelings**: Acknowledge the emotions you detect
   - "I can sense that this is frustrating for you..."
   - "You seem excited about this opportunity..."

3. **Asking Open-Ended Questions**: Encourage elaboration
   - "Can you tell me more about...?"
   - "What do you think about...?"

4. **Summarizing**: Recap the main points
   - "Let me make sure I've got this right..."
   - "So the key points are..."

## Benefits of Active Listening

When you practice active listening, you:

- Build stronger professional relationships
- Reduce misunderstandings and conflicts
- Gain better information for decision-making
- Increase trust and credibility
- Improve problem-solving outcomes
- Create a more positive work environment

Remember: Active listening is a skill that requires practice. Start by implementing one or two techniques, and gradually incorporate more as you become comfortable.`,
      order: 3,
      duration: 18,
    },
  })

  // Course 1 Quiz - Delete existing quizzes first
  await prisma.quiz.deleteMany({
    where: { courseId: communicationCourse.id },
  })

  const commQuiz = await prisma.quiz.create({
    data: {
      courseId: communicationCourse.id,
      title: "Professional Communication Skills Assessment",
      description: "Test your understanding of professional communication principles",
      passingScore: 70,
      totalPoints: 100,
    },
  })

  // Course 1 Quiz Questions
  const commQuizQuestions = [
    {
      question: "What is the primary difference between hearing and active listening?",
      options: JSON.stringify([
        "Hearing requires more effort than active listening",
        "Active listening involves understanding and engaging with the message, while hearing is just receiving sound",
        "Hearing is more important in professional settings",
        "There is no difference between the two"
      ]),
      correctAnswer: "Active listening involves understanding and engaging with the message, while hearing is just receiving sound",
      points: 20,
      order: 0,
    },
    {
      question: "Which of the following is a best practice for email subject lines?",
      options: JSON.stringify([
        "Use all capital letters to ensure visibility",
        "Leave the subject line blank for informal emails",
        "Use clear, descriptive text that summarizes the email's purpose",
        "Use emojis to make emails more friendly"
      ]),
      correctAnswer: "Use clear, descriptive text that summarizes the email's purpose",
      points: 20,
      order: 1,
    },
    {
      question: "What is the recommended response time for professional emails?",
      options: JSON.stringify([
        "Within 1 hour",
        "Within 24-48 hours",
        "Within one week",
        "Whenever you have free time"
      ]),
      correctAnswer: "Within 24-48 hours",
      points: 20,
      order: 2,
    },
    {
      question: "Which technique involves restating what you heard in your own words?",
      options: JSON.stringify([
        "Reflecting feelings",
        "Paraphrasing",
        "Summarizing",
        "Interrupting"
      ]),
      correctAnswer: "Paraphrasing",
      points: 20,
      order: 3,
    },
    {
      question: "What is a key benefit of active listening in professional settings?",
      options: JSON.stringify([
        "It allows you to speak more often",
        "It reduces misunderstandings and builds stronger relationships",
        "It helps you avoid having to respond",
        "It makes conversations shorter"
      ]),
      correctAnswer: "It reduces misunderstandings and builds stronger relationships",
      points: 20,
      order: 4,
    },
  ]

  // Delete existing questions first
  await prisma.quizQuestion.deleteMany({
    where: { quizId: commQuiz.id },
  })

  for (const question of commQuizQuestions) {
    await prisma.quizQuestion.create({
      data: {
        quizId: commQuiz.id,
        question: question.question,
        type: "multiple_choice",
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
        order: question.order,
      },
    })
  }

  console.log("Communication course lessons and quiz created")

  // Course 2: Digital Literacy Fundamentals
  const digitalCourse = await prisma.course.upsert({
    where: { slug: "digital-literacy-fundamentals" },
    update: {
      title: "Digital Literacy Fundamentals",
      description: "Develop essential digital skills for the modern workplace. This course covers computer basics, internet safety, productivity tools, data management, and cybersecurity fundamentals.",
      status: "published",
      level: "beginner",
    },
    create: {
      organizationId,
      title: "Digital Literacy Fundamentals",
      description: "Develop essential digital skills for the modern workplace. This course covers computer basics, internet safety, productivity tools, data management, and cybersecurity fundamentals.",
      slug: "digital-literacy-fundamentals",
      status: "published",
      level: "beginner",
      price: 0,
    },
  })

  console.log("Digital literacy course created:", digitalCourse.id)

  // Course 2 Lessons - Delete existing lessons first
  await prisma.lesson.deleteMany({
    where: { courseId: digitalCourse.id },
  })

  const digitalLesson1 = await prisma.lesson.create({
    data: {
      courseId: digitalCourse.id,
      title: "Introduction to Digital Literacy",
      content: `# Introduction to Digital Literacy

Digital literacy has become a fundamental requirement in today's professional environment. Whether you're working in technology, finance, healthcare, education, or any other field, having strong digital skills is essential for success.

## What is Digital Literacy?

Digital literacy refers to the ability to use digital technology, communication tools, and networks to find, evaluate, create, and communicate information effectively. It goes beyond basic computer skills to include:

- Understanding how digital tools work
- Knowing how to use technology safely and responsibly
- Being able to adapt to new technologies
- Understanding digital information and its sources
- Creating and sharing digital content effectively

## Why Digital Literacy Matters

In the modern workplace, digital literacy is crucial because:

- Most jobs now require some level of digital competency
- Digital tools increase productivity and efficiency
- Remote and hybrid work environments rely heavily on digital skills
- Continuous learning and adaptation are necessary as technology evolves
- Digital communication is the standard in professional settings

## Core Digital Skills

### Basic Computer Skills

- Operating system navigation (Windows, macOS, or Linux)
- File management and organization
- Basic troubleshooting
- Software installation and updates

### Internet and Web Skills

- Effective web searching
- Evaluating online information
- Understanding web browsers
- Online safety and security awareness

### Productivity Tools

- Word processing and document creation
- Spreadsheets and data management
- Presentation software
- Email and communication platforms

### Digital Communication

- Professional email communication
- Video conferencing tools
- Collaboration platforms
- Social media for professional use

## Digital Safety and Security

Understanding how to protect yourself and your organization online is a critical component of digital literacy:

- Password security and management
- Recognizing phishing and scams
- Safe browsing practices
- Data privacy and protection
- Backing up important information

## Adapting to New Technology

Technology evolves rapidly, so digital literacy also means:

- Being willing to learn new tools and platforms
- Understanding that technology changes constantly
- Knowing how to find help and resources when learning
- Being patient with yourself and others during transitions

## What You'll Learn

This course will help you develop:

- Confidence in using digital tools
- Understanding of digital safety practices
- Skills with common productivity software
- Knowledge of data management basics
- Awareness of cybersecurity fundamentals
- Ability to adapt to new technologies

Let's begin building your digital literacy skills!`,
      order: 1,
      duration: 15,
    },
  })

  const digitalLesson2 = await prisma.lesson.create({
    data: {
      courseId: digitalCourse.id,
      title: "Internet Safety and Cybersecurity Basics",
      content: `# Internet Safety and Cybersecurity Basics

As we spend more time online for both personal and professional purposes, understanding internet safety and cybersecurity has become essential. Protecting yourself, your data, and your organization from online threats is a critical skill in today's digital world.

## Understanding Online Threats

The internet, while valuable, presents various security risks:

- **Malware**: Malicious software designed to damage or gain unauthorized access
- **Phishing**: Attempts to trick you into revealing personal information
- **Identity Theft**: Unauthorized use of your personal information
- **Data Breaches**: Unauthorized access to sensitive information
- **Ransomware**: Malware that locks your files until you pay a ransom

## Password Security

Strong passwords are your first line of defense:

### Creating Strong Passwords

- Use at least 12 characters
- Include a mix of uppercase and lowercase letters, numbers, and symbols
- Avoid common words, phrases, or personal information
- Use unique passwords for different accounts
- Consider using passphrases (long combinations of words)

### Password Management

- Use a reputable password manager to store passwords securely
- Enable two-factor authentication (2FA) when available
- Change passwords periodically, especially after security incidents
- Never share passwords with others
- Avoid writing passwords down in easily accessible places

## Recognizing Phishing and Scams

Phishing attempts are becoming increasingly sophisticated:

### Warning Signs

- Urgent or threatening language
- Requests for personal information or passwords
- Suspicious sender email addresses
- Poor grammar or spelling (though this is less common now)
- Unexpected attachments or links
- Offers that seem too good to be true

### What to Do

- Verify the sender through a different channel if unsure
- Hover over links to see the actual destination before clicking
- Never provide sensitive information via email
- When in doubt, contact the organization directly through official channels
- Report suspicious emails to your IT department

## Safe Browsing Practices

- Keep your browser and operating system updated
- Use HTTPS websites (look for the padlock icon)
- Be cautious when downloading files
- Avoid clicking on suspicious links or ads
- Use reputable antivirus and security software
- Clear browser cookies and cache regularly

## Data Privacy and Protection

### Personal Information

- Be mindful of what information you share online
- Review privacy settings on social media and websites
- Limit the amount of personal information in public profiles
- Understand how organizations use your data
- Use privacy-focused browsers and search engines when possible

### Data Backup

- Regularly back up important files
- Use cloud storage services for automatic backups
- Keep multiple backup copies in different locations
- Test backups to ensure they can be restored
- Include both personal and professional data in backup strategies

## Workplace Cybersecurity

In professional settings:

- Follow your organization's security policies
- Use only approved software and applications
- Keep work devices secure and updated
- Be cautious with work email and data
- Report security incidents immediately
- Understand your role in protecting organizational data

## Best Practices Summary

- Use strong, unique passwords and enable 2FA
- Be skeptical of unexpected emails and requests
- Keep software and systems updated
- Back up important data regularly
- Follow organizational security policies
- Stay informed about current security threats
- When in doubt, ask for help from IT professionals

Remember: Cybersecurity is everyone's responsibility. By practicing good security habits, you protect not only yourself but also your colleagues and organization.`,
      order: 2,
      duration: 25,
    },
  })

  const digitalLesson3 = await prisma.lesson.create({
    data: {
      courseId: digitalCourse.id,
      title: "Productivity Tools and File Management",
      content: `# Productivity Tools and File Management

Effective use of productivity tools and good file management practices can significantly enhance your efficiency and organization in both personal and professional settings. This lesson covers essential tools and strategies for managing your digital work.

## Common Productivity Tools

### Word Processing

Word processors are used for creating and editing documents:

- Creating reports, letters, and documents
- Formatting text and layouts
- Adding images, tables, and charts
- Collaboration and sharing features
- Version control and tracking changes

Common tools include Microsoft Word, Google Docs, and LibreOffice Writer.

### Spreadsheets

Spreadsheets help organize and analyze data:

- Data entry and organization
- Calculations and formulas
- Charts and graphs
- Data sorting and filtering
- Budgeting and financial planning

Common tools include Microsoft Excel, Google Sheets, and LibreOffice Calc.

### Presentation Software

Presentations help communicate ideas visually:

- Creating slideshows for meetings and reports
- Incorporating multimedia elements
- Designing engaging layouts
- Presenting to audiences
- Sharing and collaboration

Common tools include Microsoft PowerPoint, Google Slides, and LibreOffice Impress.

## File Management Best Practices

### Organizing Files and Folders

Good organization saves time and reduces stress:

- Create a logical folder structure
- Use clear, descriptive file names
- Include dates in filenames when relevant (e.g., "Report_2024-03-15")
- Group related files together
- Avoid deep folder nesting (too many subfolders)
- Use consistent naming conventions

### File Naming Conventions

Effective file names:

- Are descriptive and meaningful
- Include relevant dates or version numbers
- Use underscores or hyphens instead of spaces
- Avoid special characters that may cause issues
- Are consistent across similar files
- Make it easy to find files later

### File Storage Options

Understanding where to store files:

- **Local Storage**: Files stored on your device's hard drive
- **Cloud Storage**: Files stored on remote servers (Google Drive, OneDrive, Dropbox)
- **Network Storage**: Files stored on organizational servers
- **External Storage**: USB drives, external hard drives

Each option has advantages and appropriate use cases.

## Digital Organization Strategies

### Using Folders Effectfully

- Create folders by project, client, or topic
- Use consistent folder structures across projects
- Archive old files rather than deleting
- Regularly review and clean up unused files
- Use folder naming conventions consistently

### Tags and Metadata

Many systems allow you to:

- Add tags to files for easy searching
- Use metadata to organize files
- Create custom categories
- Filter and search using multiple criteria

### Search Functionality

Modern operating systems have powerful search:

- Learn to use search effectively
- Use keywords that are likely in your files
- Combine search terms for better results
- Save frequent searches
- Use advanced search options when needed

## Collaboration and Sharing

### Cloud-Based Collaboration

Many productivity tools now offer:

- Real-time collaboration
- Comment and suggestion features
- Version history and revision tracking
- Access control and permissions
- Mobile access and synchronization

### Sharing Files Securely

When sharing files:

- Understand sharing permissions and settings
- Only share with people who need access
- Use secure sharing methods
- Be mindful of sensitive information
- Set expiration dates for shared links when possible

## Backup and Version Control

### Regular Backups

- Set up automatic backups when possible
- Backup important files regularly
- Test backups to ensure they work
- Keep backups in multiple locations
- Include both cloud and local backups

### Version Control

- Save multiple versions of important documents
- Use version numbers or dates in filenames
- Keep a master copy of important files
- Document major changes between versions
- Use built-in version history features when available

## Tips for Increased Productivity

- Learn keyboard shortcuts for common tasks
- Use templates for frequently created documents
- Automate repetitive tasks when possible
- Keep your workspace (desktop/folders) organized
- Close unnecessary applications and files
- Regularly update your software for new features
- Take advantage of tutorials and help resources

Remember: The goal is to develop a system that works for you and helps you be more efficient and organized. Start with basic organization, and gradually refine your approach as you become more comfortable with digital tools.`,
      order: 3,
      duration: 22,
    },
  })

  // Course 2 Quiz - Delete existing quizzes first
  await prisma.quiz.deleteMany({
    where: { courseId: digitalCourse.id },
  })

  const digitalQuiz = await prisma.quiz.create({
    data: {
      courseId: digitalCourse.id,
      title: "Digital Literacy Fundamentals Assessment",
      description: "Test your understanding of digital literacy and cybersecurity basics",
      passingScore: 70,
      totalPoints: 100,
    },
  })

  // Course 2 Quiz Questions
  const digitalQuizQuestions = [
    {
      question: "What is the recommended minimum length for a strong password?",
      options: JSON.stringify([
        "6 characters",
        "8 characters",
        "12 characters",
        "16 characters"
      ]),
      correctAnswer: "12 characters",
      points: 20,
      order: 0,
    },
    {
      question: "What is phishing?",
      options: JSON.stringify([
        "A type of computer virus",
        "A method of catching fish",
        "An attempt to trick you into revealing personal information",
        "A type of software update"
      ]),
      correctAnswer: "An attempt to trick you into revealing personal information",
      points: 20,
      order: 1,
    },
    {
      question: "Which of the following is a best practice for file management?",
      options: JSON.stringify([
        "Use very deep folder nesting",
        "Use clear, descriptive file names",
        "Avoid organizing files into folders",
        "Never backup your files"
      ]),
      correctAnswer: "Use clear, descriptive file names",
      points: 20,
      order: 2,
    },
    {
      question: "What does 2FA stand for?",
      options: JSON.stringify([
        "Two File Access",
        "Two-Factor Authentication",
        "Two Function Analysis",
        "Two Folder Archive"
      ]),
      correctAnswer: "Two-Factor Authentication",
      points: 20,
      order: 3,
    },
    {
      question: "Which of the following is a key component of digital literacy?",
      options: JSON.stringify([
        "Only using one type of software",
        "Understanding how to use technology safely and responsibly",
        "Avoiding all digital tools",
        "Using the same password for all accounts"
      ]),
      correctAnswer: "Understanding how to use technology safely and responsibly",
      points: 20,
      order: 4,
    },
  ]

  // Delete existing questions first
  await prisma.quizQuestion.deleteMany({
    where: { quizId: digitalQuiz.id },
  })

  for (const question of digitalQuizQuestions) {
    await prisma.quizQuestion.create({
      data: {
        quizId: digitalQuiz.id,
        question: question.question,
        type: "multiple_choice",
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
        order: question.order,
      },
    })
  }

  console.log("Digital literacy course lessons and quiz created")
  console.log("Default courses seeding completed!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
