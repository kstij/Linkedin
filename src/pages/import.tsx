import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Import() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [links, setLinks] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  const handleImportLinks = async () => {
    if (!links.trim()) {
      alert('Please enter at least one link');
      return;
    }
    setIsImporting(true);
    try {
      const linkArray = links
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);
      const response = await fetch('/api/links/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: linkArray }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import links');
      }
      const data = await response.json();
      setLinks('');
      alert(`Imported ${data.count} links`);
    } catch (error) {
      alert('Failed to import links');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2>Import Links</h2>
        <div style={{ margin: '12px 0' }}>
          <textarea
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder="Paste your links here (one per line)"
            rows={8}
            style={{ width: '100%', fontSize: 16 }}
          />
        </div>
        <button onClick={handleImportLinks} disabled={isImporting} style={{ fontSize: 16, padding: '8px 24px' }}>
          {isImporting ? 'Importing...' : 'Import Links'}
        </button>
      </div>
    </div>
  );
} 