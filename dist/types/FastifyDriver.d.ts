import { Action, ActionMetadata, BaseDriver, MiddlewareMetadata, ParamMetadata, UseMetadata } from 'routing-controllers';
export declare class FastifyDriver extends BaseDriver {
    fastify?: any;
    constructor(fastify?: any);
    /**
     * Initializes the things driver needs before routes and middlewares registration.
     */
    initialize(): void;
    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata): void;
    /**
     * Registers action in the driver.
     */
    registerAction(actionMetadata: ActionMetadata, executeCallback: (options: Action) => any): void;
    /**
     * Registers all routes in the framework.
     */
    registerRoutes(): void;
    /**
     * Gets param from the request.
     */
    getParamFromRequest(action: Action, param: ParamMetadata): any;
    /**
     * Handles result of successfully executed controller action.
     */
    handleSuccess(result: any, action: ActionMetadata, options: Action): void;
    /**
     * Handles result of failed executed controller action.
     */
    handleError(error: any, action: ActionMetadata | undefined, options: Action): any;
    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareMiddlewares(uses: UseMetadata[]): Function[];
    /**
     * Dynamically loads express module.
     */
    protected loadFastify(): void;
    /**
     * Dynamically loads multer module.
     */
    protected loadMulter(): any;
    /**
     * Dynamically loads middie module.
     */
    protected loadMiddie(): any;
}
