import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LocalAuthGuard } from '../../domain/auth/index.js';
import { GetConversation, GetConversationResponse } from '../../domain/chat/index.js';
import { GetExtension, GetExtensionResponse } from '../../domain/extensions/index.js';
import {
  DeleteFile,
  GetFiles,
  GetFilesResponse,
  RenameFile,
  RenameFileResponse,
  UploadFile,
  UploadFileResponse,
} from '../../domain/files/index.js';
import { I18nService } from '../../localization/i18n.service.js';
import { FileDto, FilesDto, RenameFileDto } from './dtos/index.js';
import { keepAlive } from './keep-alive.js';

/** Files without bucket are stored in the database (base64), so they are limited to 20 MB. */
const MAX_FILE_SIZE_WITHOUT_BUCKET = 20 * 1024 * 1024;

@Controller('user-files')
@ApiTags('files')
@UseGuards(LocalAuthGuard)
export class UserFilesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly i18n: I18nService,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getUserFiles', description: 'Gets the files for the user bucket.' })
  @ApiQuery({
    name: 'query',
    description: 'The query to search by file name.',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'The page count.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'The page size.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'conversationId',
    description: 'The conversation ID.',
    required: false,
    type: Number,
  })
  @ApiOkResponse({ type: FilesDto })
  async getUserFiles(
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
    @Query('conversationId') conversationId?: number,
  ) {
    const result: GetFilesResponse = await this.queryBus.execute(
      new GetFiles({
        user: req.user,
        bucketIdOrType: conversationId ? 'conversation' : 'user',
        page: page || 0,
        pageSize: pageSize || 20,
        query,
        conversationId,
      }),
    );

    return FilesDto.fromDomain(result.files, result.total);
  }

  @Post('')
  @ApiOperation({ operationId: 'postUserFile', description: 'Creates an file.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiQuery({
    name: 'extensionId',
    required: true,
    type: 'number',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    type: 'number',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: FileDto })
  async postUserFile(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Query('extensionId', new ParseIntPipe()) extensionId: number,
    @Query('conversationId', new ParseIntPipe({ optional: true })) conversationId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('file is missing');
    }

    const result: GetExtensionResponse = await this.queryBus.execute(new GetExtension({ id: extensionId }));
    const extension = result.extension;
    // Only file extensions accept uploads (any other extension would store the file without any checks).
    if (!extension?.enabled || !extension.name.startsWith('files')) {
      throw new NotFoundException('Extension not found');
    }

    if (conversationId) {
      // throws 403 for conversations of other users
      const { conversation }: GetConversationResponse = await this.queryBus.execute(
        new GetConversation(conversationId, req.user),
      );
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    }

    const bucket = extension.values?.bucket as number;
    const vectorize = (extension.values?.vectorize as boolean) ?? true;

    if (!bucket) {
      // Files without bucket (e.g. images for vision models) are stored in the database; the bucket checks
      // (file types, sizes, quota) do not apply, so the extension's file types and a size limit are enforced here.
      const fileNameExtensions: unknown = extension.values?.fileNameExtensions;
      const allowed =
        Array.isArray(fileNameExtensions) &&
        fileNameExtensions.some((x) => typeof x === 'string' && file.originalname.toLowerCase().endsWith(x.toLowerCase()));
      if (!allowed) {
        throw new BadRequestException(this.i18n.t('texts.extensions.files.errorNotAllowedFileType'));
      }
      if (file.size > MAX_FILE_SIZE_WITHOUT_BUCKET) {
        throw new BadRequestException(this.i18n.t('texts.extensions.files.errorFileTooLarge'));
      }
    }

    const embedType = bucket ? (vectorize ? 'vector_and_text' : 'text') : 'none';

    const command = new UploadFile({
      user: req.user,
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      bucketId: bucket,
      embedType,
      conversationId,
    });

    await keepAlive(res, async () => {
      const result: UploadFileResponse = await this.commandBus.execute(command);
      return FileDto.fromDomain(result.file);
    });
  }

  @Patch(':fileId')
  @ApiOperation({ operationId: 'renameUserFile', description: 'Renames a personal file of the user.' })
  @ApiParam({
    name: 'fileId',
    description: 'The ID of the file.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: FileDto })
  async renameUserFile(@Req() req: Request, @Param('fileId', ParseIntPipe) fileId: number, @Body() body: RenameFileDto) {
    const result: RenameFileResponse = await this.commandBus.execute(new RenameFile(req.user, fileId, body.fileName));

    return FileDto.fromDomain(result.file);
  }

  @Delete(':fileId')
  @ApiOperation({ operationId: 'deleteUserFile', description: 'Deletes a file.' })
  @ApiParam({
    name: 'fileId',
    description: 'The ID of the file.',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    type: 'number',
  })
  @ApiNoContentResponse()
  async deleteUserFile(
    @Req() req: Request,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Query('conversationId', new ParseIntPipe({ optional: true })) conversationId?: number,
  ) {
    const command = new DeleteFile(req.user, fileId, conversationId);

    await this.commandBus.execute(command);
  }
}
