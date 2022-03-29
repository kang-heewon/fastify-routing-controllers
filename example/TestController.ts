import { Controller, Get } from 'routing-controllers';

@Controller('/')
export class TestController {
  @Get()
  hello() {
    return 'hello';
  }
}
