import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Terms for using the Kerala Center of New Jersey website, including events, accounts, and Google AdSense advertising.',
};

const CONTACT_EMAIL = 'keralacenternj@gmail.com';

export default function TermsPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> November 14, 2026
          </p>
          <p className="text-gray-700 mb-6">
            These terms govern use of the website of the Kerala Center of New Jersey (&quot;KCNJ&quot;), based in New
            Jersey, USA. By using the site you agree to these terms and to the{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the site.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. The site</h2>
            <p className="text-gray-700">
              The site publishes information about KCNJ, its events, and ways to take part. Event details, prices, and
              schedules can change. Registration does not guarantee a place if an organizer limits capacity or cancels
              the event.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Accounts and registrations</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide accurate information when you register or contact us.</li>
              <li>You are responsible for activity under your account.</li>
              <li>We may suspend an account that breaks these terms or misuses the site.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Advertising</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                Pages on this site may show third-party advertisements through Google AdSense. Those ads are sold and
                delivered by Google and its advertising partners. KCNJ does not create the ads and is not the seller of
                the advertised products.
              </p>
              <p>
                The AdSense ownership script may appear in the page head so Google can verify the site. Ad units load
                only after you accept cookies. Rejecting cookies means those ads are not loaded. Details and opt-out
                links are in the{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Payments, cancellation, and refunds</h2>
            <p className="text-gray-700">
              Paid registrations, memberships, and donations follow the terms shown at checkout. Refund rules for an
              event are set by that event. Contact {CONTACT_EMAIL} for a billing question about a KCNJ event.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable use</h2>
            <p className="text-gray-700">
              Do not misuse the site, attempt to break its security, or post unlawful or abusive content. At KCNJ
              events, follow the event rules, the venue&apos;s rules, and the law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Content</h2>
            <p className="text-gray-700">
              Text, images, and marks on this site belong to KCNJ or its licensors. Do not copy them for another
              commercial site without written permission. Event listings and news may quote material that remains the
              property of its author.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Liability</h2>
            <p className="text-gray-700">
              The site is provided as available. To the extent the law allows, KCNJ is not liable for indirect or
              consequential loss from use of the site, from third-party ads, or from an event change outside our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes</h2>
            <p className="text-gray-700">
              We may update these terms by posting a new version on this page and changing the date above. Continued
              use of the site after that posting means you accept the update.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Law</h2>
            <p className="text-gray-700">
              These terms are governed by the laws of the State of New Jersey and the United States. Disputes are
              handled in the state or federal courts located in New Jersey, except where the law requires otherwise.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact</h2>
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
              <p>
                Kerala Center of New Jersey (KCNJ)
                <br />
                New Jersey, USA
                <br />
                <strong>Email:</strong>{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-center mt-8">
          <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
