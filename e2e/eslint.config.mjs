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
            ...globals.jest,
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

            pathGroups: [{
                pattern: "src/**",
                group: "external",
                position: "after",
            }],

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
}]);
