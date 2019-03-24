import { TokenStreamer, Token } from "./tokenizer"

const PRECEDENCE = new Map<string, number>([
    ["=", 1],
    ["||", 2],
    ["&&", 3],
    ["<", 7],
    [">", 7],
    ["<=", 7],
    [">=", 7],
    ["==", 7],
    ["!=", 7],
    ["+", 10],
    ["-", 10],
    ["*", 20],
    ["/", 20],
    ["%", 20],
])

export type ASTType =
    | "number"
    | "string"
    | "bool"
    | "var"
    | "lambda"
    | "call"
    | "if"
    | "assign"
    | "binary"
    | "program"

export type ValueType = string | number | boolean

export interface AST {
    type: ASTType
    value?: ValueType
    vars?: AST[]
    body?: AST
    func?: AST
    args?: AST[]
    condition?: AST
    then?: AST
    else?: AST
    operator?: string
    left?: AST
    right?: AST
    program?: AST[]
}

export function parse(input: TokenStreamer): AST {
    const program: AST[] = []
    while (!input.eof()) {
        program.push(parseExpression())
        if (!input.eof()) {
            skipPunctuation(";")
        }
    }

    return { type: "program", program }

    function parseIf(): AST {
        skipKeyword("if")
        const condition = parseExpression()
        if (!isPunctuation("{")) {
            skipKeyword("then")
        }

        const then = parseExpression()
        const ast: AST = { type: "if", condition, then }

        if (isKeyword("else")) {
            input.next()
            ast.else = parseExpression()
        }

        return ast
    }

    function parseAtom(): AST {
        return maybeCall(
            (): AST => {
                if (isPunctuation("(")) {
                    input.next()
                    const expresion = parseExpression()
                    skipPunctuation(")")
                    return expresion
                }

                if (isPunctuation("{")) {
                    return parseProgram()
                }

                if (isKeyword("if")) {
                    return parseIf()
                }

                if (isKeyword("true") || isKeyword("false")) {
                    return parseBool()
                }

                if (isKeyword("lambda") || isKeyword("λ")) {
                    input.next()
                    return parseLambda()
                }

                const token = input.next()
                if (token == null) {
                    unexpected()
                    throw new Error("unreachable")
                }

                if (token.type == "var" || token.type == "number" || token.type == "string") {
                    return {
                        type: token.type,
                        value: token.value,
                    }
                }

                unexpected()
                throw new Error("unreachable")
            },
        )
    }

    function parseProgram(): AST {
        const program = delimited("{", "}", ",", parseExpression)
        if (program.length == 0) {
            return { type: "bool", value: false }
        }

        if (program.length == 1) {
            return program[0]
        }

        return { type: "program", program }
    }

    function parseBool(): AST {
        const token = <AST>input.next()
        return {
            type: "bool",
            value: token.value == "true",
        }
    }

    function parseLambda(): AST {
        return {
            type: "lambda",
            vars: delimited("(", ")", ",", parseVarname),
            body: parseExpression(),
        }
    }

    function parseVarname(): AST {
        const name = <AST>input.next()
        if (name.type != "var") {
            input.throwError(`Expecting variable name`)
        }

        return <any>name.value
    }

    function parseExpression(): AST {
        return maybeCall(() => {
            return maybeBinary(parseAtom(), 0)
        })
    }

    function parseCall(func: AST): AST {
        return {
            type: "call",
            func: func,
            args: delimited("(", ")", ",", parseExpression),
        }
    }

    function maybeCall(expression: () => AST): AST {
        const expr = expression()
        return isPunctuation("(") ? parseCall(expr) : expr
    }

    function maybeBinary(left: AST, myPrecedence: number): AST {
        const token = isOperator()
        if (!token) {
            return left
        }

        const hisPrecedence = PRECEDENCE.get(<string>token.value)
        if (!hisPrecedence || hisPrecedence <= myPrecedence) {
            return left
        }

        input.next()
        const right = maybeBinary(parseAtom(), hisPrecedence)
        const binary: AST = {
            type: token.value == "=" ? "assign" : "binary",
            operator: <string>token.value,
            left,
            right,
        }

        return maybeBinary(binary, myPrecedence)
    }

    function delimited(start: string, stop: string, separator: string, parser: () => AST): AST[] {
        const result: AST[] = []
        let first = true
        skipPunctuation(start)

        while (!input.eof()) {
            if (isPunctuation(stop)) {
                break
            }

            if (first) {
                first = false
            } else {
                skipPunctuation(separator)
            }

            if (isPunctuation(stop)) {
                break
            }

            result.push(parser())
        }

        skipPunctuation(stop)
        return result
    }

    function skipPunctuation(char: string): void {
        if (isPunctuation(char)) {
            input.next()
            return
        }

        input.throwError(`Expected punctuation: "${char}"`)
    }
    function skipKeyword(keyword: string): void {
        if (isKeyword(keyword)) {
            input.next()
            return
        }

        input.throwError(`Expected keyword: "${keyword}"`)
    }

    function isPunctuation(char: string): Token | false | null {
        const token = input.peek()
        return token && token.type == "punctuation" && (!char || token.value == char) && token
    }

    function isKeyword(keyword: string): Token | false | null {
        const token = input.peek()
        return token && token.type == "keyword" && (!keyword || token.value == keyword) && token
    }

    function isOperator(operator?: string): Token | false | null {
        const token = input.peek()
        return token && token.type == "operator" && (!operator || token.value == operator) && token
    }

    function unexpected(): void {
        input.throwError(`Unexpected token: ${JSON.stringify(input.peek())}`)
    }
}
