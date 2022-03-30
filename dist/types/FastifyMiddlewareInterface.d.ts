export interface FastifyMiddlewareInterface {
    use(request: any, response: any, next: (err?: any) => any): any;
}
