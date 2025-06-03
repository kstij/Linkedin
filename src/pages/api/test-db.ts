import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Test the connection
    await db.command({ ping: 1 });
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Get count of storedLinks
    const storedLinksCount = await db.collection('storedLinks').countDocuments();
    
    return res.status(200).json({
      message: 'MongoDB connection successful',
      collections: collections.map(c => c.name),
      storedLinksCount
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return res.status(500).json({ 
      error: 'Failed to connect to MongoDB',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 