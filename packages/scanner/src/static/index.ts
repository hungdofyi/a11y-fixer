export { scanFiles } from './static-scanner.js';
export type { StaticScanConfig } from './static-scanner.js';
export { discoverVueFiles } from './file-discovery.js';
export { parseVueTemplate } from './vue-parser.js';
export { walkAST, collectElements } from './ast-walker.js';
export type { StaticRule, FileLevelRule, StaticIssue, RuleContext } from './rules/index.js';
export { allStaticRules } from './rules/index.js';
