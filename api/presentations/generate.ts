import { Type } from '@google/genai';
import { generateGeminiContentWithFallback } from '../../src/server/geminiCore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString('utf-8'));
    } catch {
      body = {};
    }
  } else if (!body) {
    body = {};
  }

  const {
    topic = 'Academic Presentation',
    subjectId,
    slideCount = 6,
    language = 'en',
    style = 'academic',
    audience = 'university_class',
    tone = 'informative',
  } = body;

  const count = Math.min(Math.max(Number(slideCount) || 6, 3), 12);

  const prompt = `You are an elite academic presentation designer for university students.
Generate a structured, engaging, and professional university slide presentation deck on this topic:
Topic: "${topic}"
Number of Slides: ${count}
Style: ${style}
Target Audience: ${audience}
Tone: ${tone}
Language: ${language === 'bn' ? 'Bangla' : 'English'}

Provide a JSON object with:
- title: clear, engaging presentation title
- subtitle: concise sub-heading
- keyTakeaway: single sentence core takeaway
- sources: array of 2 to 3 academic/reference sources
- slides: array of ${count} slide objects with:
  - id: string
  - slideNumber: number (1 to ${count})
  - title: slide title
  - subtitle: concise sub-heading
  - layout: one of ["title_slide", "bullet_points", "two_column", "highlight_stat", "quote", "summary"]
  - bullets: array of 2 to 4 punchy bullet points
  - body: comprehensive explanatory paragraph
  - speakerNotes: natural, spoken script for the student to say aloud during this slide
  - keyTakeaway: single sentence summary of the slide`;

  try {
    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            keyTakeaway: { type: Type.STRING },
            sources: { type: Type.ARRAY, items: { type: Type.STRING } },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  slideNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  layout: { type: Type.STRING },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  body: { type: Type.STRING },
                  speakerNotes: { type: Type.STRING },
                  statNumber: { type: Type.STRING },
                  statLabel: { type: Type.STRING },
                  keyTakeaway: { type: Type.STRING },
                },
                required: ['id', 'slideNumber', 'title', 'layout', 'bullets', 'body', 'speakerNotes'],
              },
            },
          },
          required: ['title', 'slides'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const presentation = {
      id: `pres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: 'user_demo_101',
      title: parsed.title || topic,
      subtitle: parsed.subtitle || `Academic Presentation on ${topic}`,
      subjectId: subjectId || null,
      theme: style === 'minimal' ? 'minimal' : style === 'modern' ? 'ocean' : 'academic',
      style,
      slideCount: Array.isArray(parsed.slides) ? parsed.slides.length : count,
      slides: (parsed.slides || []).map((s: any, idx: number) => ({
        id: s.id || `slide_${idx + 1}`,
        slideNumber: s.slideNumber || idx + 1,
        title: s.title || `Slide ${idx + 1}`,
        subtitle: s.subtitle || '',
        layout: s.layout || (idx === 0 ? 'title_slide' : 'bullet_points'),
        bullets: Array.isArray(s.bullets) ? s.bullets : ['Key academic principle', 'Supporting evidence'],
        body: s.body || 'Comprehensive explanation of the academic concept.',
        speakerNotes: s.speakerNotes || 'Hello everyone, on this slide we explore this essential topic.',
        keyTakeaway: s.keyTakeaway || '',
      })),
      keyTakeaway: parsed.keyTakeaway || '',
      sources: parsed.sources || ['University Course Material'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json(presentation);
  } catch (error: any) {
    console.error('[Campusly Presentation Generation Fallback]:', error?.message || error);
    const fallbackPresentation = {
      id: `pres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: 'user_demo_101',
      title: topic,
      subtitle: `Academic Overview & Seminar Deck`,
      subjectId: subjectId || null,
      theme: 'academic',
      style,
      slideCount: count,
      slides: Array.from({ length: count }, (_, idx) => ({
        id: `slide_${idx + 1}`,
        slideNumber: idx + 1,
        title: idx === 0 ? topic : idx === count - 1 ? 'Conclusion & Key Takeaways' : `Key Dimension ${idx}`,
        subtitle: idx === 0 ? 'University Seminar Presentation' : 'Theoretical Foundations & Evidence',
        layout: idx === 0 ? 'title_slide' : idx === count - 1 ? 'summary' : 'bullet_points',
        bullets: [
          'Core theoretical principle and definition',
          'Empirical academic evidence and case studies',
          'Practical implications for students and professionals',
        ],
        body: `This slide explores foundational concepts regarding ${topic}, emphasizing structured analysis and academic rigor.`,
        speakerNotes: `Good morning everyone. On this slide, we will examine the critical aspects of ${topic}. Notice how the core points connect to our seminar thesis.`,
        keyTakeaway: `Mastery of ${topic} requires understanding both theoretical principles and practical application.`,
      })),
      keyTakeaway: `Key insights on ${topic}`,
      sources: ['Standard Academic Textbooks', 'Peer-Reviewed Literature'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json(fallbackPresentation);
  }
}
