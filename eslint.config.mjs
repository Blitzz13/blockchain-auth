import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginImport from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import tsdocPlugin from "eslint-plugin-tsdoc";
import nxPlugin from "@nx/eslint-plugin";
import promise from "eslint-plugin-promise";

const commonRules = {
  // Prettier rules should be first to avoid conflicts
  "prettier/prettier": ["error"],
  "padding-line-between-statements": [
    "error",
    { blankLine: "always", prev: "*", next: "return" },
    { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
    { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
    { blankLine: "always", prev: ["if"], next: "*" },
  ],
  "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
  "sort-imports": [
    "error",
    {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
      allowSeparatedGroups: true,
    },
  ],
  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", ["sibling", "parent"], "index", "unknown"],
      distinctGroup: true,
      pathGroupsExcludedImportTypes: ["builtin"],
      "newlines-between": "always",
    },
  ],
  "@typescript-eslint/explicit-member-accessibility": [
    "error",
    {
      accessibility: "explicit",
      overrides: {
        constructors: "no-public",
        properties: "off",
      },
    },
  ],
  curly: ["error"],
  "import/no-default-export": ["error"],
  "grouped-accessor-pairs": ["error", "getBeforeSet"],
  "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
  "@typescript-eslint/no-unsafe-assignment": ["off"],
  "@typescript-eslint/no-unsafe-return": ["off"],
  "@typescript-eslint/unbound-method": ["off"],
  "@typescript-eslint/no-unsafe-call": ["off"],
  "@typescript-eslint/no-floating-promises": "error",
  "import/no-unresolved": ["off"],
  "@typescript-eslint/naming-convention": [
    "error",
    {
      selector: "memberLike",
      modifiers: ["private"],
      format: [],
      leadingUnderscore: "forbid",
      trailingUnderscore: "forbid",
    },
    {
      selector: "memberLike",
      modifiers: ["public"],
      format: [],
      leadingUnderscore: "forbid",
      trailingUnderscore: "forbid",
    },
    {
      selector: "memberLike",
      modifiers: ["protected"],
      format: [],
      leadingUnderscore: "forbid",
      trailingUnderscore: "forbid",
    },
  ],
  "@typescript-eslint/member-ordering": [
    "error",
    {
      default: [
        "public-static-field",
        "protected-static-field",
        "private-static-field",
        ["public-static-get", "public-static-set"],
        ["protected-static-get", "protected-static-set"],
        ["private-static-get", "private-static-set"],
        "public-static-method",
        "protected-static-method",
        "private-static-method",
        "public-field",
        "protected-field",
        "private-field",
        "public-constructor",
        "protected-constructor",
        "private-constructor",
        ["public-get", "public-set"],
        ["protected-get", "protected-set"],
        ["private-get", "private-set"],
        "signature",
        "public-method",
        "protected-method",
        "private-method",
      ],
    },
  ],
  "tsdoc/syntax": "error",
};

const commonPlugins = {
  prettier: prettierPlugin,
  import: eslintPluginImport,
  promise: promise,
  tsdoc: tsdocPlugin,
  "@nx": nxPlugin,
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Ignore patterns
  {
    ignores: [
      "**/dist/",
      "**/coverage/",
      "**/node_modules/",
      "**/build/",
      "**/built/",
      "**/.cache/",
      "**/.local-browsers/",
      "**/.vscode/",
      "**/.idea/",
      "**/.settings/",
      "**/.gradle/",
      "**/.nx/",
      "test-results/",
      "**/playwright-report/",
      ".trace",
      "**/internal/",
      "**/allure*",
      "**/.DS_Store",
      "**/.mono/",
      "**/game-assets/**",
      "blob-report",
      "**/eslint.config.*",
      "**/jest.config.*",
      "**/jest.preset.*",
      "**/webpack.*.*",
      "**/stylelint.config.*",
      "*.swp",
      "*.pyc",
      "nohup.out",
      "yarn-error.log",
      "pnpm-lock.yaml",
      ".failed-tests",
      "**/test-results.*",
      "*v8.log",
      "~*.docx",
      "**/.pnpm-store/",
      ".webpackCache",
    ],
  },

  // Base configuration for project files
  {
    files: ["**/src/**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: commonPlugins,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.base.json",
        ecmaVersion: 2022,
        sourceType: "module",
        extraFileExtensions: [".html"],
      },
      globals: {
        browser: true,
        node: true,
      },
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    rules: commonRules,
  },
);
