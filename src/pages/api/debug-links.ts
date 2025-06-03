import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Get all links
    const allLinks = await db.collection('storedLinks').find({}).toArray();
    
    // Get counts
    const totalCount = await db.collection('storedLinks').countDocuments();
    const availableCount = await db.collection('storedLinks').countDocuments({ usedInCoupon: false });
    
    return res.status(200).json({
      totalLinks: totalCount,
      availableLinks: availableCount,
      allLinks: allLinks,
      message: 'Debug data retrieved successfully'
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Failed to get debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 