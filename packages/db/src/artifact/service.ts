import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const ArtifactService = {

  async create(data: {
    type: string
    title: string
    content: any
    createdBy: string
  }) {
    return prisma.artifact.create({
      data: {
        type: data.type,
        title: data.title,
        content: data.content,
        status: 'draft',
        version: 1,
        createdBy: data.createdBy
      }
    })
  },

  async update(id: string, data: any) {
    return prisma.artifact.update({
      where: { id },
      data
    })
  },

  async list() {
    return prisma.artifact.findMany({
      orderBy: { createdAt: 'desc' }
    })
  },

  async get(id: string) {
    return prisma.artifact.findUnique({
      where: { id }
    })
  }

}
