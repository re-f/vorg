/**
 * Default ESM Loader (for Node.js CJS environment / Unit Tests)
 * 
 * Uses 'eval' to bypass TypeScript transpilation to 'require()', 
 * allowing correct loading of ESM-only packages in CJS tests.
 */
export async function loadUnified() {
    // @ts-ignore
    const { unified } = await (eval('import("unified")') as Promise<any>);
    // @ts-ignore
    const uniorgParse = (await (eval('import("uniorg-parse")') as Promise<any>)).default;

    return { unified, uniorgParse };
}
