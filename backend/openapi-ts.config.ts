import { defineConfig } from '@hey-api/openapi-ts';

// The generated REI-S client throws on error responses (see `ResponseError` in src/domain/files/use-cases/utils.ts)
// and returns the response data directly.
export default defineConfig({
  input: '../services/reis/reis-dev-spec.json',
  output: {
    path: 'src/domain/files/use-cases/generated',
    module: { extension: '.js' },
    // The SDK contains unused helper classes.
    header: ({ defaultValue }) => [...defaultValue, '// @ts-nocheck'],
  },
  plugins: [
    { name: '@hey-api/client-fetch', throwOnError: true },
    { name: '@hey-api/typescript', definitions: { case: 'preserve' } },
    {
      name: '@hey-api/sdk',
      operations: { strategy: 'byTags', containerName: '{{name}}Api', methods: 'instance' },
      paramsStructure: 'flat',
      responseStyle: 'data',
    },
  ],
});
