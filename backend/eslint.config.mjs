import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import { importX } from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([globalIgnores(["**/generated/**", "**/database/interfaces.ts"]), {
    extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
        prettierRecommended,
    ],

    plugins: {
        "import-x": importX,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.vitest,
        },

        sourceType: "module",

        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
        },
    },

    rules: {
        "import-x/order": ["error", {
            pathGroupsExcludedImportTypes: ["builtin"],

            alphabetize: {
                order: "asc",
            },
        }],

        "prettier/prettier": ["error"],

        "sort-imports": ["error", {
            ignoreCase: true,
            ignoreDeclarationSort: true,
        }],

        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: '^_'
        }],
    },
}, {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
        // Mock objects (e.g. vi.fn()) are not real class methods, so
        // `unbound-method` produces false positives when asserting on them via
        // `expect(repo.method).toHaveBeenCalled()`. Disable in test files.
        "@typescript-eslint/unbound-method": "off",
    },
}]);
