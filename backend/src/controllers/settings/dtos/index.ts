import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Settings } from '../../../domain/settings/index.js';
import { ChatSuggestionDto, SiteLinkDto } from '../../shared.js';

@ApiExtraModels(ChatSuggestionDto)
export class SettingsDto {
  @ApiProperty({
    description: 'The language of the app.',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'The name of the app.',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'The primary color used for buttons and links.',
    required: false,
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({
    description: 'The primary content color used for buttons and links.',
    required: false,
  })
  @IsOptional()
  @IsString()
  primaryContentColor?: string;

  @ApiProperty({
    description: 'The welcome text.',
    required: false,
  })
  @IsOptional()
  @IsString()
  welcomeText?: string;

  @ApiProperty({
    description: 'The name of the agent.',
    required: false,
  })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiProperty({
    description: 'The footer text to be shown below the chat.',
    required: false,
  })
  @IsOptional()
  @IsString()
  chatFooter?: string;

  @ApiProperty({
    description: 'The suggestions to be shown for the chat.',
    required: false,
    type: [ChatSuggestionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatSuggestionDto)
  chatSuggestions?: ChatSuggestionDto[];

  @ApiProperty({
    description: 'The site links to be shown on login screen',
    required: false,
    type: [SiteLinkDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SiteLinkDto)
  siteLinks?: SiteLinkDto[];

  @ApiProperty({
    description: 'Some custom css.',
    required: false,
  })
  @IsOptional()
  @IsString()
  customCss?: string;

  @ApiProperty({
    description: 'The key of the logo.',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    description: 'The key of the backgroundLogo.',
    required: false,
  })
  @IsOptional()
  @IsString()
  backgroundLogo?: string;

  @ApiProperty({
    description: 'The key of the avatar logo.',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarLogo?: string;

  static fromDomain(source: Settings) {
    const result = new SettingsDto();
    result.name = source.name;
    result.agentName = source.agentName;
    result.chatFooter = source.chatFooter;
    result.chatSuggestions = source.chatSuggestions;
    result.customCss = source.customCss;
    result.primaryColor = source.primaryColor;
    result.primaryContentColor = source.primaryContentColor;
    result.welcomeText = source.welcomeText;
    result.siteLinks = source.siteLinks;
    result.language = source.language;
    result.logo = source.logo;
    result.avatarLogo = source.avatarLogo;
    result.backgroundLogo = source.backgroundLogo;

    return result;
  }
}
