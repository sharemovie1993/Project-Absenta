/**
 * Custom ESLint Hardening Plugin for Absenta.id
 * Menggunakan Abstract Syntax Tree (AST) untuk kepatuhan arsitektur presisi tinggi.
 */

export const safeMapChaining = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Wajib menggunakan optional chaining pada pemanggilan .map() untuk menghindari crash rendering jika data null/undefined.',
    },
    fixable: 'code', // Mendukung auto-fix otomatis!
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'map'
        ) {
          // Periksa apakah sudah menggunakan optional chaining (?.)
          if (!callee.optional) {
            // Abaikan literal array langsung karena nilainya dijamin ada (misal: [1, 2].map() )
            if (callee.object.type === 'ArrayExpression') {
              return;
            }
            context.report({
              node: callee.property,
              message: 'Pemetaan data tidak aman. Wajib menggunakan optional chaining (?.map) untuk mencegah crash runtime.',
              fix(fixer) {
                // Auto-fixer: Ganti token titik '.' menjadi '?.' sebelum kata 'map'
                const sourceCode = context.getSourceCode();
                const dotToken = sourceCode.getTokenAfter(callee.object);
                if (dotToken && dotToken.value === '.') {
                  return fixer.replaceText(dotToken, '?.');
                }
                return null;
              }
            });
          }
        }
      }
    };
  }
};

export const noUnsafeAsAny = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Dilarang menggunakan type casting "as any" karena melemahkan sistem pengetikan TypeScript.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (node.typeAnnotation && node.typeAnnotation.type === 'TSAnyKeyword') {
          context.report({
            node: node.typeAnnotation,
            message: 'Dilarang keras melakukan casting menggunakan "as any". Gunakan tipe data spesifik atau "unknown" jika terpaksa.',
          });
        }
      }
    };
  }
};

const plugin = {
  rules: {
    'safe-map-chaining': safeMapChaining,
    'no-unsafe-as-any': noUnsafeAsAny
  }
};

export default plugin;
