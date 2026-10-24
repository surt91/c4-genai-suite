import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import { importX } from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
import noRestrictedApiConversations from "./eslint-rules/no-restricted-api-conversations.js";
import noZustandOutsideState from "./eslint-rules/no-zustand-outside-state.js";

export default defineConfig([globalIgnores([
    "**/.eslintrc.js",
    "src/api/generated*",
    "**/vite.config.ts",
    "**/vitest.setup.ts",
    "./mock/*.js",
    "./node_modules/**/*",
    "**/*.js",
    "**/*.mjs",
    "**/*.cjs",
]), {
    extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
        prettierRecommended,
        reactHooks.configs.flat.recommended,
    ],

    plugins: {
        "@eslint-react": eslintReact,
        "import-x": importX,
        "react-refresh": reactRefresh,
        "custom": {
            rules: {
                "no-restricted-api-conversations": noRestrictedApiConversations,
                "no-zustand-outside-state": noZustandOutsideState
            }
        }
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        sourceType: "module",

        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
        },
    },

    rules: {
        "no-unused-vars": "off", // replaced by @typescript-eslint/no-unused-vars
        "@typescript-eslint/no-unused-vars": [
           "error",
           {
              "varsIgnorePattern": "^_.*",
              "argsIgnorePattern": "^_.*",
              "caughtErrorsIgnorePattern": "^_",
              "ignoreRestSiblings": true,  // e.g.: c is not unused in ```const {a, ...x} = {a:1, b:2, c:3}```
           }
        ],
        "import-x/extensions": ["error", "never"],
        "import-x/no-extraneous-dependencies": "off",
        "import-x/no-useless-path-segments": "off",

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

        "custom/no-zustand-outside-state": ["error"],

        // To enforce api-calles are managed via hooks, and not within random tsx files.
        "custom/no-restricted-api-conversations": ["error", {
            allowedPaths: [
                "src/pages/chat/state",
		"src/hooks/api/files.ts",
		"src/hooks/conversation-extension-context.ts",
            ]
        }],

        // Restrict imports from zustand state to only within the state directory
        "no-restricted-imports": ["error", {
	    patterns: [{
	      group: ["*/state/zustand/*"],
	      message: "Access Zustand state only via hooks from '*/state/*' that expose specific sub-states or handle sync between API and local state.",
	    }],
	}],

        "prettier/prettier": ["error"],

        "react-refresh/only-export-components": ["error", {
            allowConstantExport: true,
        }],

        "sort-imports": ["error", {
            ignoreCase: true,
            ignoreDeclarationSort: true,
        }],

        // The equivalent of the former eslint-plugin-react "recommended" config (the rest is covered by TypeScript).
        "@eslint-react/no-missing-key": "error",
        "@eslint-react/no-duplicate-key": "error",
        "@eslint-react/jsx-no-comment-textnodes": "error",
        "@eslint-react/jsx-no-children-prop": "error",
        "@eslint-react/dom-no-dangerously-set-innerhtml-with-children": "error",
        "@eslint-react/no-direct-mutation-state": "error",
        "@eslint-react/dom-no-find-dom-node": "error",
        "@eslint-react/dom-no-render-return-value": "error",
        "@eslint-react/dom-no-unsafe-target-blank": "error",
        "@eslint-react/no-component-will-mount": "error",
        "@eslint-react/no-component-will-receive-props": "error",
        "@eslint-react/no-component-will-update": "error",
        "@eslint-react/no-unsafe-component-will-mount": "error",
        "@eslint-react/no-unsafe-component-will-receive-props": "error",
        "@eslint-react/no-unsafe-component-will-update": "error",
        "@eslint-react/dom-no-unknown-property": ["warn", { requireDataLowercase: true }],

        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "semi": ["error", "always"],

        // allow "unused" promises to be passed as props, since we are using react-hook-form and `form.handleSubmit` returns a promise.
        // see discussions https://github.com/orgs/react-hook-form/discussions/10965
        "@typescript-eslint/no-misused-promises": ["off", {
            checksVoidReturn: {
                attributes: false,
            },
        }],
        "no-warning-comments": "error",
    },
}]);
