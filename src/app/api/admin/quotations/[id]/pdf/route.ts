import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { getQuotation } from "@/lib/quotation-data";
import { buildQuotationPdf } from "@/lib/quotation-pdf";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) { const user=await requireUser(); if(!hasPermission(user,"quotations.view")) return new NextResponse("Forbidden",{status:403}); const {id}=await params; const quote=await getQuotation(id,user); if(!quote) return new NextResponse("Not found",{status:404}); const pdf=buildQuotationPdf({...quote.version,quoteNumber:quote.quoteNumber,versionNumber:quote.currentVersion,validUntil:quote.validUntil,lines:quote.lines}); return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${quote.quoteNumber}-v${quote.currentVersion}.pdf"`,"Cache-Control":"private, no-store"}}); }
