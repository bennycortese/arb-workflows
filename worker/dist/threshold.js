"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkThreshold = checkThreshold;
function checkThreshold(price, config, state) {
    const threshold = parseFloat(config.priceThreshold ?? '0.5');
    const direction = config.direction ?? 'any';
    const alreadyTriggered = state?.threshold_triggered ?? false;
    const inZone = direction === 'any' ||
        (direction === 'above' && price >= threshold) ||
        (direction === 'below' && price <= threshold);
    return {
        shouldNotify: inZone && !alreadyTriggered,
        shouldReset: !inZone && alreadyTriggered,
    };
}
