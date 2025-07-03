import express, { Request, Response } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './database/prisma';
import job from './config/cron';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());




// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.send('The health is OK');
});

if (process.env.NODE_ENV === "production") job.start()
 
// Get All Projects (Public)
app.get('/api/v1/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a New Project (Auth Required)
app.post('/api/v1/projects', requireAuth(), async (req: Request, res: Response): Promise<void> => {
  const { title, description, techStack, githubUrl, liveUrl, imageUrl } = req.body;
  const { userId: clerkId } = getAuth(req);

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
        where: { clerkId: clerkId as string }
      });
          if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        techStack,
        githubUrl,
        liveUrl,
        imageUrl,
        userId: user.id
      }
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a Project by ID (Public)
app.get('/api/v1/project/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Logged-in User's Projects (Auth Required)
app.get('/api/v1/projects/me', requireAuth(), async (req: Request, res: Response): Promise<void> => {
  const { userId: clerkId } = getAuth(req);

  try {
    const user = await prisma.user.findUnique({
        where: { clerkId: clerkId as string },
        include: { projects: true }
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user.projects);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Project (Only Owner)
app.patch('/api/v1/projects/:id', requireAuth(), async (req: Request, res: Response): Promise<void> => {
  const { title, description, techStack, githubUrl, liveUrl, imageUrl } = req.body;
  const { userId: clerkId } = getAuth(req);

  try {

      
    const user = await prisma.user.findUnique({
        where: { clerkId: clerkId as string }
      });
         
      if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
      

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.userId !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: { title, description, techStack, githubUrl, liveUrl, imageUrl }
    });

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Project (Only Owner)
app.delete('/api/v1/projects/:id', requireAuth(), async (req: Request, res: Response): Promise<void> => {
  const { userId: clerkId } = getAuth(req);

  try {
    const user = await prisma.user.findUnique({
        where: { clerkId: clerkId as string }
      });
          if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.userId !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
