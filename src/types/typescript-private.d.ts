import 'typescript';

declare module 'typescript' {
  // NOTE: Do not use isExpression() instead of isExpressionNode().
  // For example, isExpression() returns true for ImportKeyword,
  // but it is only an Expression if it's in a CallExpression (from comment in utilities.ts)
  export function isExpressionNode(node: Node): boolean;
}
