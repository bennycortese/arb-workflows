"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiWSManager = void 0;
const ws_1 = __importDefault(require("ws"));
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
        // last_price fires on every trade; yes_bid only fires on orderbook changes
        // (bid-only was causing slow/missed updates on thin 15-min markets)
        const rawPrice = msg.msg?.last_price ?? msg.msg?.yes_bid ?? 0;
        const price = rawPrice / 100;
        const entries = this.subs.get(ticker.toUpperCase());
        if (!entries)
            return;
        for (const { workflowId, nodeId } of entries) {
            await this.processUpdate(workflowId, nodeId, 'kalshi', ticker, price);
        }
    }
    async processUpdate(workflowId, nodeId, platform, marketKey, price) {
        const { data: wf } = await this.supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();
        if (!wf || !wf.enabled)
            return;
        const node = wf.nodes.find((n) => n.id === nodeId);
        if (!node)
            return;
        const threshold = parseFloat(node.config?.priceThreshold ?? '0.5');
        const direction = node.config?.direction ?? 'any';
        const inZone = direction === 'any' ||
            (direction === 'above' && price >= threshold) ||
            (direction === 'below' && price <= threshold);
        const { data: claimed, error } = await this.supabase.rpc('claim_market_threshold', {
            p_workflow_id: workflowId,
            p_node_id: nodeId,
            p_platform: platform,
            p_market_key: marketKey,
            p_price: price,
            p_in_zone: inZone,
        });
        if (error) {
            console.error('[kalshi-ws] threshold claim failed:', error.message);
            return;
        }
        if (claimed === true) {
            console.log(`[kalshi-ws] threshold crossed — ${marketKey} @ ${(price * 100).toFixed(0)}¢`);
            await (0, notifier_1.notify)(wf, node, price, this.supabase);
        }
    }
}
exports.KalshiWSManager = KalshiWSManager;
