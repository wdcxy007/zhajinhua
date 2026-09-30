// 极简 ESM 解析钩子（仅用于沙箱零依赖运行 .ts 测试）。
//
// 仅为「无扩展名的相对导入」（如源码中的 `import ... from './types'`）补上 `.ts`，
// 配合 `node --experimental-strip-types` 直接运行源码与测试，无需安装任何依赖。
// 各目录（shared/、tests/、server/src/game/）已通过 package.json 的
// "type":"module" 声明为 ESM，使 Node 自动按 ESM 转译 .ts。
//
// 用法：
//   node --experimental-strip-types --experimental-loader ./tests/ts-resolver.mjs tests/xxx.test.ts
//
// 真实机器上更推荐用 vitest（npm install 后 `npm test` / `npm run test:vitest`），
// vitest 自带 TS 解析，无需此钩子。
export async function resolve(specifier, context, nextResolve) {
  const hasExt = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|node)$/.test(specifier);
  if (!hasExt && specifier.startsWith('.')) {
    try {
      return await nextResolve(specifier + '.ts', context);
    } catch (_) {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
