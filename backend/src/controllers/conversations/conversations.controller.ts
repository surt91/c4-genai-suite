import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LocalAuthGuard } from 'src/domain/auth';
import {
  CallbackService,
  DeleteConversation,
  DeleteConversations,
  DuplicateConversation,
  DuplicateConversationResponse,
  GetConversation,
  GetConversationResponse,
  GetConversations,
  GetConversationsResponse,
  GetDocumentContent,
  GetDocumentContentResponse,
  GetHistory,
  GetHistoryResponse,
  RateMessage,
  RestoreConversation,
  SendMessage,
  SendMessageResponse,
  StartConversation,
  StartConversationResponse,
  UpdateConversation,
  UpdateConversationResponse,
} from 'src/domain/chat';
import { GetDocument, GetDocumentResponse } from 'src/domain/chat/use-cases/get-document';
import { attachmentContentDisposition } from 'src/lib';
import {
  ChatUICallbackResultDto,
  ConversationDto,
  ConversationsDto,
  CreateConversationDto,
  MessagesDto,
  RateMessageDto,
  SendMessageDto,
  StreamEventHolderDto,
  UpdateConversationDto,
} from './dtos';

@Controller('conversations')
@ApiTags('conversation')
@UseGuards(LocalAuthGuard)
export class ConversationsController {
  private logger = new Logger(this.constructor.name);

  constructor(
    private readonly callbacks: CallbackService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getConversations', description: 'Gets the list of recent conversations' })
  @ApiOkResponse({ type: ConversationsDto })
  @ApiExtraModels(StreamEventHolderDto)
  async getConversations(@Req() req: Request) {
    const response: GetConversationsResponse = await this.queryBus.execute(new GetConversations(req.user));

    return ConversationsDto.fromDomain(response.conversations);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getConversation', description: 'Get the conversation by ID.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async getConversation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const result: GetConversationResponse = await this.queryBus.execute(new GetConversation(+id, req.user));
    if (!result.conversation) {
      throw new NotFoundException(`Conversation with id '${id}' was not found`);
    }

    return ConversationDto.fromDomain(result.conversation);
  }

  @Post('')
  @ApiOperation({ operationId: 'postConversation', description: 'Starts the conversation.' })
  @ApiOkResponse({ type: ConversationDto })
  async postConversation(@Req() req: Request, @Body() body: CreateConversationDto) {
    const result: StartConversationResponse = await this.commandBus.execute(new StartConversation(req.user, body));

    return ConversationDto.fromDomain(result.conversation);
  }

  @Post(':id/duplicate')
  @ApiOperation({ operationId: 'duplicateConversation', description: 'Duplicates the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async duplicateConversation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const result: DuplicateConversationResponse = await this.commandBus.execute(new DuplicateConversation(id, req.user));
    return ConversationDto.fromDomain(result.conversation);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'patchConversation', description: 'Update the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async patchConversation(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateConversationDto) {
    const result: UpdateConversationResponse = await this.commandBus.execute(new UpdateConversation(+id, req.user, body));

    return ConversationDto.fromDomain(result.conversation);
  }

  @Get(':id/messages')
  @ApiOperation({ operationId: 'getMessages', description: 'Gets the messages of the current conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: MessagesDto })
  async getMessages(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const result: GetHistoryResponse = await this.queryBus.execute(new GetHistory(+id, req.user));

    return MessagesDto.fromDomain(result.history);
  }

  @Get(':id/messages/:messageId/documents/:documentUri/chunks')
  @ApiOperation({ operationId: 'getDocumentChunks', description: 'Get an array of document contents.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the ai message',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'documentUri',
    description: 'The uri of the document',
    required: true,
    type: String,
  })
  @ApiOkResponse({ type: [String] })
  async getDocumentChunks(
    @Req() req: Request,
    @Param('id', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('documentUri') documentUri: string,
  ) {
    const result: GetDocumentContentResponse = await this.queryBus.execute(
      new GetDocumentContent(req.user, conversationId, messageId, documentUri),
    );
    return result.documentContent;
  }

  @Get(':id/messages/:messageId/documents/:documentUri')
  @ApiOperation({
    operationId: 'getDocument',
    description: 'Get the original document specified by the documentUri from an extension',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the ai message.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'documentUri',
    description: 'The URI identifying the document.',
    required: true,
    type: String,
  })
  @ApiOkResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiProduces('application/octet-stream')
  async getDocument(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('documentUri') documentUri: string,
  ) {
    const result: GetDocumentResponse = await this.queryBus.execute(
      new GetDocument(req.user, conversationId, messageId, documentUri),
    );

    const document = result.document;
    if (!document) {
      response.status(404).send('Document not found');
      return;
    }
    const contentType = document.type ?? 'application/octet-stream';
    const bytes = await document.bytes();

    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Disposition', attachmentContentDisposition(document.name ?? 'document'));

    response.send(bytes);
  }

  private async streamResponse(@Req() req: Request, @Res() response: Response, getStream: () => Promise<SendMessageResponse>) {
    response.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });

    response.flushHeaders();

    let messageId = 1;

    const sendEvent = (type: 'error' | 'message', data: string | object) => {
      response.write(`id: ${messageId++}\n`);
      response.write(`event: ${type}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // The client closed the connection (e.g. pressed stop) before the answer was complete. Note: `req` 'close' is
    // emitted as soon as the request body has been read, so it cannot be used to detect disconnects.
    let cancel: (() => void) | undefined;
    let closed = false;
    response.on('close', () => {
      closed = true;
      if (!response.writableFinished) {
        cancel?.();
      }
    });

    try {
      const { stream, abort } = await getStream();
      const subscription = stream.subscribe({
        next: (event) => sendEvent('message', event),
        error: (err: unknown) => {
          sendEvent('error', toStreamError(err));
          response.end();
        },
        complete: () => response.end(),
      });

      cancel = () => {
        subscription.unsubscribe();
        abort.abort('cancelled');
      };
      if (closed) {
        cancel();
      }
    } catch (err) {
      this.logger.error('Error during message processing', err);
      sendEvent('error', toStreamError(err));
      response.end();
    }
  }

  @Put(':id/messages/:messageId/sse')
  @ApiOperation({
    operationId: 'putMessage',
    description: 'Updates an existing message message of the converation and handles it.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the message.',
    required: true,
    type: Number,
  })
  async putMessage(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.streamResponse(req, response, () =>
      this.queryBus.execute(new SendMessage(id, req.user, dto.query, dto.files, messageId)),
    );
  }

  @Post(':id/messages/sse')
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOperation({ operationId: 'postMessage', description: 'Adds a message to the converation and handles it.' })
  async postMessage(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.streamResponse(req, response, () => this.queryBus.execute(new SendMessage(id, req.user, dto.query, dto.files)));
  }

  @Patch(':id/messages/:messageId')
  @ApiOperation({ operationId: 'rateMessage', description: 'Updates the rating of a message of the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the message.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  async rateMessage(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() request: RateMessageDto,
  ) {
    await this.commandBus.execute(new RateMessage(+id, +messageId, req.user, request.rating));
  }

  @Delete()
  @ApiOperation({ operationId: 'deleteConversations', description: 'Deletes all conversations of a user.' })
  @ApiNoContentResponse()
  async deleteConversations(@Req() req: Request) {
    await this.commandBus.execute(new DeleteConversations(req.user));
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteConversation', description: 'Deletes the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  async deleteConversation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.commandBus.execute(new DeleteConversation(+id, req.user));
  }

  @Post(':id/restore')
  @ApiOperation({ operationId: 'restoreConversation', description: 'Restores a recently deleted conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'There is no conversation that can be restored.' })
  @HttpCode(204)
  async restoreConversation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.commandBus.execute(new RestoreConversation(+id, req.user));
  }

  @Delete(':id/confirm/:requestId')
  @ApiOperation({
    operationId: 'confirm',
    description: 'Answers a pending form request (e.g. a confirmation) of the generation in the conversation.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'requestId',
    description: 'The ID of the confirmation request.',
    required: true,
    type: String,
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'There is no pending request with this ID for the user and conversation.' })
  confirm(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('requestId') requestId: string,
    @Body() result: ChatUICallbackResultDto,
  ) {
    // Do not reveal whether a request of another user or conversation exists.
    if (!this.callbacks.answer(requestId, { userId: req.user.id, conversationId: id }, result)) {
      throw new NotFoundException();
    }
  }
}

/** Errors are no plain objects (`message` is not enumerable), so they must be converted before they are serialized. */
function toStreamError(err: unknown): object {
  if (err instanceof Error) {
    return { type: 'error', message: err.message };
  }
  return typeof err === 'object' && err !== null ? err : { type: 'error', message: String(err) };
}
