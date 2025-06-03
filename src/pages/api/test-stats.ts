import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Session user ID:', session.user.id);

    const client = await clientPromise;
    const db = client.db();

    // Get all links for this user
    const allLinks = await db.collection('storedLinks').find({
      userId: session.user.id
    }).toArray();

    // Get counts
    const totalCount = await db.collection('storedLinks').countDocuments({
      userId: session.user.id
    });

    const availableCount = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      usedInCoupon: false
    });

    // Get some sample links
    const sampleLinks = allLinks.slice(0, 5);

    return res.status(200).json({
      userId: session.user.id,
      totalLinks: totalCount,
      availableLinks: availableCount,
      sampleLinks: sampleLinks,
      message: 'Test data retrieved successfully'
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: 'Failed to get test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 