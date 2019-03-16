import { TokenStreamer, Token } from "./tokenizer"

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

export interface AST {
    type: ASTType
    value?: string | number | boolean
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

export interface Parser {
    parse(input: string): AST
}

export class DefaultParser implements Parser {
    private input: TokenStreamer
    private static precedence = new Map<string, number>([
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

    constructor(input: TokenStreamer) {
        this.input = input
    }

    parse(): AST {
        const program: AST[] = []
        while (!this.input.eof()) {
            program.push(this.parseExpression())
            if (!this.input.eof()) {
                this.skipPunctuation(";")
            }
        }

        return { type: "program", program }
    }

    private parseIf(): AST {
        this.skipKeyword("if")
        const condition = this.parseExpression()
        if (!this.isPunctuation("{")) {
            this.skipKeyword("then")
        }

        const then = this.parseExpression()
        const ast: AST = { type: "if", condition, then }

        if (this.isKeyword("else")) {
            this.input.next()
            ast.else = this.parseExpression()
        }

        return ast
    }

    private parseAtom(): AST {
        return this.maybeCall(
            (): AST => {
                if (this.isPunctuation("(")) {
                    this.input.next()
                    const expresion = this.parseExpression()
                    this.skipPunctuation(")")
                    return expresion
                }

                if (this.isPunctuation("{")) {
                    return this.parseProgram()
                }

                if (this.isKeyword("if")) {
                    return this.parseIf()
                }

                if (this.isKeyword("true") || this.isKeyword("false")) {
                    return this.parseBool()
                }

                if (this.isKeyword("lambda") || this.isKeyword("λ")) {
                    this.input.next()
                    return this.parseLambda()
                }

                const token = this.input.next()
                if (token == null) {
                    this.unexpected()
                    throw new Error("unreachable")
                }

                if (token.type == "var" || token.type == "number" || token.type == "string") {
                    return {
                        type: token.type,
                        value: token.value,
                    }
                }

                this.unexpected()
                throw new Error("unreachable")
            },
        )
    }

    private parseProgram(): AST {
        const program = this.delimited("{", "}", ",", this.parseExpression)
        if (program.length == 0) {
            return { type: "bool", value: false }
        }

        if (program.length == 1) {
            return program[0]
        }

        return { type: "program", program }
    }

    private parseBool(): AST {
        throw new Error("TODO")
    }

    private parseLambda(): AST {
        return {
            type: "lambda",
            vars: this.delimited("(", ")", ",", this.parseVarname),
            body: this.parseExpression(),
        }
    }

    private parseVarname(): AST {
        throw new Error("TODO")
    }

    private parseExpression(): AST {
        return this.maybeCall(() => {
            return this.maybeBinary(this.parseAtom(), 0)
        })
    }

    private parseCall(func: AST): AST {
        return {
            type: "call",
            func: func,
            args: this.delimited("(", ")", ",", this.parseExpression),
        }
    }

    private maybeCall(expression: () => AST): AST {
        const expr = expression()
        return this.isPunctuation("(") ? this.parseCall(expr) : expr
    }

    private maybeBinary(left: AST, myPrecedence: number): AST {
        const token = this.isOperator()
        if (!token) {
            return left
        }

        const hisPrecedence = DefaultParser.precedence.get(<string>token.value)
        if (!hisPrecedence || hisPrecedence <= myPrecedence) {
            return left
        }

        this.input.next()
        const right = this.maybeBinary(this.parseAtom(), hisPrecedence)
        const binary: AST = {
            type: token.value == "=" ? "assign" : "binary",
            operator: <string>token.value,
            left,
            right,
        }

        return this.maybeBinary(binary, myPrecedence)
    }

    private delimited(start: string, stop: string, separator: string, parser: () => AST): AST[] {
        const result: AST[] = []
        let first = true
        this.skipPunctuation(start)

        while (!this.input.eof()) {
            if (this.isPunctuation(stop)) {
                break
            }

            if (first) {
                first = false
            } else {
                this.skipPunctuation(separator)
            }

            if (this.isPunctuation(stop)) {
                break
            }

            result.push(parser())
        }

        this.skipPunctuation(stop)
        return result
    }

    private skipPunctuation(char: string): void {
        if (this.isPunctuation(char)) {
            this.input.next()
            return
        }

        this.input.throwError(`Expected punctuation: "${char}"`)
    }
    private skipKeyword(keyword: string): void {
        if (this.isKeyword(keyword)) {
            this.input.next()
            return
        }

        this.input.throwError(`Expected keyword: "${keyword}"`)
    }

    private isPunctuation(char: string): Token | false | null {
        const token = this.input.next()
        return token && token.type == "punctuation" && (!char || token.value == char) && token
    }

    private isKeyword(keyword: string): Token | false | null {
        const token = this.input.next()
        return token && token.type == "keyword" && (!keyword || token.value == keyword) && token
    }

    private isOperator(operator?: string): Token | false | null {
        const token = this.input.next()
        return token && token.type == "operator" && (!operator || token.value == operator) && token
    }

    private unexpected(): void {
        this.input.throwError(`Unexpected token: ${JSON.stringify(this.input.peek())}`)
    }
}
