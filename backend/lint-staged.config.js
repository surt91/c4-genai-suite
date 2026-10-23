export default {
  '**/*.{js,jsx,ts,tsx}': ['prettier --write', 'eslint --fix', 'eslint', () => 'tsc -p tsconfig.json --noEmit'],
  '**/*.json': ['prettier --write'],
};
