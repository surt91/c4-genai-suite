import { ApiExtension, ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

/** A string is valid as it is, everything else is validated by the following decorators. */
const IfNotString = () => ValidateIf((_, value) => typeof value !== 'string');

@ApiExtension('x-external', true)
export class ResponseInputFile {
  @ApiProperty({ enum: ['input_file'] })
  @IsIn(['input_file'])
  type!: 'input_file';

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  file_data?: string;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  file_id?: string;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;
}

@ApiExtension('x-external', true)
export class ResponseInputImage {
  @ApiProperty({ enum: ['low', 'high', 'auto'] })
  @IsIn(['low', 'high', 'auto'])
  detail!: 'low' | 'high' | 'auto';

  @ApiProperty({ enum: ['input_image'] })
  @IsIn(['input_image'])
  type!: 'input_image';

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  file_id?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  image_url?: string | null;
}

@ApiExtension('x-external', true)
export class ResponseInputText {
  @ApiProperty({ type: 'string' })
  @IsString()
  text!: string;

  @ApiProperty({ enum: ['input_text'] })
  @IsIn(['input_text'])
  type!: 'input_text';
}

const INPUT_CONTENT_TYPES = new Map<unknown, new () => object>([
  ['input_text', ResponseInputText],
  ['input_image', ResponseInputImage],
  ['input_file', ResponseInputFile],
]);

/** Content parts with another (or without a) type: only used for the validation, which then fails. */
class ResponseInputUnknown {
  @IsIn([...INPUT_CONTENT_TYPES.keys()])
  type!: string;
}

/**
 * Converts the content parts to the class of their `type` for the validation (non-objects are kept and rejected by the
 * validation). The discriminator of class-transformer cannot be used, because it fails for `null` items.
 */
function toContentParts({ value }: { value: unknown }) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((part: unknown) => {
    if (typeof part !== 'object' || part === null) {
      return part;
    }
    const type = INPUT_CONTENT_TYPES.get((part as { type?: unknown }).type) ?? ResponseInputUnknown;
    return plainToInstance(type, part);
  });
}

export type ResponseInputContent = ResponseInputText | ResponseInputImage | ResponseInputFile;
export type ResponseInputMessageContentList = Array<ResponseInputContent>;

@ApiExtraModels(ResponseInputText, ResponseInputImage, ResponseInputFile)
@ApiExtension('x-external', true)
export class EasyInputMessage {
  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(ResponseInputText) },
            { $ref: getSchemaPath(ResponseInputImage) },
            { $ref: getSchemaPath(ResponseInputFile) },
          ],
        },
      },
    ],
  })
  @IfNotString()
  @IsArray({ message: 'content must be a string or an array of input_text, input_image and input_file parts' })
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Transform(toContentParts)
  content!: string | ResponseInputMessageContentList;

  @ApiProperty({ enum: ['user', 'assistant', 'system', 'developer'] })
  @IsIn(['user', 'assistant', 'system', 'developer'])
  role!: 'user' | 'assistant' | 'system' | 'developer';

  @ApiPropertyOptional({ enum: ['message'] })
  @IsOptional()
  @IsIn(['message'])
  type?: 'message';
}

export type ResponseInputItem = EasyInputMessage;

export type ResponseInput = Array<ResponseInputItem>;

@ApiExtraModels(EasyInputMessage, ResponseInputText, ResponseInputImage, ResponseInputFile)
@ApiExtension('x-external', true)
export class ResponseCreateDto {
  @ApiPropertyOptional({ type: 'string', description: 'The model, by default the model of the assistant.' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { $ref: getSchemaPath(EasyInputMessage) } }] })
  @IfNotString()
  @IsArray({ message: 'input must be a string or an array of messages' })
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => EasyInputMessage)
  input!: string | ResponseInput;

  @ApiPropertyOptional({ type: 'boolean' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ type: 'number' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ type: 'boolean' })
  @IsOptional()
  @IsBoolean()
  store?: boolean;
}

export type ResponseDto = {
  id: string;
  object: 'response';
  created_at: number; // 1754392046;
  status: 'completed';
  background: false;
  error?: null;
  incomplete_details?: null;
  instructions?: string;
  max_output_tokens?: null;
  max_tool_calls?: null;
  model?: string;
  output: [
    {
      id: string;
      type: 'message';
      status: 'completed';
      content: [
        {
          type: 'output_text';
          annotations: [];
          text: string;
        },
      ];
      role: 'assistant';
    },
  ];
  parallel_tool_calls: true;
  previous_response_id?: string;
  prompt_cache_key?: null;
  reasoning?: {
    effort?: null;
    summary?: null;
  };
  safety_identifier?: null;
  service_tier: 'default';
  store: boolean; // default true
  temperature: number;
  text: {
    format: {
      type: 'text';
    };
  };
  tool_choice: 'auto';
  tools: [];
  top_p: number; // 1.0
  truncation: 'disabled';
  usage: {
    input_tokens: number; // 11;
    input_tokens_details: {
      cached_tokens: 0;
    };
    output_tokens: number; // 19;
    output_tokens_details: {
      reasoning_tokens: 0;
    };
    total_tokens: number; // 30
  };
  user?: null;
  metadata: Record<string, any>;
};

export type FilePurpose = 'assistants' | 'batch' | 'fine-tune' | 'vision' | 'user_data' | 'evals';
