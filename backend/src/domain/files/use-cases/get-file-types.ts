import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FileType } from '../interfaces.js';
import { buildClient } from './utils.js';

export class GetFileTypes {
  constructor(
    public readonly endpoint: string,
    public readonly headers?: string,
  ) {}
}

export class GetFileTypesResponse {
  constructor(public readonly fileTypes: FileType[]) {}
}

@QueryHandler(GetFileTypes)
export class GetFileTypesHandler implements IQueryHandler<GetFileTypes, GetFileTypesResponse> {
  async execute(query: GetFileTypes): Promise<GetFileTypesResponse> {
    const api = buildClient(query);
    const result = await api.getFileTypes();
    return new GetFileTypesResponse(
      result.items.map(({ fileNameExtension }) => ({ value: fileNameExtension, label: fileNameExtension })),
    );
  }
}
