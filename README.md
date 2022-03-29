# fastify-routing-controllers

Allows to create controller classes with methods as actions that handle requests.
You can use routing-controllers with [fastify](https://www.fastify.io/).

## Installation

1. Install module:

   `npm install routing-controllers`

   `yarn add routing-controllers`

2. `reflect-metadata` shim is required:

   `npm install reflect-metadata`

   and make sure to import it before you use routing-controllers:

```typescript
import 'reflect-metadata';
```

3. Install framework:

   `npm install fastify middie fastify-multer`


4. Install peer dependencies:

`npm install class-transformer class-validator`


## Example of usage

1. Create a file `UserController.ts`

   ```typescript
   import { Controller, Param, Body, Get, Post, Put, Delete } from 'routing-controllers';

   @Controller()
   export class UserController {
     @Get('/users')
     getAll() {
       return 'This action returns all users';
     }

     @Get('/users/:id')
     getOne(@Param('id') id: number) {
       return 'This action returns user #' + id;
     }

     @Post('/users')
     post(@Body() user: any) {
       return 'Saving user...';
     }

     @Put('/users/:id')
     put(@Param('id') id: number, @Body() user: any) {
       return 'Updating a user...';
     }

     @Delete('/users/:id')
     remove(@Param('id') id: number) {
       return 'Removing user...';
     }
   }
   ```

   This class will register routes specified in method decorators in your server framework (express.js or koa).

2. Create a file `app.ts`

   ```typescript
   // this shim is required
   import { createExpressServer } from 'routing-controllers';
   import { UserController } from './UserController'; import { FastifyDriver } from './FastifyDriver';

   // creates express app, registers all controller routes and returns you express app instance
   const app = createServer(new FastifyDriver(),{
     controllers: [UserController], // we specify controllers we want to use
   });

   // run express application on port 3000
   app.listen(3000);
   ```


3. Open in browser `http://localhost:3000/users`. You will see `This action returns all users` in your browser.
   If you open `http://localhost:3000/users/1` you will see `This action returns user #1`.
