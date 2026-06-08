'use client';

import React from 'react';
import { SmsConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ActionTestButton } from './shared/ActionTestButton';

interface Props {
  config: SmsConfig;
  onChange: (config: SmsConfig) => void;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function SmsNodeConfig({ config, onChange }: Props) {
  const set = <K extends keyof SmsConfig>(key: K, value: SmsConfig[K]) =>
    onChange({ ...config, [key]: value });

  const phoneError = config.toPhone && !/^\+[1-9]\d{7,14}$/.test(config.toPhone)
    ? 'Use E.164 format: +15551234567'
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="sms-to">To Phone Number</Label>
        <input
          id="sms-to"
          type="tel"
          value={config.toPhone}
          onChange={e => set('toPhone', e.target.value)}
          placeholder="+15551234567"
        />
        {phoneError && (
          <p className="mt-1 text-xs text-red-400/80">{phoneError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="sms-body">Message Template</Label>
        <textarea
          id="sms-body"
          value={config.messageTemplate}
          onChange={e => set('messageTemplate', e.target.value)}
          rows={4}
          placeholder="MarketPing: {{market}} crossed {{threshold}} — now {{price}}"
          className="resize-none font-mono text-xs leading-relaxed"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VARS.map(v => (
            <Button
              key={v}
              type="button"
              variant="ghost"
              size="sm"
              className="font-mono text-[11px] h-6 px-2 border border-white/[0.08] text-white/40 hover:text-white/70"
              onClick={() => {
                const sep = config.messageTemplate && !/\s$/.test(config.messageTemplate) ? ' ' : '';
                set('messageTemplate', config.messageTemplate + sep + v);
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <label
        htmlFor="sms-consent"
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
      >
        <input
          id="sms-consent"
          type="checkbox"
          checked={config.smsConsent === true}
          onChange={e => set('smsConsent', e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cyan-500"
        />
        <span className="text-xs leading-relaxed text-white/50">
          I agree to receive recurring automated market-alert text messages from MarketPing at
          the number above. Message frequency varies based on my alerts. Message and data rates
          may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.{' '}
          <a href="/terms" target="_blank" className="text-cyan-400 hover:underline">Terms</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</a>.
        </span>
      </label>

      <Card className="bg-green-500/5 border-green-500/15 p-3 space-y-1">
        <p className="text-xs text-green-400/80">
          SMS to <span className="font-semibold">{config.toPhone || 'your number'}</span>
        </p>
        <p className="text-xs text-white/25">
          Sent via Twilio · reply STOP to unsubscribe or HELP for help
        </p>
      </Card>
      <ActionTestButton type="sms" config={config} />
    </div>
  );
}

export function SmsNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
        <svg width="16" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="2" width="14" height="20" rx="3" stroke="#4ade80" strokeWidth="1.5"/>
          <path d="M9 18h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="8" y="6" width="8" height="7" rx="1" stroke="#4ade80" strokeWidth="1.25"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">SMS</span>
          <Badge variant="email" className="text-[10px] px-1.5 py-0.5">ACTION</Badge>
        </div>
        <p className="text-xs text-white/40">Send text message</p>
      </div>
    </div>
  );
}
