import { z } from 'zod';

export const PathwayStateSchema = z.enum(['IL', 'MN']);
export const PathwayCareerSchema = z.enum(['registered-nurse', 'software-developer']);
export const PathwayStatusSchema = z.enum(['To check', 'Confirmed', 'Completed']);
export const PATHWAY_STATES = { IL: 'Illinois', MN: 'Minnesota' } as const;
export const PATHWAY_CAREERS = {
  'registered-nurse': 'Registered Nurse',
  'software-developer': 'Software Developer',
} as const;

export type PathwayStep = {
  key: string;
  title: string;
  description: string;
  question: string;
  sourceName: string;
  sourceUrl: string;
  sourceReviewed: string;
};
const reviewed = '2026-11-22';
const education = {
  sourceName: 'U.S. Department of Education · Foreign qualifications',
  sourceUrl:
    'https://www.ed.gov/about/initiatives/international-affairs/recognition-of-foreign-qualifications',
  sourceReviewed: reviewed,
};
const boards = {
  IL: {
    sourceName: 'Illinois IDFPR · Nurses',
    sourceUrl: 'https://idfpr.illinois.gov/profs/nursing.html',
    sourceReviewed: reviewed,
  },
  MN: {
    sourceName: 'Minnesota Board of Nursing · Licensure',
    sourceUrl: 'https://mn.gov/boards/nursing/licensure/',
    sourceReviewed: reviewed,
  },
};
const workforce = {
  IL: {
    sourceName: 'Illinois workNet',
    sourceUrl: 'https://www.illinoisworknet.com/',
    sourceReviewed: reviewed,
  },
  MN: {
    sourceName: 'Minnesota CareerForce',
    sourceUrl: 'https://careerforce.mn.gov/',
    sourceReviewed: reviewed,
  },
};

export function getPathwaySteps(
  state: keyof typeof PATHWAY_STATES,
  career: keyof typeof PATHWAY_CAREERS
): PathwayStep[] {
  const credential: PathwayStep = {
    key: 'credential-review',
    title: 'Confirm how your qualifications will be reviewed',
    description:
      'Record your qualification names, awarding institutions and relevant experience. Ask the employer or licensing authority whether an evaluation is needed and which service it accepts before paying.',
    question:
      'Who will review my qualifications, and what documents or evaluation service do they accept?',
    ...education,
  };
  const local: PathwayStep = {
    key: 'local-support',
    title: 'Explore local training and current opportunities',
    description:
      'Use the state career resource to explore training, job listings and adviser support. Check costs, entry conditions and availability directly with each provider.',
    question: 'Which local training or support could help me address the gaps I have identified?',
    ...workforce[state],
  };
  if (career === 'registered-nurse')
    return [
      {
        key: 'licensure-route',
        title: 'Check your nursing application route',
        description:
          'Review the nursing authority for your chosen state and ask which application route fits your education and existing registration.',
        question: 'Which route applies to my nursing education and previous registration?',
        ...boards[state],
      },
      credential,
      {
        key: 'licensure-evidence',
        title: 'Confirm required exams and supporting evidence',
        description:
          'Ask the state nursing authority which exams, language evidence, education records and other documents apply to your background.',
        question:
          'Which documents and assessments must I provide, and what are the current fees and timelines?',
        ...boards[state],
      },
      local,
    ];
  return [
    {
      key: 'role-requirements',
      title: 'Compare your background with software roles',
      description:
        'Review the occupation overview and two current job postings. Write down programming, teamwork and project evidence the employers ask for.',
      question:
        'Which requested skills can I demonstrate, and which should I practise or discuss with the employer?',
      sourceName: 'U.S. Bureau of Labor Statistics · Software developers',
      sourceUrl:
        'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
      sourceReviewed: reviewed,
    },
    credential,
    {
      key: 'project-evidence',
      title: 'Choose one project to demonstrate your skills',
      description:
        'Choose a small project relevant to a real posting. Identify the skills it should demonstrate and ask an adviser or employer to review the scope.',
      question: 'What evidence would help an employer understand my existing experience?',
      sourceName: 'U.S. Bureau of Labor Statistics · Software developers',
      sourceUrl:
        'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
      sourceReviewed: reviewed,
    },
    local,
  ];
}

export const PathwayItemInputSchema = z
  .object({
    opportunityId: z.string().min(1).max(200),
    state: PathwayStateSchema,
    career: PathwayCareerSchema,
    stepKey: z.string().min(1).max(100),
    status: PathwayStatusSchema,
    notes: z.string().trim().max(1000),
  })
  .refine((value) =>
    getPathwaySteps(value.state, value.career).some((step) => step.key === value.stepKey)
  );
export type PathwayItemInput = z.infer<typeof PathwayItemInputSchema>;
export type CareerPathwayItem = PathwayItemInput & {
  id: string;
  reviewedAt: string | null;
  updatedAt: string;
  planItemId: string | null;
};
