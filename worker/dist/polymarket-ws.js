"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketWSManager = void 0;
const ws_1 = __importDefault(require("ws"));
const threshold_1 = require("./threshold");
const notifier_1 = require("./notifier");
class PolymarketWSManager {
    // conditionId → subscriptions
    subs = new Map();
    // slug → conditionId cache
    slugToCondition = new Map();
    // conditionId → best bid/ask for mid-price computation
    orderBook = new Map();
    ws = null;
    supabase;
    reconnectTimer = null;
    // Pending slugs queued before connect() is called
    pendingSlugs = new Map();
    constructor(supabase) {
        this.supabase = supabase;
    }
    watch(slug, workflowId, nodeId) {
        const conditionId = this.slugToCondition.get(slug);
        if (conditionId) {
            // Already resolved — subscribe immediately
            this.addSub(conditionId, { workflowId, nodeId, slug });
            this.sendSubscribe([conditionId]);
        }
        else {
            // Queue it for resolution at connect time
            const pending = this.pendingSlugs.get(slug) ?? [];
            if (!pending.some(s => s.workflowId === workflowId && s.nodeId === nodeId)) {
                this.pendingSlugs.set(slug, [...pending, { workflowId, nodeId, slug }]);
            }
        }
    }
    unregisterWorkflow(workflowId) {
        for (const [key, entries] of this.subs.entries()) {
            const filtered = entries.filter(s => s.workflowId !== workflowId);
            if (filtered.length === 0)
                this.subs.delete(key);
            else
                this.subs.set(key, filtered);
        }
        for (const [slug, entries] of this.pendingSlugs.entries()) {
            const filtered = entries.filter(s => s.workflowId !== workflowId);
            if (filtered.length === 0)
                this.pendingSlugs.delete(slug);
            else
                this.pendingSlugs.set(slug, filtered);
        }
    }
    async connect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        await this.resolveAllSlugs();
        this.ws = new ws_1.default('wss://ws-subscriptions-clob.polymarket.com/ws/market');
        this.ws.on('open', () => {
            console.log('[polymarket-ws] connected');
            const conditionIds = [...this.subs.keys()];
            if (conditionIds.length > 0)
                this.sendSubscribe(conditionIds);
        });
        this.ws.on('message', (raw) => {
            try {
                const msgs = JSON.parse(raw.toString());
                const arr = Array.isArray(msgs) ? msgs : [msgs];
                for (const msg of arr)
                    this.handleMessage(msg);
            }
            catch (e) {
                console.error('[polymarket-ws] parse error:', e);
            }
        });
        this.ws.on('close', () => {
            console.log('[polymarket-ws] disconnected — reconnecting in 5s');
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        });
        this.ws.on('error', (err) => console.error('[polymarket-ws] error:', err.message));
    }
    async resolveAllSlugs() {
        const slugs = [...this.pendingSlugs.keys()];
        await Promise.allSettled(slugs.map(async (slug) => {
            try {
                const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}&limit=1`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
                const data = await res.json();
                const conditionId = data[0]?.conditionId;
                if (!conditionId) {
                    console.error('[polymarket-ws] no conditionId for slug:', slug);
                    return;
                }
                this.slugToCondition.set(slug, conditionId);
                const pending = this.pendingSlugs.get(slug) ?? [];
                for (const sub of pending)
                    this.addSub(conditionId, sub);
                this.pendingSlugs.delete(slug);
            }
            catch (e) {
                console.error('[polymarket-ws] slug resolve failed:', slug, e);
            }
        }));
    }
    addSub(conditionId, sub) {
        const existing = this.subs.get(conditionId) ?? [];
        if (!existing.some(s => s.workflowId === sub.workflowId && s.nodeId === sub.nodeId)) {
            this.subs.set(conditionId, [...existing, sub]);
        }
    }
    sendSubscribe(conditionIds) {
        if (this.ws?.readyState !== ws_1.default.OPEN)
            return;
        this.ws.send(JSON.stringify({ type: 'market', assets_ids: conditionIds }));
    }
    handleMessage(msg) {
        const conditionId = msg.market ?? msg.asset_id;
        if (!conditionId || !this.subs.has(conditionId))
            return;
        // Direct price_change message (if best_bid_ask feature flag is enabled)
        if (msg.type === 'price_change' || msg.event_type === 'price_change') {
            const price = parseFloat(msg.price ?? '0');
            if (price > 0)
                this.dispatchPrice(conditionId, price);
            return;
        }
        // Book snapshot or delta — extract best bid/ask and compute mid
        const bids = msg.bids ?? [];
        const asks = msg.asks ?? [];
        if (bids.length > 0 || asks.length > 0) {
            const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : (this.orderBook.get(conditionId)?.bestBid ?? 0);
            const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : (this.orderBook.get(conditionId)?.bestAsk ?? 0);
            this.orderBook.set(conditionId, { bestBid, bestAsk });
            const mid = bestBid > 0 && bestAsk > 0
                ? (bestBid + bestAsk) / 2
                : bestBid || bestAsk;
            if (mid > 0)
                this.dispatchPrice(conditionId, mid);
        }
    }
    async dispatchPrice(conditionId, price) {
        const entries = this.subs.get(conditionId);
        if (!entries)
            return;
        for (const { workflowId, nodeId, slug } of entries) {
            await this.processUpdate(workflowId, nodeId, slug, price);
        }
    }
    async processUpdate(workflowId, nodeId, slug, price) {
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
            platform: 'polymarket',
            market_key: slug,
            last_price: price,
            last_checked_at: new Date().toISOString(),
        };
        if (shouldNotify) {
            console.log(`[polymarket-ws] threshold crossed — ${slug} @ ${(price * 100).toFixed(0)}¢`);
            await (0, notifier_1.notify)(wf, node, price, this.supabase);
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
exports.PolymarketWSManager = PolymarketWSManager;
