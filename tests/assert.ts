// 轻量断言工具：零第三方依赖，适配 Node 22 `--experimental-strip-types`。
// 直接 `node --experimental-strip-types tests/xxx.test.ts` 即可运行。

export let PASS = 0;
export let FAIL = 0;
export const failures: string[] = [];

/** 基础断言：cond 为真则通过，否则记为失败并打印。 */
export function assert(cond: boolean, msg: string): void {
  if (cond) {
    PASS++;
  } else {
    FAIL++;
    failures.push(msg);
    console.error('  ✗ FAIL: ' + msg);
  }
}

/** 相等断言：严格 === 比较。 */
export function eq(actual: unknown, expected: unknown, msg: string): void {
  assert(
    actual === expected,
    `${msg}（期望 ${fmt(expected)}，实际 ${fmt(actual)}）`,
  );
}

/** 数组相等断言（逐元素 ===）。 */
export function eqArr(actual: number[], expected: number[], msg: string): void {
  const same =
    actual.length === expected.length &&
    actual.every((v, i) => v === expected[i]);
  assert(same, `${msg}（期望 [${expected}]，实际 [${actual}]）`);
}

/** 近似相等（用于数值容差，可选）。 */
export function approx(
  actual: number,
  expected: number,
  msg: string,
  eps = 1e-9,
): void {
  assert(
    Math.abs(actual - expected) <= eps,
    `${msg}（期望 ${expected}，实际 ${actual}）`,
  );
}

function fmt(v: unknown): string {
  if (typeof v === 'object' && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/** 打印分组标题。 */
export function section(name: string): void {
  console.log('\n== ' + name + ' ==');
}

/** 汇总并退出：有失败则 process.exit(1)。 */
export function finish(name: string): never {
  console.log(`\n[${name}] 通过 ${PASS} / 失败 ${FAIL}`);
  if (FAIL > 0) {
    console.log('失败用例：\n - ' + failures.join('\n - '));
    process.exit(1);
  }
  process.exit(0);
}
