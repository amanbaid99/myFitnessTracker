import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          Repd is a small personal app run by one person, not a company. This page explains what it stores about you, why, who
          else sees it, and how to have it removed.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>Your email address and a secure hash of your password, to sign you in.</li>
          <li>Your name, if you give one.</li>
          <li>
            Details you choose to add: gender, body weight, height, experience and where you train. These are optional and you can change
            them in Settings.
          </li>
          <li>Your plans, workouts, sets, notes and the AI reviews of your workouts.</li>
          <li>Feedback and bug reports you send, with the page and browser they came from.</li>
          <li>A daily count of your AI requests, to keep within the free limit.</li>
          <li>How the app is used: which screens are opened and what is tapped, plus recordings of app sessions. See below.</li>
        </ul>
        <p>We do not collect your location, contacts or photos, and there are no ads.</p>
      </section>

      <section>
        <h2>Why</h2>
        <p>
          Only to run the app for you: to save your training, show your progress, suggest weights and power the AI features. Your
          gender, body weight and height stay in your profile and are not sent to the AI. We never sell your data or use it for
          advertising.
        </p>
      </section>

      <section>
        <h2>The AI features</h2>
        <p>
          Workout reviews, Coach and building a plan from a description send some of your data to free AI models through OpenRouter:
          your workout sets and exercise names, your experience and where you train, and the text you type. Emails, phone numbers and
          links in your text are removed before sending, and your name and email are never sent.
        </p>
        <p>
          The companies that run these free models may keep what is sent and use it to improve their models. Do not type anything private
          into Coach or a plan description. If you do not want your data sent, do not use these features.
        </p>
      </section>

      <section>
        <h2>How we see what works</h2>
        <p>
          To find what is confusing or broken, the app records how it is used: screens opened, buttons tapped, loading speed, a
          few actions such as starting or finishing a workout, and recordings of app sessions that can be replayed like a video.
        </p>
        <p>
          These are linked to your account by an anonymous ID, never your name or email. In recordings, anything you type is hidden,
          and so are your name, email, Coach chats and notes. Nothing you type is sent as an event. Recordings are kept for 30
          days. This runs through PostHog.
        </p>
      </section>

      <section>
        <h2>Who else handles your data</h2>
        <ul>
          <li>Supabase: stores the database and handles sign-in.</li>
          <li>Vercel: hosts the app.</li>
          <li>OpenRouter and the AI model providers it routes to: the AI features above.</li>
          <li>Our email provider: sends sign-up codes and password resets.</li>
          <li>PostHog: usage analytics and session recordings, as described above.</li>
        </ul>
        <p>Some of these services may store data outside your country.</p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          The ones the app needs, to keep you signed in, remember your colour theme, and remember exercises added to a workout in
          progress, plus one from PostHog that recognises your device for the usage analytics above. No advertising cookies.
        </p>
      </section>

      <section>
        <h2>Who can see your data</h2>
        <p>
          Other users cannot see your data; the database only lets each account read its own. The app&apos;s owner can see it when
          running or fixing the app, and does not look at it otherwise.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>Until you ask for your account to be deleted. Deleting your account removes your profile, plans, workouts and feedback.</p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>You can ask to see, correct, download or delete your data at any time, and we will do it within 30 days.</p>
        <ContactLine />
      </section>

      <section>
        <h2>Age</h2>
        <p>The app is for people aged 16 or over.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, the date at the top changes too. See also the{" "}
          <Link href="/terms" className="text-primary underline underline-offset-2">
            Terms of Use
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
