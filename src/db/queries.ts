import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  customRules,
  notifications,
  reviewChatMessages,
  reviews,
  users,
  workspaceMembers,
  workspaces,
} from './schema.ts';
import crypto from 'crypto';

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, params.uid));
    if (existing.length > 0) {
      if (params.displayName || params.avatarUrl) {
        const [updated] = await db
          .update(users)
          .set({
            displayName: params.displayName || existing[0].displayName,
            avatarUrl: params.avatarUrl || existing[0].avatarUrl,
          })
          .where(eq(users.uid, params.uid))
          .returning();
        return updated;
      }
      return existing[0];
    }

    const defaultApiKey = `cr_${crypto.randomBytes(16).toString('hex')}`;
    const [newUser] = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName || params.email.split('@')[0],
        avatarUrl: params.avatarUrl,
        apiKey: defaultApiKey,
      })
      .returning();

    // Create a default Personal workspace for the user
    const defaultSlug = `personal-${params.uid.slice(0, 6).toLowerCase()}`;
    const [defaultWorkspace] = await db
      .insert(workspaces)
      .values({
        name: 'Personal Workspace',
        slug: defaultSlug,
        description: 'Default personal development workspace',
        ownerUid: params.uid,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: defaultWorkspace.id,
      userUid: params.uid,
      email: params.email,
      role: 'admin',
    });

    // Add a welcome notification
    await db.insert(notifications).values({
      userUid: params.uid,
      title: 'Welcome to CodeRefine AI',
      message: 'Your automated AI code reviewer and Cloud SQL database are active.',
      type: 'success',
    });

    return newUser;
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Failed to synchronize user profile', { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('getUserProfile error:', error);
    throw new Error('Failed to retrieve user profile', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  data: { defaultLanguage?: string; displayName?: string; apiKey?: string }
) {
  try {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.uid, uid))
      .returning();
    return updated;
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw new Error('Failed to update user profile', { cause: error });
  }
}

export async function regenerateApiKey(uid: string) {
  const newKey = `cr_${crypto.randomBytes(16).toString('hex')}`;
  return updateUserProfile(uid, { apiKey: newKey });
}

export async function getUserWorkspaces(userUid: string) {
  try {
    // Workspaces user owns or is a member of
    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userUid, userUid));

    return memberships.map(m => ({
      ...m.workspace,
      userRole: m.role,
    }));
  } catch (error) {
    console.error('getUserWorkspaces error:', error);
    throw new Error('Failed to fetch workspaces', { cause: error });
  }
}

export async function createWorkspace(params: {
  name: string;
  description?: string;
  ownerUid: string;
  ownerEmail: string;
}) {
  try {
    const slug = `${params.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const [ws] = await db
      .insert(workspaces)
      .values({
        name: params.name,
        slug,
        description: params.description,
        ownerUid: params.ownerUid,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userUid: params.ownerUid,
      email: params.ownerEmail,
      role: 'admin',
    });

    return { ...ws, userRole: 'admin' };
  } catch (error) {
    console.error('createWorkspace error:', error);
    throw new Error('Failed to create workspace', { cause: error });
  }
}

export async function getWorkspaceMembers(workspaceId: number) {
  try {
    return await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  } catch (error) {
    console.error('getWorkspaceMembers error:', error);
    throw new Error('Failed to fetch workspace members', { cause: error });
  }
}

export async function addWorkspaceMember(params: {
  workspaceId: number;
  email: string;
  role: 'admin' | 'reviewer' | 'developer';
}) {
  try {
    // Generate a placeholder uid or match existing user
    const matchedUser = await db.select().from(users).where(eq(users.email, params.email));
    const userUid = matchedUser[0]?.uid || `user_${crypto.randomBytes(8).toString('hex')}`;

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: params.workspaceId,
        userUid,
        email: params.email,
        role: params.role,
      })
      .returning();
    return member;
  } catch (error) {
    console.error('addWorkspaceMember error:', error);
    throw new Error('Failed to add workspace member', { cause: error });
  }
}

export async function getCustomRules(userUid: string, workspaceId?: number) {
  try {
    if (workspaceId) {
      return await db
        .select()
        .from(customRules)
        .where(
          sql`${customRules.userUid} = ${userUid} OR ${customRules.workspaceId} = ${workspaceId}`
        );
    }
    return await db.select().from(customRules).where(eq(customRules.userUid, userUid));
  } catch (error) {
    console.error('getCustomRules error:', error);
    throw new Error('Failed to fetch custom rules', { cause: error });
  }
}

export async function createCustomRule(params: {
  userUid: string;
  workspaceId?: number;
  name: string;
  description?: string;
  promptDirective: string;
  category?: string;
}) {
  try {
    const [rule] = await db.insert(customRules).values(params).returning();
    return rule;
  } catch (error) {
    console.error('createCustomRule error:', error);
    throw new Error('Failed to create custom rule', { cause: error });
  }
}

export async function deleteCustomRule(ruleId: number, userUid: string) {
  try {
    await db
      .delete(customRules)
      .where(and(eq(customRules.id, ruleId), eq(customRules.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('deleteCustomRule error:', error);
    throw new Error('Failed to delete custom rule', { cause: error });
  }
}

export async function saveReview(params: {
  userUid: string;
  workspaceId?: number;
  title: string;
  language: string;
  inputMethod: string;
  files: any[];
  summary: string;
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: any[];
  optimizedCode: string;
}) {
  try {
    const [review] = await db
      .insert(reviews)
      .values({
        userUid: params.userUid,
        workspaceId: params.workspaceId,
        title: params.title,
        language: params.language,
        inputMethod: params.inputMethod,
        filesJson: JSON.stringify(params.files),
        summary: params.summary,
        healthScore: params.healthScore,
        criticalCount: params.criticalCount,
        highCount: params.highCount,
        mediumCount: params.mediumCount,
        lowCount: params.lowCount,
        findingsJson: JSON.stringify(params.findings),
        optimizedCode: params.optimizedCode,
      })
      .returning();

    // Trigger notification if critical or high issues found
    if (params.criticalCount > 0 || params.highCount > 0) {
      await db.insert(notifications).values({
        userUid: params.userUid,
        title: `Scan Completed: ${params.title}`,
        message: `Found ${params.criticalCount} critical and ${params.highCount} high severity issues. Health score: ${params.healthScore}/100.`,
        type: params.criticalCount > 0 ? 'alert' : 'warning',
        link: `/review/${review.id}`,
      });
    }

    return review;
  } catch (error) {
    console.error('saveReview error:', error);
    throw new Error('Failed to save review results', { cause: error });
  }
}

export async function getReviews(params: {
  userUid: string;
  workspaceId?: number;
  search?: string;
  language?: string;
  bookmarkedOnly?: boolean;
}) {
  try {
    let query = db
      .select()
      .from(reviews)
      .where(eq(reviews.userUid, params.userUid))
      .orderBy(desc(reviews.createdAt));

    const rows = await query;
    return rows.filter(r => {
      if (params.workspaceId && r.workspaceId !== params.workspaceId) return false;
      if (params.language && r.language.toLowerCase() !== params.language.toLowerCase())
        return false;
      if (params.bookmarkedOnly && !r.isBookmarked) return false;
      if (params.search) {
        const query = params.search.toLowerCase();
        return (
          r.title.toLowerCase().includes(query) ||
          (r.summary && r.summary.toLowerCase().includes(query)) ||
          r.language.toLowerCase().includes(query)
        );
      }
      return true;
    });
  } catch (error) {
    console.error('getReviews error:', error);
    throw new Error('Failed to fetch reviews', { cause: error });
  }
}

export async function getReviewById(id: number) {
  try {
    const rows = await db.select().from(reviews).where(eq(reviews.id, id));
    return rows[0] || null;
  } catch (error) {
    console.error('getReviewById error:', error);
    throw new Error('Failed to retrieve review', { cause: error });
  }
}

export async function toggleBookmarkReview(id: number, userUid: string) {
  try {
    const current = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.userUid, userUid)));
    if (!current.length) return null;

    const [updated] = await db
      .update(reviews)
      .set({ isBookmarked: !current[0].isBookmarked })
      .where(eq(reviews.id, id))
      .returning();

    return updated;
  } catch (error) {
    console.error('toggleBookmarkReview error:', error);
    throw new Error('Failed to toggle bookmark', { cause: error });
  }
}

export async function addChatMessage(params: {
  reviewId: number;
  sender: 'user' | 'assistant';
  userUid?: string;
  message: string;
}) {
  try {
    const [msg] = await db.insert(reviewChatMessages).values(params).returning();
    return msg;
  } catch (error) {
    console.error('addChatMessage error:', error);
    throw new Error('Failed to save chat message', { cause: error });
  }
}

export async function getChatMessages(reviewId: number) {
  try {
    return await db
      .select()
      .from(reviewChatMessages)
      .where(eq(reviewChatMessages.reviewId, reviewId))
      .orderBy(reviewChatMessages.createdAt);
  } catch (error) {
    console.error('getChatMessages error:', error);
    throw new Error('Failed to fetch chat history', { cause: error });
  }
}

export async function getUserNotifications(userUid: string) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userUid, userUid))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error('getUserNotifications error:', error);
    throw new Error('Failed to fetch notifications', { cause: error });
  }
}

export async function markNotificationAsRead(id: number, userUid: string) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    throw new Error('Failed to update notification', { cause: error });
  }
}

export async function getMetricsData(userUid: string) {
  try {
    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userUid, userUid))
      .orderBy(desc(reviews.createdAt));

    const totalReviews = userReviews.length;
    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageHealthScore: 100,
        totalIssues: 0,
        severityDistribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        categoryDistribution: { Bug: 0, Security: 0, Performance: 0, Style: 0 },
        recentTrend: [],
        topVulnerabilities: [],
      };
    }

    let totalHealth = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    const categoryCounts: Record<string, number> = {
      Bug: 0,
      Security: 0,
      Performance: 0,
      Style: 0,
    };
    const titleCounts: Record<string, number> = {};

    for (const r of userReviews) {
      totalHealth += r.healthScore || 0;
      critical += r.criticalCount || 0;
      high += r.highCount || 0;
      medium += r.mediumCount || 0;
      low += r.lowCount || 0;

      try {
        const findings = JSON.parse(r.findingsJson || '[]');
        for (const f of findings) {
          if (categoryCounts[f.category] !== undefined) {
            categoryCounts[f.category]++;
          }
          if (f.title) {
            titleCounts[f.title] = (titleCounts[f.title] || 0) + 1;
          }
        }
      } catch {
        // ignore parse error
      }
    }

    const topVulnerabilities = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    const recentTrend = userReviews.slice(0, 10).reverse().map(r => ({
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent',
      title: r.title,
      healthScore: r.healthScore,
      critical: r.criticalCount,
      high: r.highCount,
    }));

    return {
      totalReviews,
      averageHealthScore: Math.round(totalHealth / totalReviews),
      totalIssues: critical + high + medium + low,
      severityDistribution: {
        Critical: critical,
        High: high,
        Medium: medium,
        Low: low,
      },
      categoryDistribution: categoryCounts,
      recentTrend,
      topVulnerabilities,
    };
  } catch (error) {
    console.error('getMetricsData error:', error);
    throw new Error('Failed to calculate metrics', { cause: error });
  }
}
