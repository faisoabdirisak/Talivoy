import { Brand } from './Brand';
import {
  ArrowRight,
  Building2,
  BriefcaseBusiness,
  Compass,
  Eye,
  GraduationCap,
  Handshake,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';

const card =
  'rounded-2xl border border-border-light bg-surface-light p-5 shadow-sm hover:border-primary/35 hover:shadow-lg dark:border-border-dark dark:bg-surface-dark dark:hover:border-primary/40 motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 sm:p-6';

const purpose = [
  {
    icon: Target,
    title: 'Our mission',
    copy: 'Help people carry their experience into their next career chapter. Talivoy brings existing skills, goals, time and budget together so workers can compare practical opportunities and begin a plan.',
  },
  {
    icon: Eye,
    title: 'Our vision',
    copy: 'Make career guidance easier to access when someone moves to a new country, returns to work or changes direction. We envision workers and advisers recognizing existing strengths, identifying learning needs and choosing next steps together.',
  },
];

const journey = [
  {
    icon: Compass,
    title: 'Explore and compare',
    copy: 'Upload a résumé, review its extracted details or enter a profile manually to receive three ranked opportunities across career changes, upskilling or small business ideas. Compare two options by fit, estimated cost, launch time, and first task. Open the explanation to see the factors behind the score.',
  },
  {
    icon: ListChecks,
    title: 'Choose and act',
    copy: 'Choose an opportunity and follow its 30-day plan. Compare your skills with a job posting, save reminders and record weekly check-ins. Review proposed guidance when your budget or available hours change.',
  },
  {
    icon: Handshake,
    title: 'Discuss your plan',
    copy: 'Choose the details to share through an expiring adviser link, or print a handoff report. Read private feedback on your dashboard and decide whether to add a recommended next step.',
  },
];

const pathwayHighlights = [
  {
    icon: ScanSearch,
    title: 'Explore official sources',
    copy: 'Choose a supported state and career to review official resource links, source review dates and questions about qualifications, requirements, training and opportunities.',
  },
  {
    icon: ListChecks,
    title: 'Keep your own checklist',
    copy: 'Save private notes and mark each step To check, Confirmed or Completed. Your saved checklist stays separate for each state and career, ready to continue after a refresh.',
  },
  {
    icon: Handshake,
    title: 'Turn review into action',
    copy: 'Review a checklist action before adding it to Week 4 of your plan. Choose that milestone when creating an adviser review link so you can discuss the official source and next step together.',
  },
];

const stakeholders = [
  {
    icon: Compass,
    title: 'Newcomers and resettled professionals',
    copy: 'Immigrants, refugees and people settling in the United States or another new community can explore how their previous experience may connect with local roles and learning opportunities. Workers can identify qualifications and local requirements to discuss with an adviser.',
  },
  {
    icon: Users,
    title: 'Workers and job seekers',
    copy: 'People affected by job loss, changing industries, or returning to work can explore how their existing skills might transfer. They can choose a path based on their circumstances and take it one task at a time.',
  },
];

const supportingAudiences = [
  {
    icon: Building2,
    title: 'Resettlement organizations',
    copy: 'Help newcomers discuss career options and track agreed next steps.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Workforce development teams',
    copy: 'Support workers exploring retraining or a career transition.',
  },
  {
    icon: GraduationCap,
    title: 'Community colleges and adult-learning programs',
    copy: 'Help learners connect existing experience with training goals.',
  },
  {
    icon: Handshake,
    title: 'Career advisers',
    copy: 'Review selected plans, provide feedback, and follow up through check-ins.',
  },
];

export function AboutPage({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <div aria-labelledby="about-heading" className="space-y-10 text-app">
      <header
        className={`${card} border-primary/20 bg-gradient-to-br from-primary/10 to-surface-light dark:to-surface-dark`}
      >
        <Brand className="mb-5" />
        <p className="text-sm font-medium text-primary">Your talent. Your next chapter.</p>
        <h1 id="about-heading" className="mt-2 text-3xl font-bold">
          About Talivoy
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Your experience matters wherever your next chapter begins. Talivoy helps newcomers,
          resettled workers, career changers and people returning to work connect their existing
          strengths with new skills and possible opportunities. Review a personalized set of
          options, choose a direction and follow a practical 30-day plan with support from an
          adviser.
        </p>
        <button
          type="button"
          onClick={onTryDemo}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Try the guest demo <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {purpose.map(({ icon: Icon, title, copy }) => (
          <article key={title} className={card}>
            <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
          </article>
        ))}
      </div>

      <section aria-labelledby="about-journey">
        <h2 id="about-journey" className="mb-4 text-xl font-bold">
          How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {journey.map(({ icon: Icon, title, copy }) => (
            <article key={title} className={card}>
              <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-us-pathway">
        <h2 id="about-us-pathway" className="mb-3 text-xl font-bold">
          My U.S. Career Pathway
        </h2>
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-muted">
          Bring your previous experience into a conversation about your next U.S. role. Open the
          Dashboard, focus an opportunity and choose Explore My Pathway to investigate practical
          next steps using official resources.
        </p>
        <p className="mb-5 text-sm font-medium text-primary">
          Initial coverage · Illinois and Minnesota · Registered Nurse and Software Developer
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {pathwayHighlights.map(({ icon: Icon, title, copy }) => (
            <article key={title} className={card}>
              <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          Checklist statuses record your own review. Confirm current requirements with the relevant
          board, employer or adviser. Personal checklist notes stay in your guest plan, while you
          choose which milestones to share.
        </p>
      </section>

      <section aria-labelledby="about-stakeholders">
        <h2 id="about-stakeholders" className="mb-4 text-xl font-bold">
          Who it serves
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {stakeholders.map(({ icon: Icon, title, copy }) => (
            <article key={title} className={card}>
              <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-supporting-audiences">
        <h2 id="about-supporting-audiences" className="mb-3 text-xl font-bold">
          Organizations and advisers supporting the journey
        </h2>
        <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted">
          Talivoy helps workforce and resettlement organizations support newcomers and workers in
          transition with personalized career exploration, skills development plans and adviser
          collaboration. Workers choose the plan details they share and review suggested next steps.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {supportingAudiences.map(({ icon: Icon, title, copy }) => (
            <article key={title} className={card}>
              <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Lecturers and reviewers can try a fictional profile or run a live analysis, review a plan
          and publish feedback with consent through the Evaluation page.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <article className={card}>
          <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
            <ScanSearch size={22} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold">How AI supports the decision</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            IBM Granite through watsonx.ai, or the configured Gemini provider, suggests
            opportunities, plan tasks and fit factors. Docling-assisted résumé extraction has a
            local document-reading fallback. The app calculates each score using fixed weights for
            skill fit, affordability, launch speed, and simplicity. Workers choose which plan to
            focus on. Check cost estimates and local requirements before spending money or applying.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Professional licensing, credential recognition and eligibility requirements depend on
            the role and location. Use the plan and adviser questions to verify which requirements
            apply to you.
          </p>
        </article>
        <article className={card}>
          <span className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold">Guest access and project background</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Explore fictional profiles in the guest demo or submit a non-sensitive profile for live
            recommendations. Live plans and progress are saved for the same browser. Faiso developed
            Talivoy for the IBM AI Challenge, with IBM Bob as the primary AI development assistant.
          </p>
        </article>
      </div>
    </div>
  );
}
