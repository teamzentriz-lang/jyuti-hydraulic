"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { inquiries } from "@/db/schema";

export type InquiryState = { ok: true; message: string } | { error: string } | null;

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(4).max(5000),
  source: z.enum(["contact", "quote", "product"]).optional().default("quote"),
  pagePath: z.string().trim().max(300).optional().default(""),
});

export async function submitInquiryAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  if (String(formData.get("companyWebsite") ?? "").trim()) {
    return { ok: true, message: "Thanks. Our team will contact you shortly." };
  }

  const parsed = inquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    source: formData.get("source") || "quote",
    pagePath: formData.get("pagePath"),
  });
  if (!parsed.success) {
    return { error: "Please add your name, a valid email, and a short message." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  try {
    await getDb()
      .insert(inquiries)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        company: parsed.data.company,
        subject: parsed.data.subject,
        message: parsed.data.message,
        source: parsed.data.source,
        pagePath: parsed.data.pagePath || null,
        productId: z.string().uuid().safeParse(productId).success ? productId : null,
      });
  } catch {
    return { error: "We could not save your enquiry. Please call us or try again." };
  }

  return { ok: true, message: "Thanks. Our team will contact you shortly." };
}

export async function subscribeNewsletterAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  if (String(formData.get("companyWebsite") ?? "").trim()) {
    return { ok: true, message: "You are subscribed." };
  }
  const email = z.string().trim().email().max(180).safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const name = email.data.split("@")[0]?.replace(/[._-]+/g, " ").trim().slice(0, 120) || "Subscriber";
  try {
    await getDb().insert(inquiries).values({
      name,
      email: email.data,
      subject: "Newsletter",
      message: "Newsletter subscription",
      source: "contact",
      pagePath: "/",
    });
  } catch {
    return { error: "We could not save that email. Please try again." };
  }
  return { ok: true, message: "You are subscribed." };
}
