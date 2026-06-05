import { pgTable, serial, text, integer, timestamp, boolean, real, jsonb, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("applicant"), // "applicant" | "officer" | "admin"
  plainPassword: text("plain_password"), // Stored for officer accounts so admin can view credentials
  assignedCountry: text("assigned_country"), // For officers
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  dateOfBirth: text("date_of_birth"),
  phone: text("phone"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true }).extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ─── VISA APPLICATIONS ───────────────────────────────────────────────────────
export const visaApplications = pgTable("visa_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  applicationType: text("application_type").notNull(), // "new" | "renewal"
  visaType: text("visa_type").notNull(), // "tourist" | "student" | "work" | "business" | "transit"
  purposeOfVisit: text("purpose_of_visit").notNull(),
  destinationCountry: text("destination_country").notNull(),
  intendedEntryDate: text("intended_entry_date"),
  intendedExitDate: text("intended_exit_date"),
  status: text("status").notNull().default("pending"), // "pending" | "document_review" | "security_check" | "risk_assessment" | "blockchain_entry" | "granted" | "denied" | "renewal_due"
  currentStage: integer("current_stage").notNull().default(1), // 1-6
  riskScore: real("risk_score"), // 0-100
  riskLevel: text("risk_level"), // "low" | "medium" | "high"
  aiAnalysisSummary: text("ai_analysis_summary"),
  blockchainHash: text("blockchain_hash"),
  blockchainTxId: text("blockchain_tx_id"),
  qrCodeData: text("qr_code_data"),
  visaNumber: text("visa_number"),
  grantedAt: timestamp("granted_at"),
  expiryDate: text("expiry_date"),
  denialReason: text("denial_reason"),
  officerNotes: text("officer_notes"),
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVisaApplicationSchema = createInsertSchema(visaApplications).omit({
  id: true, createdAt: true, updatedAt: true, status: true, currentStage: true,
  riskScore: true, riskLevel: true, aiAnalysisSummary: true, blockchainHash: true,
  blockchainTxId: true, qrCodeData: true, visaNumber: true, grantedAt: true,
  denialReason: true, officerNotes: true, renewalReminderSent: true,
});

export type VisaApplication = typeof visaApplications.$inferSelect;
export type InsertVisaApplication = z.infer<typeof insertVisaApplicationSchema>;

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => visaApplications.id),
  documentType: text("document_type").notNull(), // "passport" | "photo" | "financial" | "invitation" | "itinerary" | "insurance"
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"), // Supabase Storage public URL
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  verified: boolean("verified").default(false),
  aiConfidenceScore: real("ai_confidence_score"), // 0-1
  aiVerificationNotes: text("ai_verification_notes"),
  extractedData: jsonb("extracted_data"), // OCR extracted fields
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true, uploadedAt: true, verified: true, aiConfidenceScore: true,
  aiVerificationNotes: true, extractedData: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// ─── STATUS TIMELINE ─────────────────────────────────────────────────────────
export const statusTimeline = pgTable("status_timeline", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => visaApplications.id),
  stage: integer("stage").notNull(), // 1-6
  stageName: text("stage_name").notNull(),
  status: text("status").notNull(), // "pending" | "in_progress" | "completed" | "failed"
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type StatusTimeline = typeof statusTimeline.$inferSelect;

// ─── CHAT MESSAGES ───────────────────────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  applicationId: integer("application_id").references(() => visaApplications.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

// ─── BLOCKCHAIN LEDGER ───────────────────────────────────────────────────────
export const blockchainLedger = pgTable("blockchain_ledger", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => visaApplications.id),
  visaNumber: text("visa_number").notNull(),
  blockHash: text("block_hash").notNull(),
  previousHash: text("previous_hash"),
  txId: text("tx_id").notNull(),
  blockIndex: integer("block_index").notNull(),
  holderName: text("holder_name").notNull(),
  holderPassport: text("holder_passport").notNull(),
  visaType: text("visa_type").notNull(),
  issuedAt: timestamp("issued_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text("expires_at").notNull(),
  merkleRoot: text("merkle_root"),
  nonce: integer("nonce"),
  isValid: boolean("is_valid").default(true),
});

export type BlockchainLedgerEntry = typeof blockchainLedger.$inferSelect;

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// ─── VIDEO INTERVIEWS ─────────────────────────────────────────────────────────
export const videoInterviews = pgTable("video_interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => visaApplications.id),
  officerId: integer("officer_id").notNull().references(() => users.id),
  applicantId: integer("applicant_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  status: text("status").notNull().default("scheduled"), // "scheduled" | "in_progress" | "completed" | "cancelled" | "missed"
  roomName: text("room_name").notNull(), // Jitsi room name (unique per interview)
  initiatedBy: text("initiated_by").notNull(), // "officer" | "applicant"
  requestNote: text("request_note"), // optional message when requesting
  interviewResult: text("interview_result"), // "passed" | "failed" | "pending"
  officerNotes: text("officer_notes"), // notes taken by officer after interview
  applicationStatusUpdated: boolean("application_status_updated").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVideoInterviewSchema = createInsertSchema(videoInterviews).omit({
  id: true, createdAt: true, updatedAt: true, status: true,
  interviewResult: true, officerNotes: true, applicationStatusUpdated: true,
});

export type VideoInterview = typeof videoInterviews.$inferSelect;
export type InsertVideoInterview = z.infer<typeof insertVideoInterviewSchema>;

// ─── RE-EXPORT CHAT SCHEMA (used by integration) ─────────────────────────────
export { conversations, messages } from "./models/chat";
