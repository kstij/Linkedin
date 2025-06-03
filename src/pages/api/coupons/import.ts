import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import { promisify } from 'util';
import { connectToDatabase } from '@/lib/mongodb';

const readFile = promisify(fs.readFile);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    const name = fields.name?.[0] || '';
    const daysUntilExpiry = parseInt(fields.daysUntilExpiry?.[0] || '2');

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = await readFile(file.filepath, 'utf-8');
    const links = fileContent.split('\n').map(l => l.trim()).filter(Boolean);

    if (links.length === 0) {
      return res.status(400).json({ error: 'No valid links found in file' });
    }

    const { db } = await connectToDatabase();
    const coupons = [];

    for (const link of links) {
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);

      const coupon = {
        code,
        claimLink: link,
        name,
        isClaimed: false,
        claimedAt: null,
        claimedBy: null,
        createdAt: new Date(),
        expiresAt,
        createdBy: session.user?.email,
      };

      await db.collection('coupons').insertOne(coupon);
      coupons.push(coupon);
    }

    return res.status(200).json({ count: coupons.length, coupons });
  } catch (error) {
    console.error('Error importing coupons:', error);
    return res.status(500).json({ error: 'Failed to import coupons' });
  }
} 