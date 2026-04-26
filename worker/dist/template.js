"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillTemplate = fillTemplate;
function fillTemplate(template, vars) {
    return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}
