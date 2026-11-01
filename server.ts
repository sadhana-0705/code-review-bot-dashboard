import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { analyzeCodeWithGemini, askFollowUpQuestion } from './src/lib/gemini.ts';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile,
  regenerateApiKey,
  getUserWorkspaces,
  createWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  getCustomRules,
  createCustomRule,
  deleteCustomRule,
  saveReview,
  getReviews,
  getReviewById,
  toggleBookmarkReview,
  addChatMessage,
  getChatMessages,
  getUserNotifications,
  markNotificationAsRead,
  getMetricsData,
} from './src/db/queries.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodeRefine AI Review Engine' });
});

// User sync upon sign-in
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const synced = await getOrCreateUser({
      uid: user.uid,
      email: user.email,
      displayName: req.body.displayName || user.name,
      avatarUrl: req.body.avatarUrl || user.picture,
    });
    res.json(synced);
  } catch (error: any) {
    console.error('Auth sync failed:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Profile & Preferences
app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfile(req.user!.uid);
    res.json(profile || { uid: req.user!.uid, email: req.user!.email });
  } catch (error: any) {
    console.error('Fetch profile failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateUserProfile(req.user!.uid, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Update profile failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/regenerate-api-key', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await regenerateApiKey(req.user!.uid);
    res.json(updated);
  } catch (error: any) {
    console.error('Regenerate API key failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Workspaces
app.get('/api/workspaces', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getUserWorkspaces(req.user!.uid);
    res.json(list);
  } catch (error: any) {
    console.error('Get workspaces failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workspaces', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Workspace name is required' });
    const created = await createWorkspace({
      name,
      description,
      ownerUid: req.user!.uid,
      ownerEmail: req.user!.email,
    });
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create workspace failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workspaces/:id/members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const members = await getWorkspaceMembers(parseInt(req.params.id, 10));
    res.json(members);
  } catch (error: any) {
    console.error('Get members failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workspaces/:id/members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required' });
    const member = await addWorkspaceMember({
      workspaceId: parseInt(req.params.id, 10),
      email,
      role: role as any,
    });
    res.status(201).json(member);
  } catch (error: any) {
    console.error('Add member failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Custom Rules
app.get('/api/rules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
    const rules = await getCustomRules(req.user!.uid, workspaceId);
    res.json(rules);
  } catch (error: any) {
    console.error('Get rules failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, promptDirective, description, category, workspaceId } = req.body;
    if (!name || !promptDirective) {
      return res.status(400).json({ error: 'Name and promptDirective are required' });
    }
    const created = await createCustomRule({
      userUid: req.user!.uid,
      workspaceId: workspaceId ? parseInt(workspaceId, 10) : undefined,
      name,
      description,
      promptDirective,
      category: category || 'general',
    });
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create rule failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rules/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await deleteCustomRule(parseInt(req.params.id, 10), req.user!.uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete rule failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Core AI Code Review Trigger
app.post('/api/reviews/analyze', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      files,
      language,
      inputMethod = 'snippet',
      workspaceId,
      customRules = [],
      contextPrompt = '',
      title,
    } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'At least one code file is required' });
    }

    const detectedLang = language || files[0].language || 'typescript';

    // Call Gemini API server-side
    const analysis = await analyzeCodeWithGemini({
      files,
      primaryLanguage: detectedLang,
      customRules,
      contextPrompt,
    });

    const reviewTitle = title || analysis.title || `Review: ${files[0].name || 'Snippet'} (${detectedLang})`;

    let savedRecord = null;
    if (req.user?.uid) {
      savedRecord = await saveReview({
        userUid: req.user.uid,
        workspaceId: workspaceId ? parseInt(workspaceId, 10) : undefined,
        title: reviewTitle,
        language: analysis.language || detectedLang,
        inputMethod,
        files,
        summary: analysis.summary,
        healthScore: analysis.healthScore,
        criticalCount: analysis.criticalCount,
        highCount: analysis.highCount,
        mediumCount: analysis.mediumCount,
        lowCount: analysis.lowCount,
        findings: analysis.findings,
        optimizedCode: analysis.optimizedCode,
      });
    }

    res.json({
      ...analysis,
      id: savedRecord?.id || Math.floor(Math.random() * 100000),
      title: reviewTitle,
      saved: !!savedRecord,
      createdAt: savedRecord?.createdAt || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: error.message || 'AI code analysis failed' });
  }
});

// Reviews List & History
app.get('/api/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, search, language, bookmarked } = req.query;
    const list = await getReviews({
      userUid: req.user!.uid,
      workspaceId: workspaceId ? parseInt(workspaceId as string, 10) : undefined,
      search: search as string,
      language: language as string,
      bookmarkedOnly: bookmarked === 'true',
    });
    res.json(list);
  } catch (error: any) {
    console.error('Get reviews failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Review details
app.get('/api/reviews/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const review = await getReviewById(parseInt(req.params.id, 10));
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const chat = await getChatMessages(review.id);
    res.json({ ...review, chatMessages: chat });
  } catch (error: any) {
    console.error('Get review by id failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bookmark toggle
app.patch('/api/reviews/:id/bookmark', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await toggleBookmarkReview(parseInt(req.params.id, 10), req.user!.uid);
    res.json(updated);
  } catch (error: any) {
    console.error('Toggle bookmark failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Follow-up Review Chat
app.post('/api/reviews/:id/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const review = await getReviewById(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const existingChat = await getChatMessages(reviewId);

    // Save user message
    await addChatMessage({
      reviewId,
      sender: 'user',
      userUid: req.user!.uid,
      message: question,
    });

    const aiAnswer = await askFollowUpQuestion({
      codeContext: review.filesJson,
      findingsContext: review.findingsJson,
      history: existingChat.map(c => ({ sender: c.sender as any, message: c.message })),
      question,
    });

    // Save assistant message
    const savedAiMsg = await addChatMessage({
      reviewId,
      sender: 'assistant',
      message: aiAnswer,
    });

    res.json(savedAiMsg);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notifications
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getUserNotifications(req.user!.uid);
    res.json(list);
  } catch (error: any) {
    console.error('Get notifications failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await markNotificationAsRead(parseInt(req.params.id, 10), req.user!.uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark notification read failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Metrics
app.get('/api/metrics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await getMetricsData(req.user!.uid);
    res.json(metrics);
  } catch (error: any) {
    console.error('Get metrics failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// CI/CD Pipeline Endpoint
// Authenticated via X-API-Key header or Bearer token
app.post('/api/cicd/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { files, language = 'auto', failThreshold = 'High' } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Invalid payload: provide array of { name, content, language } in "files"',
      });
    }

    const analysis = await analyzeCodeWithGemini({
      files,
      primaryLanguage: language === 'auto' ? files[0].language || 'typescript' : language,
    });

    // Determine pass / fail based on threshold
    const hasCritical = analysis.criticalCount > 0;
    const hasHigh = analysis.highCount > 0;
    const failed =
      failThreshold === 'Critical'
        ? hasCritical
        : failThreshold === 'High'
        ? hasCritical || hasHigh
        : analysis.criticalCount + analysis.highCount + analysis.mediumCount > 0;

    const saved = await saveReview({
      userUid: req.user!.uid,
      title: `CI/CD Build Scan: ${files[0].name} (${files.length} files)`,
      language: analysis.language,
      inputMethod: 'repo',
      files,
      summary: analysis.summary,
      healthScore: analysis.healthScore,
      criticalCount: analysis.criticalCount,
      highCount: analysis.highCount,
      mediumCount: analysis.mediumCount,
      lowCount: analysis.lowCount,
      findings: analysis.findings,
      optimizedCode: analysis.optimizedCode,
    });

    res.json({
      status: failed ? 'FAILURE' : 'SUCCESS',
      healthScore: analysis.healthScore,
      reviewId: saved.id,
      criticalCount: analysis.criticalCount,
      highCount: analysis.highCount,
      mediumCount: analysis.mediumCount,
      lowCount: analysis.lowCount,
      summary: analysis.summary,
      findings: analysis.findings,
    });
  } catch (error: any) {
    console.error('CI/CD review failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vite mounting & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`CodeRefine AI backend listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
