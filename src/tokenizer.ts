import { InputStreamer } from "./input"

// TODO Replace Token | null with Maybe<Token>?

const KEYWORDS = " if then else lambda λ true false "
const IDENTIFIERS = "?!-<>=0123456789"
const OPERATORS = "+-*/%=&|<>!"
const PUNCTUATIONS = ",;(){}[]"

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

export function TokenStream(input: InputStreamer): TokenStreamer {
    let current: Token | null = null

    return { next, peek, eof, throwError: input.throwError }

    function next(): Token | null {
        const token = current
        current = null
        return token || readNext()
    }

    function peek(): Token | null {
        return current || (current = readNext())
    }

    function eof(): boolean {
        return peek() == null
    }

    function readNext(): Token | null {
        readWhile(isWhitespace)
        if (input.eof()) {
            return null
        }

        const char = input.peek()
        if (char == "#") {
            skipComment()
            return readNext()
        }
        if (char == '"') {
            return readString()
        }
        if (isDigit(char)) {
            return readNumber()
        }
        if (isStartOfIdentifier(char)) {
            return readIdentifier()
        }
        if (isPunctuation(char)) {
            return {
                type: "punctuation",
                value: input.next(),
            }
        }
        if (isOperator(char)) {
            return {
                type: "operator",
                value: readWhile(isOperator),
            }
        }

        throw input.throwError(`Can't handle character: ${char}`)
    }

    function readWhile(predicate: (char: string) => boolean): string {
        let str = ""
        while (!input.eof() && predicate(input.peek())) {
            str += input.next()
        }
        return str
    }

    function readNumber(): Token {
        let hasDot = false
        const number = readWhile(
            (char: string): boolean => {
                if (char != ".") {
                    return isDigit(char)
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

    function readIdentifier(): Token {
        const identifier = readWhile(isIdentifier)
        return {
            type: isKeyword(identifier) ? "keyword" : "var",
            value: identifier,
        }
    }

    function readEscaped(end: string): string {
        let escaped = false
        let str = ""
        input.next()
        while (!input.eof()) {
            const char = input.next()
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

    function readString(): Token {
        return {
            type: "string",
            value: readEscaped('"'),
        }
    }

    function skipComment(): void {
        readWhile((char: string): boolean => char != "\n")
        input.next()
    }

    function isKeyword(word: string): boolean {
        return KEYWORDS.includes(` ${word} `)
    }

    function isDigit(char: string): boolean {
        return /[0-9]/i.test(char)
    }

    function isStartOfIdentifier(char: string): boolean {
        return /[a-zλ_]/i.test(char)
    }

    function isIdentifier(char: string): boolean {
        return isStartOfIdentifier(char) || IDENTIFIERS.includes(char)
    }

    function isOperator(char: string): boolean {
        return OPERATORS.includes(char)
    }

    function isPunctuation(char: string): boolean {
        return PUNCTUATIONS.includes(char)
    }

    function isWhitespace(char: string): boolean {
        return " \t\n".includes(char)
    }
}
