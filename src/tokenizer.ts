import { InputStreamer } from "./input"

// TODO Replace Token | null with Maybe<Token>?

export type TokenType = "number" | "keyword" | "var" | "string" | "punctuation" | "operator"
export interface Token {
    type: TokenType
    value: string | number
}

export interface TokenStreamer {
    next(): Token | null
    peek(): Token | null
    eof(): boolean
    throwError(msg: string): void
}

export class TokenStream implements TokenStreamer {
    private input: InputStreamer
    private current: Token | null
    private static keywords = " if then else lambda λ true false "
    private static identifiers = "?!-<>=0123456789"
    private static operators = "+-*/%=&|<>!"
    private static punctuations = ",;(){}[]"
    constructor(input: InputStreamer) {
        this.input = input
        this.throwError = input.throwError
        this.current = null
    }
    throwError: (msg: string) => void

    next(): Token | null {
        const token = this.current
        this.current = null
        return token || this.readNext()
    }

    peek(): Token | null {
        return this.current || (this.current = this.readNext())
    }

    eof(): boolean {
        return this.peek() == null
    }

    private readNext(): Token | null {
        this.readWhile(this.isWhitespace)
        if (this.input.eof()) {
            return null
        }

        const char = this.input.peek()
        if (char == "#") {
            this.skipComment()
            return this.readNext()
        }
        if (char == '"') {
            return this.readString()
        }
        if (this.isDigit(char)) {
            return this.readNumber()
        }
        if (this.isStartOfIdentifier(char)) {
            return this.readIdentifier()
        }
        if (this.isPunctuation(char)) {
            return {
                type: "punctuation",
                value: this.input.next(),
            }
        }
        if (this.isOperator(char)) {
            return {
                type: "operator",
                value: this.readWhile(this.isOperator),
            }
        }

        throw this.input.throwError(`Can't handle character: ${char}`)
    }

    private readWhile(predicate: (char: string) => boolean) {
        let str = ""
        while (!this.input.eof() && predicate(this.input.peek())) {
            str += this.input.next()
        }
        return str
    }

    private readNumber(): Token {
        let hasDot = false
        const number = this.readWhile(
            (char: string): boolean => {
                if (char != ".") {
                    return this.isDigit(char)
                }

                if (hasDot) {
                    return false
                }

                hasDot = true
                return true
            },
        )

        return { type: "number", value: parseFloat(number) }
    }

    private readIdentifier(): Token {
        const identifier = this.readWhile(this.isIdentifier)
        return {
            type: this.isKeyword(identifier) ? "keyword" : "var",
            value: identifier,
        }
    }

    private readEscaped(end: string): string {
        let escaped = false
        let str = ""
        this.input.next()
        while (!this.input.eof()) {
            const char = this.input.next()
            if (escaped) {
                str += char
                escaped = false
                continue
            }

            if (char == "\\") {
                escaped = true
                continue
            }

            if (char == end) {
                break
            }

            str += char
        }

        return str
    }

    private readString(): Token {
        return {
            type: "string",
            value: this.readEscaped('"'),
        }
    }

    private skipComment() {
        this.readWhile((char: string): boolean => char != "\n")
        this.input.next()
    }

    private isKeyword(word: string): boolean {
        return TokenStream.keywords.includes(` ${word} `)
    }

    private isDigit(char: string): boolean {
        return /[0-9]/i.test(char)
    }

    private isStartOfIdentifier(char: string): boolean {
        return /[a-zλ_]/i.test(char)
    }

    private isIdentifier(char: string): boolean {
        return this.isStartOfIdentifier(char) || TokenStream.identifiers.includes(char)
    }

    private isOperator(char: string) {
        return TokenStream.operators.includes(char)
    }

    private isPunctuation(char: string) {
        return TokenStream.punctuations.includes(char)
    }

    private isWhitespace(char: string) {
        return " \t\n".includes(char)
    }
}
