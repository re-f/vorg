declare module 's-expression' {
    type SExpr = string | SExpr[];
    function parse(input: string): SExpr;
    export = parse;
}
