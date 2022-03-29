import './TestController';

import { createExpressServer, createServer } from 'routing-controllers';
import { FastifyDriver } from '../src';
import fastify from 'fastify';

(() => {
  //
  const app = createExpressServer();

  app.listen(3001);

  console.log('Express server is running on port 3001. Open http://localhost:3001/');
})();
