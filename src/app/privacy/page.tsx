import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How the Kerala Center of New Jersey collects information and uses Google AdSense.',
};

const CONTACT_EMAIL = 'keralacenternj@gmail.com';

export default function PrivacyPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> November 14, 2026
          </p>
          <p className="text-gray-700 mb-6">
            This policy describes how the Kerala Center of New Jersey (&quot;KCNJ,&quot; &quot;we,&quot; &quot;us&quot;)
            handles information on this website. KCNJ is based in New Jersey, USA. The site is operated with Giventa Inc.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information we collect</h2>
            <div className="text-gray-700 mb-4">
              <p className="mb-3">We collect information you give us when you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create an account or profile</li>
                <li>Register for an event, membership, or donation</li>
                <li>Send a message through the contact form</li>
                <li>Subscribe to communications</li>
              </ul>
              <p className="mt-4">
                That information may include your name, email address, phone number, and the details needed for the event
                or message.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How we use information</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Run events, memberships, and donations</li>
              <li>Reply to messages sent to {CONTACT_EMAIL}</li>
              <li>Keep the site secure and working</li>
              <li>Meet legal duties</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Google AdSense and cookies</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                This site shows third-party ads through Google AdSense. Google and its advertising partners may use cookies
                and similar technologies to serve and measure ads, including ads based on your visits to this site and other
                sites, after you allow them.
              </p>
              <p>
                The site ownership script is in the page head so Google can verify the site. That script may be present
                before you make a cookie choice. Ad units (<code>ins.adsbygoogle</code>) do not load until you choose{' '}
                <strong>Accept</strong> on the cookie banner. <strong>Reject</strong> keeps those ad units off. You can
                change that choice later from Cookie settings in the footer.
              </p>
              <p>
                You can also control personalized ads in{' '}
                <a
                  href="https://adssettings.google.com"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Ads Settings
                </a>{' '}
                and opt out of some third-party cookies at{' '}
                <a
                  href="https://optout.aboutads.info"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aboutads.info
                </a>
                . Google&apos;s own policy is at{' '}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  policies.google.com/privacy
                </a>
                .
              </p>
              <p>
                We also use cookies that are required to sign in and keep the site working. Those are separate from
                advertising cookies.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Sharing</h2>
            <p className="text-gray-700">
              We share information with service providers who host the site, process payments, or send email, and with
              Google when you accept advertising cookies. We may also share information when the law requires it or when
              you ask us to.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Children</h2>
            <p className="text-gray-700">
              This site is not directed at children under 13. We do not knowingly collect personal information from
              children under 13. Contact us if you believe a child has given us personal information and we will delete it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your choices</h2>
            <p className="text-gray-700">
              You may ask to see, correct, or delete personal information we hold about you, and you may unsubscribe from
              mailings. Advertising choices are in section 3. The terms for using the site are in the{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms and Conditions
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact</h2>
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
