# fastify-routing-controllers

Allows to create controller classes with methods as actions that handle requests.
You can use routing-controllers with [fastify](https://www.fastify.io/).

## Installation

1. Install module:
   - `npm install routing-controllers`
   - `yarn add routing-controllers`

2. Install framework:
   - `npm install fastify middie fastify-multer`
   - `yarn add fastify middie fastify-multer`
   

## Example of usage


1. Create a file `app.ts`

   ```typescript
   import { createServer } from 'routing-controllers';
   import { UserController } from './UserController'; 
   import { FastifyDriver } from 'fastify-routing-controllers';

   // creates express app, registers all controller routes and returns you express app instance
   const app = createServer(new FastifyDriver(),{
     controllers: [UserController], // we specify controllers we want to use
   });

   // run express application on port 3000
   app.listen(3000);
   ```


2. Open in browser `http://localhost:3000/users`. You will see `This action returns all users` in your browser.
   If you open `http://localhost:3000/users/1` you will see `This action returns user #1`.
