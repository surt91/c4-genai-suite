import { Controller, Get, Header, NotFoundException, Param, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard } from '../../domain/auth/index.js';
import { GetBlob, GetBlobResponse } from '../../domain/settings/index.js';

@Controller('blobs')
@ApiTags('blobs')
@UseGuards(LocalAuthGuard)
export class BlobsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id')
  @ApiExcludeEndpoint()
  // the stored type must not be guessed differently by the browser (e.g. HTML)
  @Header('X-Content-Type-Options', 'nosniff')
  async getBlob(@Param('id') id: string, @Req() req: Request) {
    const result: GetBlobResponse = await this.queryBus.execute(new GetBlob(id, req.user.id));

    if (!result.blob) {
      throw new NotFoundException('Cannot find blob.');
    }

    return new StreamableFile(result.blob.buffer, { type: result.blob.type });
  }
}
