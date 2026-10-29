import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface SimilarityMatch {
  matchedTopicId: number;
  matchedTitle: string;
  matchedLecturerName: string;
  matchedSemesterName: string;
  similarityScore: number;
  matchedFields: {
    titleSimilarity: number;
    contentSimilarity: number;
    overlappingKeywords: string[];
  };
}

@Injectable()
export class TopicSimilarityService {
  private readonly logger = new Logger(TopicSimilarityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tokenize Vietnamese & English text into clean words and 2-grams.
   */
  private tokenize(text: string): Set<string> {
    if (!text) return new Set();

    const normalized = text
      .toLowerCase()
      .normalize('NFC')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>\[\]\\|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized
      .split(' ')
      .map((w) => w.trim())
      .filter((w) => w.length > 1);

    const tokens = new Set<string>(words);

    // Add bigrams to capture 2-word domain phrases (e.g. "nhận diện", "khuôn mặt", "hệ thống", "quản lý")
    for (let i = 0; i < words.length - 1; i++) {
      tokens.add(`${words[i]} ${words[i + 1]}`);
    }

    return tokens;
  }

  /**
   * Calculate Sørensen–Dice / Jaccard similarity coefficient between two token sets.
   */
  private calculateDiceSimilarity(
    setA: Set<string>,
    setB: Set<string>,
  ): {
    score: number;
    overlap: string[];
  } {
    if (setA.size === 0 || setB.size === 0) {
      return { score: 0, overlap: [] };
    }

    const overlap: string[] = [];
    for (const token of setA) {
      if (setB.has(token)) {
        overlap.push(token);
      }
    }

    // Dice coefficient: (2 * |A ∩ B|) / (|A| + |B|)
    const score = (2 * overlap.length) / (setA.size + setB.size);
    return {
      score: Math.min(1, Math.max(0, Number(score.toFixed(2)))),
      overlap,
    };
  }

  /**
   * Check similarity between a target topic and all other non-draft topics.
   * If saveToDb is true, persists results to topic_similarity_checks table.
   */
  async checkTopicSimilarity(
    topicId: number,
    saveToDb = true,
  ): Promise<SimilarityMatch[]> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        title: true,
        description: true,
        objectives: true,
        expectedOutcomes: true,
        semesterId: true,
      },
    });

    if (!topic) return [];

    const targetTitleTokens = this.tokenize(topic.title);
    const targetContentTokens = this.tokenize(
      `${topic.description} ${topic.objectives ?? ''} ${topic.expectedOutcomes}`,
    );

    // Candidates: other topics that are not drafts
    const candidates = await this.prisma.topic.findMany({
      where: {
        id: { not: topicId },
        status: { notIn: ['DRAFT', 'REJECTED'] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        objectives: true,
        expectedOutcomes: true,
        lecturer: { select: { fullName: true } },
        semester: { select: { name: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const matches: SimilarityMatch[] = [];

    for (const candidate of candidates) {
      const candidateTitleTokens = this.tokenize(candidate.title);
      const candidateContentTokens = this.tokenize(
        `${candidate.description} ${candidate.objectives ?? ''} ${candidate.expectedOutcomes}`,
      );

      const titleSim = this.calculateDiceSimilarity(
        targetTitleTokens,
        candidateTitleTokens,
      );
      const contentSim = this.calculateDiceSimilarity(
        targetContentTokens,
        candidateContentTokens,
      );

      // Weighted score: 60% Title similarity + 40% Content similarity
      const combinedScore = Number(
        (titleSim.score * 0.6 + contentSim.score * 0.4).toFixed(2),
      );

      // Threshold: at least 35% similarity or title score >= 40%
      if (combinedScore >= 0.35 || titleSim.score >= 0.4) {
        // Collect meaningful keyword overlaps (length >= 4 or bigrams)
        const meaningfulKeywords = Array.from(
          new Set([...titleSim.overlap, ...contentSim.overlap]),
        )
          .filter((k) => k.length >= 4 || k.includes(' '))
          .slice(0, 10);

        matches.push({
          matchedTopicId: candidate.id,
          matchedTitle: candidate.title,
          matchedLecturerName: candidate.lecturer.fullName,
          matchedSemesterName: candidate.semester.name,
          similarityScore: combinedScore,
          matchedFields: {
            titleSimilarity: titleSim.score,
            contentSimilarity: contentSim.score,
            overlappingKeywords: meaningfulKeywords,
          },
        });
      }
    }

    // Sort descending by highest similarity score
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    if (saveToDb && matches.length > 0) {
      try {
        // Delete previous check results for this topic
        await this.prisma.topicSimilarityCheck.deleteMany({
          where: { topicId },
        });

        // Insert new check entries
        await this.prisma.topicSimilarityCheck.createMany({
          data: matches.map((m) => ({
            topicId,
            matchedTopicId: m.matchedTopicId,
            similarityScore: m.similarityScore,
            matchedFields: m.matchedFields,
          })),
        });
      } catch (err) {
        this.logger.warn(
          `Could not persist similarity checks for topic ${topicId}: ${err}`,
        );
      }
    }

    return matches;
  }
}
