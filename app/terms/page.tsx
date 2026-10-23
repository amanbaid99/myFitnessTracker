import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <section>
        <p>
          By creating an account or using Repd you agree to these terms. If you do not agree, please do not use the app.
        </p>
      </section>

      <section>
        <h2>Not medical advice</h2>
        <p>
          The app, its plans, weight suggestions and AI features give general fitness information only. They are not medical advice and
          do not replace a doctor, physiotherapist or qualified coach.
        </p>
        <p>
          Talk to your doctor before starting a new exercise programme, especially if you have a medical condition or injury, are
          pregnant, or have not exercised in a while. Stop and get help if you feel pain, dizziness, chest discomfort or unusual
          shortness of breath.
        </p>
      </section>

      <section>
        <h2>You train at your own risk</h2>
        <p>
          Exercise carries a risk of injury. Choose weights you can control with good form, use a spotter or safety equipment where
          needed, and decide for yourself what is safe for you. You are responsible for how you use the app.
        </p>
      </section>

      <section>
        <h2>The AI can be wrong</h2>
        <p>
          Workout reviews, Coach and AI-built plans come from AI models, mostly free ones. They can be wrong, out of date or unsuitable for you. Check
          anything they suggest before you act on it.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be 16 or over.</li>
          <li>Keep your password private. You are responsible for what happens in your account.</li>
          <li>Do not misuse the app, try to reach other people&apos;s data, or overload the AI features.</li>
        </ul>
        <p>Accounts that break these terms may be suspended or removed.</p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          The app is free and provided as it is, without any guarantee. Features, limits (such as the daily AI requests) and the AI
          models may change, and the app may be unavailable at times or shut down. Keep your own copy of anything important.
        </p>
        <p>
          As far as the law allows, the app&apos;s owner is not liable for any injury, loss or damage that comes from using the app.
          Nothing in these terms limits rights you have by law that cannot be limited.
        </p>
      </section>

      <section>
        <h2>Your data</h2>
        <p>
          How your data is stored and shared is explained in the{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>If these terms change, the date at the top changes too. Using the app after a change means you accept it.</p>
        <ContactLine />
      </section>
    </LegalPage>
  );
}
