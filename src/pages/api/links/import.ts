import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { links } = req.body;

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'No links provided' });
    }

    const client = await clientPromise;
    const db = client.db();

    // Create stored links
    const storedLinks = await Promise.all(
      links.map(async (url) => {
        const result = await db.collection('storedLinks').insertOne({
          url,
          userId: session.user.id,
          usedInCoupon: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return result;
      })
    );

    return res.status(200).json({ 
      count: storedLinks.length,
      message: 'Links imported successfully'
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 