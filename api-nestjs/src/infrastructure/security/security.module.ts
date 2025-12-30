import { Module, Global } from '@nestjs/common';
import { TokenDenylistService } from './token-denylist.service';
import { CryptoService } from './crypto.service';
import { RedisModule } from '../redis/redis.module';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [RedisModule, JwtModule],
  providers: [TokenDenylistService, CryptoService],
  exports: [TokenDenylistService, CryptoService],
})
export class SecurityModule {}