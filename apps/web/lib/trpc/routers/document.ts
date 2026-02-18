import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../init"
import { document } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob"

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
}

function getContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase()
  return CONTENT_TYPES[ext] ?? "application/octet-stream"
}

function generateSasUrl(blobPath: string): string {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "documents"

  if (!connectionString) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Storage not configured",
    })
  }

  const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1]
  const accountKey = connectionString.match(/AccountKey=([^;]+)/)?.[1]

  if (!accountName || !accountKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid storage connection string",
    })
  }

  // blobPath is a relative path like "orgId/folderId/file.pdf"
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blobClient = containerClient.getBlobClient(blobPath)

  const credential = new StorageSharedKeyCredential(accountName, accountKey)
  const startsOn = new Date()
  const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000) // 1 hour

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      contentDisposition: "inline",
      contentType: getContentType(blobPath),
    },
    credential,
  ).toString()

  return `${blobClient.url}?${sasToken}`
}

export const documentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ folderId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(document.organizationId, ctx.organizationId)]

      if (input?.folderId) {
        conditions.push(eq(document.folderId, input.folderId))
      }

      return ctx.db
        .select({
          id: document.id,
          name: document.name,
          fileType: document.fileType,
          fileSize: document.fileSize,
          status: document.status,
          error: document.error,
          createdAt: document.createdAt,
        })
        .from(document)
        .where(and(...conditions))
        .orderBy(desc(document.createdAt))
    }),

  getViewUrl: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.db.query.document.findFirst({
        where: and(
          eq(document.id, input.documentId),
          eq(document.organizationId, ctx.organizationId),
        ),
      })

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        })
      }

      return { url: generateSasUrl(doc.blobUrl) }
    }),

  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        folderId: z.string(),
        blobUrl: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(document)
        .values({
          id: input.id,
          organizationId: ctx.organizationId,
          folderId: input.folderId,
          name: input.name,
          blobUrl: input.blobUrl,
          fileType: input.fileType,
          fileSize: input.fileSize,
          status: "uploaded",
          error: null,
          uploadedBy: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [document.organizationId, document.folderId, document.name],
          set: {
            status: "uploaded",
            error: null,
            fileSize: input.fileSize,
            blobUrl: input.blobUrl,
          },
        })
        .returning({ id: document.id })

      return row
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(document)
        .where(
          and(
            eq(document.id, input.id),
            eq(document.organizationId, ctx.organizationId),
          ),
        )
      return { ok: true }
    }),
})
