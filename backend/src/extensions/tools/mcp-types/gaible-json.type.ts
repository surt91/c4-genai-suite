import { Source } from '../../../domain/chat/index.js';

export type GaibleJsonType = {
  kind: string;
  version: string;
  data: {
    text: string;
    original?: string;
    id: string;
    score: number;
    region: {
      bounding_boxes?: {
        left: number;
        top: number;
        width: number;
        height: number;
        page: number;
      }[];
      pages?: number[];
    };
    metadata: {
      uri: string;
      mime_type: string;
      link?: string;
      size?: number;
      title?: string;
      attributes?: {
        [key: string]: any;
      };
    };
  };
};

const getDistinctPages = (regions: GaibleJsonType['data']['region']): number[] => {
  return Array.from(new Set(regions.bounding_boxes?.map((x) => x.page) ?? regions.pages ?? []));
};

export const convertGaibleJsonToText = (type: GaibleJsonType): { type: 'text'; text: string } => {
  return { type: 'text', text: type.data.original ?? type.data.text };
};

export const convertGaibleJsonToSource = (type: GaibleJsonType): Source => {
  const metadata = type.data.metadata;
  return {
    title: type.data.metadata.title ?? type.data.id,
    chunk: {
      content: type.data.original ?? type.data.text,
      pages: getDistinctPages(type.data.region),
      score: type.data.score,
    },
    document: {
      uri: type.data.metadata.uri,
      mimeType: type.data.metadata.mime_type,
      link: type.data.metadata.link,
      size: type.data.metadata.size,
      downloadAvailable: true,
    },
    metadata: metadata.attributes ?? {},
  };
};
