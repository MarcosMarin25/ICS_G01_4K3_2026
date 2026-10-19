const js = require("@eslint/js");
const globals = require("globals");
const stylistic = require("@stylistic/eslint-plugin");

// Guía de estilo adoptada por el grupo, basada en el código existente y verificada con ESLint.
module.exports = [
  {
    ignores: ["coverage/**", "reportes/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    plugins: { "@stylistic": stylistic },
    rules: {
      // Formato
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/max-len": ["error", { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],

      // Nombres: camelCase para variables y métodos, PascalCase para clases, MAYÚSCULAS para constantes
      "camelcase": ["error", { properties: "never" }],
      "new-cap": "error",

      // Buenas prácticas
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "curly": ["error", "all"],
      "no-magic-numbers": ["error", {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
      }],
    },
  },
  {
    // La interfaz web corre en el navegador como script clásico, no como módulo de Node.
    files: ["src/web/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.jest },
    },
    rules: {
      // En las pruebas los números son los datos del caso (edades, precios, cantidades).
      "no-magic-numbers": "off",
    },
  },
];
