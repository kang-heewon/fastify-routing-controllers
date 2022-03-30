export function isPromiseLike(arg) {
    return arg != null && typeof arg === 'object' && typeof arg.then === 'function';
}
//# sourceMappingURL=utils.js.map