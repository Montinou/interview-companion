/**
 * Extract text from a PDF or DOCX buffer.
 * Uses dynamic imports to handle different module formats.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    // pdf-parse v2 uses PDFParse class
    const pdfParse = await import('pdf-parse');
    const Parser = (pdfParse as any).PDFParse || (pdfParse as any).default;
    if (Parser && typeof Parser === 'function') {
      const parser = new Parser(buffer);
      const result = await parser.parse();
      return result?.text || '';
    }
    // Fallback: try as callable
    const fn = (pdfParse as any).default || pdfParse;
    if (typeof fn === 'function') {
      const result = await fn(buffer);
      return result?.text || '';
    }
    throw new Error('Could not initialize PDF parser');
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = await import('mammoth');
    const extractor = (mammoth as any).default || mammoth;
    const result = await extractor.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback
  return buffer.toString('utf-8');
}

/**
 * CV data structure stored in candidates.cv_data
 */
export interface CvData {
  raw_text: string;
  parsed: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    tech_stack: string[];
    years_experience: number | null;
    seniority_estimate: string | null;
    education: { institution: string; degree: string; year: number | null }[];
    languages: { name: string; level: string }[];
    certifications: string[];
    employment_history: {
      company: string;
      role: string;
      from: string;
      to: string;
      description: string;
    }[];
  };
  analysis: {
    strengths: string[];
    concerns: string[];
    pre_flags: { type: 'red' | 'yellow' | 'green'; text: string }[];
    interview_focus: string[];
  };
  processed_at: string;
  ai_provider: string;
}

/**
 * Analyze CV text with Kimi (Moonshot API).
 * Returns structured CV data.
 */
export async function analyzeCvWithAI(
  cvText: string,
  roleHint?: string,
): Promise<{ cvData: CvData; provider: string }> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error('MOONSHOT_API_KEY not configured');

  const prompt = `You are a technical recruiter's AI assistant. Parse this CV/resume and extract structured data.

CV Text:
${cvText.slice(0, 8000)}

${roleHint ? `Target role: ${roleHint}` : ''}

Respond ONLY in JSON (no markdown, no code fences):
{
  "parsed": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "tech_stack": ["skill1", "skill2"],
    "years_experience": number or null,
    "seniority_estimate": "junior|mid|senior|lead|staff or null",
    "education": [{"institution": "...", "degree": "...", "year": 2020}],
    "languages": [{"name": "English", "level": "advanced"}],
    "certifications": ["ISTQB"],
    "employment_history": [
      {"company": "...", "role": "...", "from": "2020", "to": "2023", "description": "brief"}
    ]
  },
  "analysis": {
    "strengths": ["strength with evidence"],
    "concerns": ["concern with evidence"],
    "pre_flags": [
      {"type": "red", "text": "specific issue found"},
      {"type": "yellow", "text": "something to clarify"},
      {"type": "green", "text": "positive signal"}
    ],
    "interview_focus": ["specific question to ask based on CV"]
  }
}

Rules:
- Be factual. Only flag what's actually in the CV.
- Estimate seniority from years + responsibilities, not job titles.
- Detect inconsistencies (timeline math, impossible claims).
- Identify generic/template CVs (copy-paste job descriptions).
- tech_stack should be normalized (e.g. "JS" → "JavaScript").
- JSON only, no markdown wrapping.`;

  const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'kimi-k2-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kimi API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse AI response
  let parsed: any;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response: ${content.slice(0, 200)}`);
  }

  const cvData: CvData = {
    raw_text: cvText,
    parsed: parsed.parsed || {},
    analysis: parsed.analysis || { strengths: [], concerns: [], pre_flags: [], interview_focus: [] },
    processed_at: new Date().toISOString(),
    ai_provider: 'kimi',
  };

  return { cvData, provider: 'kimi' };
}

/**
 * Match CV data against existing interview profiles.
 * Returns profiles sorted by match score (descending).
 */
export function matchProfiles(
  cvData: CvData,
  profiles: { id: number; name: string; techStack: string[] | null; seniority: string | null }[],
): { profileId: number; name: string; score: number; reason: string }[] {
  const cvStack = new Set(
    (cvData.parsed.tech_stack || []).map((s) => s.toLowerCase()),
  );
  const cvSeniority = cvData.parsed.seniority_estimate?.toLowerCase();

  if (cvStack.size === 0) return [];

  return profiles
    .map((profile) => {
      const profileStack = new Set(
        (profile.techStack || []).map((s) => s.toLowerCase()),
      );

      if (profileStack.size === 0) return null;

      // Jaccard similarity on tech_stack
      const intersection = new Set([...cvStack].filter((x) => profileStack.has(x)));
      const union = new Set([...cvStack, ...profileStack]);
      let score = intersection.size / union.size;

      // Seniority bonus (+15% if matches)
      if (cvSeniority && profile.seniority?.toLowerCase() === cvSeniority) {
        score = Math.min(1, score + 0.15);
      }

      const matchedSkills = [...intersection].join(', ');
      const reason = matchedSkills
        ? `Tech overlap: ${matchedSkills}${cvSeniority === profile.seniority?.toLowerCase() ? ' + seniority match' : ''}`
        : 'Low overlap';

      return {
        profileId: profile.id,
        name: profile.name,
        score: Math.round(score * 100) / 100,
        reason,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null && m.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
