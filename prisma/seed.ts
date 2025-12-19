import { PrismaClient } from "@prisma/client"

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
