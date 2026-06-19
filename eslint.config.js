import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const typeScriptFiles = ["**/*.{ts,tsx}"];

const typeCheckedTypeScript = tseslint.configs.recommendedTypeChecked.map(
  (config) => ({
    ...config,
    files: typeScriptFiles
  })
);

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "package-lock.json"
    ]
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    plugins: {
      "@stylistic": stylistic
    },
    rules: {
      "@stylistic/indent": ["warn", 2, { SwitchCase: 1 }],
      "@stylistic/operator-linebreak": [
        "warn",
        "before",
        { overrides: { "=": "none" } }
      ],
      "@stylistic/no-multi-spaces": "warn",
      "brace-style": ["warn", "1tbs", { allowSingleLine: false }],
      curly: ["error", "all"],
      "padding-line-between-statements": [
        "warn",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: "*", next: "throw" },
        { blankLine: "always", prev: "*", next: "if" },
        { blankLine: "always", prev: "*", next: "try" },
        { blankLine: "always", prev: "*", next: "for" },
        { blankLine: "always", prev: "*", next: "while" },
        { blankLine: "always", prev: "*", next: "switch" },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"]
        }
      ]
    }
  },
  ...typeCheckedTypeScript,
  {
    files: typeScriptFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error"
    }
  },
  {
    files: ["src/integrations/notionStore.ts", "src/setup/notionSetup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off"
    }
  }
);
