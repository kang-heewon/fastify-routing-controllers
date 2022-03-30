import { ActionMetadata, BaseDriver, getFromContainer, NotFoundError, } from 'routing-controllers';
import { isPromiseLike } from './utils';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookie = require('cookie');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const templateUrl = require('template-url');
export class FastifyDriver extends BaseDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(fastify) {
        super();
        this.fastify = fastify;
        this.loadFastify();
        this.loadMiddie();
        this.app = this.fastify;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Initializes the things driver needs before routes and middlewares registration.
     */
    initialize() {
        if (this.cors) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const cors = require('cors');
            if (this.cors === true) {
                this.fastify.use(cors());
            }
            else {
                this.fastify.use(cors(this.cors));
            }
        }
    }
    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware) {
        let middlewareWrapper;
        // if its a regular middleware then register it as express middleware
        if (middleware.instance.use) {
            middlewareWrapper = (request, response, next) => {
                try {
                    const useResult = middleware.instance.use(request, response, next);
                    if (isPromiseLike(useResult)) {
                        useResult.catch((error) => {
                            this.handleError(error, undefined, { request, response, next });
                            return error;
                        });
                    }
                }
                catch (error) {
                    this.handleError(error, undefined, { request, response, next });
                }
            };
        }
        if (middlewareWrapper) {
            // Name the function for better debugging
            Object.defineProperty(middlewareWrapper, 'name', {
                value: middleware.instance.constructor.name,
                writable: true,
            });
            this.fastify.use(middlewareWrapper);
        }
    }
    /**
     * Registers action in the driver.
     */
    registerAction(actionMetadata, executeCallback) {
        // middlewares required for this action
        const defaultMiddlewares = [];
        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push((request, response, next) => {
                if (!this.authorizationChecker)
                    throw new Error(); //AuthorizationCheckerNotDefinedError();
                const action = { request, response, next };
                try {
                    const checkResult = this.authorizationChecker(action, actionMetadata.authorizedRoles);
                    const handleError = (result) => {
                        if (!result) {
                            const error = actionMetadata.authorizedRoles.length === 0
                                ? new Error() //AuthorizationRequiredError(action)
                                : new Error(); //AccessDeniedError(action);
                            this.handleError(error, actionMetadata, action);
                        }
                        else {
                            next();
                        }
                    };
                    if (isPromiseLike(checkResult)) {
                        checkResult
                            .then(result => handleError(result))
                            .catch(error => this.handleError(error, actionMetadata, action));
                    }
                    else {
                        handleError(checkResult);
                    }
                }
                catch (error) {
                    this.handleError(error, actionMetadata, action);
                }
            });
        }
        if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            const multer = this.loadMulter();
            actionMetadata.params
                .filter(param => param.type === 'file')
                .forEach(param => {
                defaultMiddlewares.push(multer(param.extraOptions).single(param.name));
            });
            actionMetadata.params
                .filter(param => param.type === 'files')
                .forEach(param => {
                defaultMiddlewares.push(multer(param.extraOptions).array(param.name));
            });
        }
        // user used middlewares
        const uses = [...actionMetadata.controllerMetadata.uses, ...actionMetadata.uses];
        const beforeMiddlewares = this.prepareMiddlewares(uses.filter(use => !use.afterAction));
        const afterMiddlewares = this.prepareMiddlewares(uses.filter(use => use.afterAction));
        // prepare route and route handler function
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);
        const routeHandler = function routeHandler(request, response, next) {
            return executeCallback({ request, response, next });
        };
        const routeGuard = function routeGuard(request, response, next) {
            if (!request.routingControllersStarted) {
                request.routingControllersStarted = true;
                return next();
            }
        };
        // finally register action in express
        this.fastify[actionMetadata.type.toLowerCase()](route, { preHandler: [routeGuard, ...beforeMiddlewares, ...defaultMiddlewares, ...afterMiddlewares] }, routeHandler);
    }
    /**
     * Registers all routes in the framework.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    registerRoutes() { }
    /**
     * Gets param from the request.
     */
    getParamFromRequest(action, param) {
        const request = action.request;
        switch (param.type) {
            case 'body':
                return request.body;
            case 'body-param':
                return request.body[param.name];
            case 'param':
                return request.params[param.name];
            case 'params':
                return request.params;
            case 'session-param':
                return request.session[param.name];
            case 'session':
                return request.session;
            case 'state':
                throw new Error('@State decorators are not supported by express driver.');
            case 'query':
                return request.query[param.name];
            case 'queries':
                return request.query;
            case 'header':
                return request.headers[param.name.toLowerCase()];
            case 'headers':
                return request.headers;
            case 'file':
                return request.file;
            case 'files':
                return request.files;
            case 'cookie':
                if (!request.headers.cookie)
                    return;
                const cookies = cookie.parse(request.headers.cookie);
                return cookies[param.name];
            case 'cookies':
                if (!request.headers.cookie)
                    return {};
                return cookie.parse(request.headers.cookie);
        }
    }
    /**
     * Handles result of successfully executed controller action.
     */
    handleSuccess(result, action, options) {
        var _a, _b, _c, _d, _e;
        // if the action returned the response object itself, short-circuits
        if (result && result === options.response) {
            (_a = options.next) === null || _a === void 0 ? void 0 : _a.call(options);
            return;
        }
        // transform result if needed
        result = this.transformResult(result, action, options);
        // set http status code
        if (result === undefined && action.undefinedResultCode) {
            if (action.undefinedResultCode instanceof Function) {
                throw new action.undefinedResultCode(options);
            }
            options.response.status(action.undefinedResultCode);
        }
        else if (result === null) {
            if (action.nullResultCode) {
                if (action.nullResultCode instanceof Function) {
                    throw new action.nullResultCode(options);
                }
                options.response.status(action.nullResultCode);
            }
            else {
                options.response.status(204);
            }
        }
        else if (action.successHttpCode) {
            options.response.status(action.successHttpCode);
        }
        // apply http headers
        Object.keys(action.headers).forEach(name => {
            options.response.header(name, action.headers[name]);
        });
        if (action.redirect) {
            // if redirect is set then do it
            if (typeof result === 'string') {
                options.response.redirect(result);
            }
            else if (result instanceof Object) {
                options.response.redirect(templateUrl(action.redirect, result));
            }
            else {
                options.response.redirect(action.redirect);
            }
            (_b = options.next) === null || _b === void 0 ? void 0 : _b.call(options);
        }
        else if (action.renderedTemplate) {
            // if template is set then render it
            const renderOptions = result && result instanceof Object ? result : {};
            options.response.render(action.renderedTemplate, renderOptions, (err, html) => {
                var _a, _b, _c;
                if (err && action.isJsonTyped) {
                    return (_a = options.next) === null || _a === void 0 ? void 0 : _a.call(options, err);
                }
                else if (err && !action.isJsonTyped) {
                    return (_b = options.next) === null || _b === void 0 ? void 0 : _b.call(options, err);
                }
                else if (html) {
                    options.response.send(html);
                }
                (_c = options.next) === null || _c === void 0 ? void 0 : _c.call(options);
            });
        }
        else if (result === undefined) {
            // throw NotFoundError on undefined response
            if (action.undefinedResultCode) {
                if (action.isJsonTyped) {
                    options.response.json();
                }
                else {
                    options.response.send();
                }
                (_c = options.next) === null || _c === void 0 ? void 0 : _c.call(options);
            }
            else {
                throw new NotFoundError();
            }
        }
        else if (result === null) {
            // send null response
            if (action.isJsonTyped) {
                options.response.json(null);
            }
            else {
                options.response.send(null);
            }
            (_d = options.next) === null || _d === void 0 ? void 0 : _d.call(options);
        }
        else if (result instanceof Buffer) {
            // check if it's binary data (Buffer)
            options.response.end(result, 'binary');
        }
        else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            options.response.end(Buffer.from(result), 'binary');
        }
        else if (result.pipe instanceof Function) {
            result.pipe(options.response);
        }
        else {
            // send regular result
            if (action.isJsonTyped) {
                options.response.json(result);
            }
            else {
                options.response.send(result);
            }
            (_e = options.next) === null || _e === void 0 ? void 0 : _e.call(options);
        }
    }
    /**
     * Handles result of failed executed controller action.
     */
    handleError(error, action, options) {
        var _a;
        if (this.isDefaultErrorHandlingEnabled) {
            const response = options.response;
            // set http code
            // note that we can't use error instanceof HttpError properly anymore because of new typescript emit process
            if (error.httpCode) {
                response.status(error.httpCode);
            }
            else {
                response.status(500);
            }
            // apply http headers
            if (action) {
                Object.keys(action.headers).forEach(name => {
                    response.header(name, action.headers[name]);
                });
            }
            // send error content
            if (action && action.isJsonTyped) {
                response.json(this.processJsonError(error));
            }
            else {
                response.send(this.processTextError(error)); // todo: no need to do it because express by default does it
            }
        }
        (_a = options.next) === null || _a === void 0 ? void 0 : _a.call(options, error);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates middlewares from the given "use"-s.
     */
    prepareMiddlewares(uses) {
        const middlewareFunctions = [];
        uses.forEach((use) => {
            if (use.middleware.prototype && use.middleware.prototype.use) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push((request, response, next) => {
                    try {
                        const useResult = getFromContainer(use.middleware).use(request, response, next);
                        if (isPromiseLike(useResult)) {
                            useResult.catch((error) => {
                                this.handleError(error, undefined, { request, response, next });
                                return error;
                            });
                        }
                        return useResult;
                    }
                    catch (error) {
                        this.handleError(error, undefined, { request, response, next });
                    }
                });
            }
            else {
                middlewareFunctions.push(use.middleware);
            }
        });
        return middlewareFunctions;
    }
    /**
     * Dynamically loads express module.
     */
    loadFastify() {
        if (require) {
            if (!this.fastify) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    this.fastify = require('fastify')();
                }
                catch (e) {
                    throw new Error('fastify package was not found installed. Try to install it: npm install fastify --save');
                }
            }
        }
        else {
            throw new Error('Cannot load fastify. Try to install all required dependencies.');
        }
    }
    /**
     * Dynamically loads multer module.
     */
    loadMulter() {
        try {
            return require('fastify-multer');
        }
        catch (e) {
            throw new Error('fastify-multer package was not found installed. Try to install it: npm install fastify-multer --save');
        }
    }
    /**
     * Dynamically loads middie module.
     */
    loadMiddie() {
        try {
            return require('middie');
        }
        catch (e) {
            throw new Error('middie package was not found installed. Try to install it: npm install middie --save');
        }
    }
}
//# sourceMappingURL=FastifyDriver.js.map