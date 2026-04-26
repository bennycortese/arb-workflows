"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiWSManager = void 0;
const ws_1 = __importDefault(require("ws"));
const threshold_1 = require("./threshold");
const notifier_1 = require("./notifier");
class KalshiWSManager {
    // ticker (uppercase) → subscriptions watching it
    subs = new Map();
    ws = null;
    supabase;
    apiKey;
    reconnectTimer = null;
    constructor(apiKey, supabase) {
        this.apiKey = apiKey;
        this.supabase = supabase;
    }
    watch(ticker, workflowId, nodeId) {
        const key = ticker.toUpperCase();
        const existing = this.subs.get(key) ?? [];
        if (!existing.some(s => s.workflowId === workflowId && s.nodeId === nodeId)) {
            this.subs.set(key, [...existing, { workflowId, nodeId }]);
            // If already connected, subscribe to this new ticker immediately
            this.sendSubscribe([key]);
        }
    }
    unregisterWorkflow(workflowId) {
        for (const [ticker, entries] of this.subs.entries()) {
            const filtered = entries.filter(s => s.workflowId !== workflowId);
            if (filtered.length === 0) {
                this.subs.delete(ticker);
                this.sendUnsubscribe(ticker);
            }
            else {
                this.subs.set(ticker, filtered);
            }
        }
    }
    connect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws = new ws_1.default('wss://api.elections.kalshi.com/trade-api/ws/v2');
        this.ws.on('open', () => {
            console.log('[kalshi-ws] connected');
            const tickers = [...this.subs.keys()];
            if (tickers.length > 0)
                this.sendSubscribe(tickers);
        });
        this.ws.on('message', (raw) => {
            try {
                this.handleMessage(JSON.parse(raw.toString()));
            }
            catch (e) {
                console.error('[kalshi-ws] parse error:', e);
            }
        });
        this.ws.on('close', () => {
            console.log('[kalshi-ws] disconnected — reconnecting in 5s');
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        });
        this.ws.on('error', (err) => console.error('[kalshi-ws] error:', err.message));
    }
    sendSubscribe(tickers) {
        if (this.ws?.readyState !== ws_1.default.OPEN)
            return;
        this.ws.send(JSON.stringify({
            id: Date.now(),
            cmd: 'subscribe',
            params: {
                channels: ['ticker'],
                market_tickers: tickers,
                auth_token: this.apiKey,
            },
        }));
    }
    sendUnsubscribe(ticker) {
        if (this.ws?.readyState !== ws_1.default.OPEN)
            return;
        this.ws.send(JSON.stringify({
            id: Date.now(),
            cmd: 'unsubscribe',
            params: { channels: ['ticker'], market_tickers: [ticker] },
        }));
    }
    async handleMessage(msg) {
        if (msg.type !== 'ticker')
            return;
        const ticker = msg.msg?.market_ticker;
        if (!ticker)
            return;
        // yes_bid is in cents (integer) — convert to fraction
        const yesBid = msg.msg?.yes_bid ?? 0;
        const price = yesBid / 100;
        const entries = this.subs.get(ticker.toUpperCase());
        if (!entries)
            return;
        for (const { workflowId, nodeId } of entries) {
            await this.processUpdate(workflowId, nodeId, 'kalshi', ticker, price);
        }
    }
    async processUpdate(workflowId, nodeId, platform, marketKey, price) {
        const [{ data: wf }, { data: state }] = await Promise.all([
            this.supabase.from('workflows').select('*').eq('id', workflowId).single(),
            this.supabase.from('workflow_market_states')
                .select('threshold_triggered')
                .eq('workflow_id', workflowId)
                .eq('node_id', nodeId)
                .single(),
        ]);
        if (!wf || !wf.enabled)
            return;
        const node = wf.nodes.find((n) => n.id === nodeId);
        if (!node)
            return;
        const { shouldNotify, shouldReset } = (0, threshold_1.checkThreshold)(price, node.config, state);
        const stateUpdate = {
            workflow_id: workflowId,
            node_id: nodeId,
            platform,
            market_key: marketKey,
            last_price: price,
            last_checked_at: new Date().toISOString(),
        };
        if (shouldNotify) {
            console.log(`[kalshi-ws] threshold crossed — ${marketKey} @ ${(price * 100).toFixed(0)}¢`);
            await (0, notifier_1.notify)(wf, node, price);
            stateUpdate.threshold_triggered = true;
            stateUpdate.last_triggered_at = new Date().toISOString();
        }
        if (shouldReset) {
            stateUpdate.threshold_triggered = false;
        }
        await this.supabase.from('workflow_market_states')
            .upsert(stateUpdate, { onConflict: 'workflow_id,node_id' });
    }
}
exports.KalshiWSManager = KalshiWSManager;
