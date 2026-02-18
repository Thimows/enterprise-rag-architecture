import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../init"
import { document } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"

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

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME ?? ""
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "documents"
const credential = new DefaultAzureCredential()
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  credential,
)

async function generateSasUrl(blobPath: string): Promise<string> {
  if (!accountName) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Storage not configured",
    })
  }

  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blobClient = containerClient.getBlobClient(blobPath)

  const startsOn = new Date()
  const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000) // 1 hour

  const userDelegationKey = await blobServiceClient.getUserDelegationKey(
    startsOn,
    expiresOn,
  )

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
      contentDisposition: "inline",
      contentType: getContentType(blobPath),
    },
    userDelegationKey,
    accountName,
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

      return { url: await generateSasUrl(doc.blobUrl) }
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
