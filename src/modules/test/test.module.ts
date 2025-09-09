import { Module } from '@nestjs/common';
import { TestController } from './controllers/test.controller';
import { TestService } from './services/test.service';

@Module({
    controllers: [TestController],
    providers: [TestService],
    exports: [TestService],
})
export class TestModule { }

