import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity, FileRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { UploadedFile } from '../interfaces.js';
import { buildFile } from './utils.js';

/** Renames a personal file of the user. Only the shown name changes, the indexed content stays the same. */
export class RenameFile {
  constructor(
    public readonly user: User,
    public readonly id: number,
    public readonly fileName: string,
  ) {}
}

export class RenameFileResponse {
  constructor(public readonly file: UploadedFile) {}
}

@CommandHandler(RenameFile)
export class RenameFileHandler implements ICommandHandler<RenameFile, RenameFileResponse> {
  constructor(
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
  ) {}

  async execute(command: RenameFile): Promise<RenameFileResponse> {
    const { id, user } = command;
    const fileName = command.fileName.trim();

    if (!fileName || /[\\/]/.test(fileName)) {
      throw new BadRequestException('Invalid file name.');
    }

    const entity = await this.files.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`File with id '${id}' was not found`);
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    entity.fileName = fileName;
    const saved = await this.files.save(entity);

    return new RenameFileResponse(buildFile(saved));
  }
}
