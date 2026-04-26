/**
 * EmailJS Service — sends real reservation & overdue notification emails.
 *
 * Credentials come from .env (VITE_EMAILJS_* prefixed variables).
 *
 * Required .env values:
 *   VITE_EMAILJS_SERVICE_ID   = your EmailJS service ID
 *   VITE_EMAILJS_TEMPLATE_ID  = your EmailJS template ID
 *   VITE_EMAILJS_PUBLIC_KEY   = your EmailJS public key
 *
 * EmailJS template variables (configure these in the EmailJS dashboard):
 *   {{to_name}}      — member's display name
 *   {{to_email}}     — member's email address
 *   {{book_title}}   — title of the resource
 *   {{days_overdue}} — days overdue (0 for reservations)
 *   {{fine_amount}}  — fine amount in ZMW (0.00 for reservations)
 */

const EMAILJS = {
  serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

const IS_CONFIGURED =
  !!EMAILJS.serviceId &&
  !!EMAILJS.templateId &&
  !!EMAILJS.publicKey &&
  EMAILJS.serviceId !== 'YOUR_SERVICE_ID';

/**
 * Send a reservation-available email.
 *
 * @param {{ name: string, email: string }} user
 * @param {{ title: string }} book
 * @returns {{ success: boolean, demo?: boolean, error?: string }}
 */
export async function sendReservationEmail(user, book) {
  return sendEmail(user, book, '0', '0.00');
}

/**
 * Send an overdue notice email.
 *
 * @param {{ name: string, email: string }} user
 * @param {{ title: string }} book
 * @param {number} daysOverdue
 * @param {number} fineAmount
 * @returns {{ success: boolean, demo?: boolean, error?: string }}
 */
export async function sendOverdueEmail(user, book, daysOverdue = 0, fineAmount = 0) {
  return sendEmail(user, book, String(daysOverdue), fineAmount.toFixed(2));
}

/**
 * Core email sender — used by reservation and overdue notifications.
 */
async function sendEmail(user, book, daysOverdue, fineAmount) {
  if (!user?.email || !user?.name) {
    console.warn('[EmailJS] Skipped — invalid user:', user);
    return { success: false };
  }
  if (!book?.title) {
    console.warn('[EmailJS] Skipped — invalid book:', book);
    return { success: false };
  }

  // Demo mode: log instead of sending
  if (!IS_CONFIGURED) {
    console.info(
      `[EmailJS DEMO] To: ${user.email}\n` +
      `  Name: ${user.name}\n` +
      `  Book: ${book.title}\n` +
      `  Days Overdue: ${daysOverdue}\n` +
      `  Fine: ZMW ${fineAmount}`
    );
    return { success: true, demo: true };
  }

  try {
    const emailjs = await import('@emailjs/browser');
    const result = await emailjs.send(
      EMAILJS.serviceId,
      EMAILJS.templateId,
      {
        to_name:      user.name,
        to_email:     user.email,
        book_title:   book.title,
        days_overdue: daysOverdue,
        fine_amount:  fineAmount,
      },
      EMAILJS.publicKey
    );
    console.log('[EmailJS] Email sent successfully:', result.status);
    return { success: true };
  } catch (err) {
    console.error('[EmailJS] Send failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Simulate email notification (console output only — for testing).
 */
export function simulateEmailNotification(user, book) {
  console.info(
    `[EMAIL SIMULATION]\n` +
    `  To:      ${user.name} <${user.email}>\n` +
    `  Subject: "${book.title}" is now available!\n` +
    `  Body:    Your reserved resource is ready for pickup.`
  );
  return { success: true, simulated: true };
}

export default { sendReservationEmail, sendOverdueEmail };

