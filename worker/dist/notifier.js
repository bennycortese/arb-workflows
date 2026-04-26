"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
const template_1 = require("./template");
async function notify(workflow, sourceNode, price) {
    const platform = sourceNode.type === 'kalshi' ? 'Kalshi' : 'Polymarket';
    const marketKey = sourceNode.type === 'kalshi'
        ? sourceNode.config.marketTicker
        : sourceNode.config.marketSlug;
    const threshold = parseFloat(sourceNode.config.priceThreshold ?? '0.5');
    const vars = {
        platform,
        market: marketKey,
        price: `${(price * 100).toFixed(0)}¢`,
        threshold: `${(threshold * 100).toFixed(0)}¢`,
        direction: sourceNode.config.direction ?? 'any',
        url: sourceNode.type === 'kalshi'
            ? `https://kalshi.com/markets/${marketKey}`
            : `https://polymarket.com/event/${marketKey}`,
    };
    const actionNodes = workflow.nodes.filter((n) => n.type === 'discord' || n.type === 'email');
    await Promise.allSettled(actionNodes.map(async (action) => {
        if (action.type === 'discord') {
            await sendDiscord(action.config.webhookUrl, (0, template_1.fillTemplate)(action.config.messageTemplate ?? '{{market}} hit {{price}}', vars));
        }
        else if (action.type === 'email') {
            await sendEmail(action.config.toEmail, (0, template_1.fillTemplate)(action.config.subject ?? 'ArbFlow Alert', vars), (0, template_1.fillTemplate)(action.config.bodyTemplate ?? '{{market}}: {{price}}', vars));
        }
    }));
}
async function sendDiscord(webhookUrl, content) {
    if (!webhookUrl)
        return;
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });
}
async function sendEmail(to, subject, body) {
    if (!to)
        return;
    const apiKey = process.env.AGENT_MAIL_API_KEY;
    if (!apiKey) {
        console.error('[notifier] AGENT_MAIL_API_KEY not set');
        return;
    }
    await fetch('https://api.agentmail.to/v0/inboxes/arbworflow@agentmail.to/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, text: body }),
    });
}
