import { create } from 'zustand';
import { BucketDto, FileDto } from 'src/api';

interface FilesState {
  // The files.
  files: FileDto[];

  // The bucket of the files.
  bucketId?: number;

  // Adds or sets an file.
  setFile: (file: FileDto) => void;

  // Sets all files of a bucket.
  setFiles: (source: FileDto[], bucketId: number) => void;

  // Remove an file.
  removeFile: (id: number) => void;
}

interface BucketsState {
  // The buckets.
  buckets: BucketDto[];

  // Adds or sets an bucket.
  setBucket: (bucket: BucketDto) => void;

  // Sets all buckets.
  setBuckets: (bucket: BucketDto[]) => void;

  // Remove an bucket.
  removeBucket: (id: number) => void;
}

const useFilesStore_ = create<FilesState>()((set) => ({
  specs: [],
  files: [],
  setFile: (file: FileDto) => {
    return set((state) => {
      const files = [...state.files];

      const indexOfExisting = files.findIndex((x) => x.id === file.id);
      if (indexOfExisting >= 0) {
        files[indexOfExisting] = file;
      } else {
        files.push(file);
      }

      return { files };
    });
  },
  setFiles: (files: FileDto[], bucketId: number) => {
    return set({ files, bucketId });
  },
  removeFile: (id: number) => {
    return set((state) => ({ files: state.files.filter((x) => x.id !== id) }));
  },
}));

/**
 * @deprecated Using Zustand hooks directly in ui-components is deprecated. Use
 * other hooks to wrap the Zustand hook instead. We want hooks to have
 * interfaces that fit our domains terminology. E.g. useAIConversation exports
 * a function called sendMessage, which will talk to the LLM and update the
 * messages internally. No separate call to a Zustand hook has to be made in
 * order to update messages after using sendMessage. An ideal version of the
 * useAIConversation hook exports only actions like sendMessage and states like
 * messages, but no setters.
 **/
export const useFilesStore = useFilesStore_;

const useBucketstore_ = create<BucketsState>()((set) => ({
  buckets: [],
  setBucket: (bucket: BucketDto) => {
    return set((state) => {
      const buckets = [...state.buckets];

      const indexOfExisting = state.buckets.findIndex((x) => x.id === bucket.id);
      if (indexOfExisting >= 0) {
        buckets[indexOfExisting] = bucket;
      } else {
        buckets.push(bucket);
      }

      return { buckets };
    });
  },
  setBuckets: (buckets: BucketDto[]) => {
    return set({ buckets });
  },
  removeBucket: (id: number) => {
    return set((state) => ({ buckets: state.buckets.filter((x) => x.id !== id) }));
  },
}));

/**
 * @deprecated Using Zustand hooks directly in ui-components is deprecated. Use
 * other hooks to wrap the Zustand hook instead. We want hooks to have
 * interfaces that fit our domains terminology. E.g. useAIConversation exports
 * a function called sendMessage, which will talk to the LLM and update the
 * messages internally. No separate call to a Zustand hook has to be made in
 * order to update messages after using sendMessage. An ideal version of the
 * useAIConversation hook exports only actions like sendMessage and states like
 * messages, but no setters.
 **/
export const useBucketstore = useBucketstore_;
