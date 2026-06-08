'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { NodeConfig, NodeType } from '../../atoms';

export function ActionTestButton({
  type,
  config,
}: {
  type: NodeType;
  config: NodeConfig;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sendTest() {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch('/api/actions/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `test-${type}`, type, config }),
      });
      const data = await response.json();
      const message = data.result?.message ?? data.error ?? 'Test failed';
      setResult({ ok: response.ok, message });
    } catch {
      setResult({ ok: false, message: 'Could not reach MarketPing. Try again.' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={testing} onClick={sendTest}>
        {testing ? 'Sending test...' : 'Send test alert'}
      </Button>
      {result && (
        <p className={`text-xs ${result.ok ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
