"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  submitInquiryAction,
  type InquiryState,
} from "@/lib/cms/inquiry-action";

export function QuoteForm({
  subject = "",
  pagePath = "/contact/",
}: {
  subject?: string;
  pagePath?: string;
}) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitInquiryAction,
    null,
  );

  if (state && "ok" in state && state.ok) {
    return (
      <div className="quote-success">
        <p>{state.message}</p>
        <p>We reply on the next working day. You can also call or email the details on this page.</p>
        <Link href="/products/">Browse products</Link>
      </div>
    );
  }

  return (
    <form className="quote-form quote-form--compact" action={action}>
      <input type="hidden" name="source" value="quote" />
      <input type="hidden" name="pagePath" value={pagePath} />
      <input type="hidden" name="subject" value={subject || "Website enquiry"} />
      <input type="hidden" name="company" value="" />
      <p className="quote-honeypot" hidden>
        <label>
          Leave this field empty
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <label>
        <span className="sr-only">Name</span>
        <input name="name" required autoComplete="name" placeholder="Name *" />
      </label>
      <label>
        <span className="sr-only">Email address</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address *"
        />
      </label>
      <label>
        <span className="sr-only">Mobile number</span>
        <input name="phone" type="tel" autoComplete="tel" placeholder="+91 Mobile number" />
      </label>
      <label>
        <span className="sr-only">Message</span>
        <textarea name="message" required rows={4} placeholder="Message *" />
      </label>
      {state && "error" in state ? <p className="quote-error">{state.error}</p> : null}
      <button className="site-btn-primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Submit"}
      </button>
    </form>
  );
}
