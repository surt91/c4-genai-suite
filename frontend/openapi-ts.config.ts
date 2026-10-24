import { defineConfig, type UserConfig } from '@hey-api/openapi-ts';

// The generated clients throw on error responses (see `ResponseError` in src/api/state/errors.ts), return the response
// data directly and convert `date-time` fields to `Date` objects.
// Type names are kept as they are (e.g. `ChatUICallbackResultDto`, `QACatalog`), only the module-qualified ones of
// FastAPI (e.g. `llm_eval__eval__evaluations__models__EvaluationResult`) are converted to PascalCase.
const typeName = (name: string) =>
  name.includes('__')
    ? name
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    : name;

const plugins: UserConfig['plugins'] = [
  { name: '@hey-api/client-fetch', throwOnError: true },
  {
    name: '@hey-api/typescript',
    definitions: { case: 'preserve', name: typeName },
    enums: { mode: 'javascript', case: 'PascalCase' },
  },
  { name: '@hey-api/transformers', dates: true },
  {
    name: '@hey-api/sdk',
    operations: { strategy: 'byTags', containerName: '{{name}}Api', methods: 'instance' },
    paramsStructure: 'flat',
    responseStyle: 'data',
    transformer: true,
  },
];

// The SDK contains unused helper classes, which `noUnusedLocals` would reject.
const header = ({ defaultValue }: { defaultValue: ReadonlyArray<string> }) => [...defaultValue, '// @ts-nocheck'];

export default defineConfig([
  { input: '../backend/backend-dev-spec.json', output: { path: 'src/api/generated', header }, plugins },
  { input: '../services/eval/eval-dev-spec.json', output: { path: 'src/api/generated-eval', header }, plugins },
]);
