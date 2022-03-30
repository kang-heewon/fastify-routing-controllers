"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPromiseLike = void 0;
function isPromiseLike(arg) {
    return arg != null && typeof arg === 'object' && typeof arg.then === 'function';
}
exports.isPromiseLike = isPromiseLike;
//# sourceMappingURL=utils.js.map