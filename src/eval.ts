import { AST, ValueType } from "./parser"

export class Environment {
    private vars: { [k: string]: any }
    private parent: Environment | undefined
    constructor(parent?: Environment) {
        this.vars = Object.create(parent ? parent.vars : null)
        this.parent = parent
    }

    extend(): Environment {
        return new Environment(this)
    }

    lookup(name: string): Environment | undefined {
        let scope = <Environment | undefined>this
        while (scope) {
            if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
                return scope
            }
            scope = scope.parent
        }

        return
    }

    get(name: string): any {
        if (name in this.vars) {
            return this.vars[name]
        }

        throw new Error(`Undefined variable ${name}`)
    }

    set(name: string, value: any): any {
        const scope = this.lookup(name)
        if (!scope && this.parent) {
            throw new Error(`Undefined variable ${name}`)
        }

        return ((scope || this).vars[name] = value)
    }

    define(name: string, value: any): any {
        return (this.vars[name] = value)
    }
}

export function evaluate(expression: AST, env: Environment): any {
    switch (expression.type) {
        case "number":
        case "string":
        case "bool":
            return <ValueType>expression.value
        case "var":
            return env.get(<string>expression.value)
        case "assign":
            expression.left = <AST>expression.left
            if (expression.left.type != "var") {
                throw new Error(`Cannot assign to ${JSON.stringify(expression.left)}`)
            }

            return env.set(<string>expression.left.value, evaluate(<AST>expression.right, env))
        case "binary":
            return applyOperator(
                <string>expression.operator,
                evaluate(<AST>expression.left, env),
                evaluate(<AST>expression.right, env),
            )
        case "lambda":
            return makeLambda(env, expression)
        case "if":
            const condition = evaluate(<AST>expression.condition, env)
            if (condition) {
                return evaluate(<AST>expression.then, env)
            }

            return expression.else ? evaluate(expression.else, env) : false
        case "program":
            let value = false
            for (const expr of <AST[]>expression.program) {
                value = evaluate(expr, env)
            }

            return value
        case "call":
            const func: Function = evaluate(<AST>expression.func, env)
            return func.apply(null, (<AST[]>expression.args).map(arg => evaluate(arg, env)))
        default:
            throw new Error(`I don't know how to evaluate ${expression.type}`)
    }
}

function applyOperator(operator: string, left: ValueType, right: ValueType): ValueType {
    switch (operator) {
        case "+":
            return toNumber(left) + toNumber(right)
        case "-":
            return toNumber(left) - toNumber(right)
        case "*":
            return toNumber(left) * toNumber(right)
        case "/":
            return toNumber(left) * divZero(right)
        case "%":
            return toNumber(left) % divZero(right)
        case "&&":
            return left !== false && right
        case "||":
            return left !== false ? left : right
        case "<":
            return toNumber(left) < toNumber(right)
        case ">":
            return toNumber(left) > toNumber(right)
        case "<=":
            return toNumber(left) <= toNumber(right)
        case ">=":
            return toNumber(left) >= toNumber(right)
        case "==":
            return left === right
        case "!=":
            return left !== right
        default:
            throw new Error(`Can't apply operator ${operator} to ${left} and ${right}`)
    }
}

function toNumber(value: ValueType): number {
    if (typeof value !== "number") {
        throw new Error(`Expected number but got ${value}`)
    }

    return value
}

function divZero(value: ValueType): number {
    const num = toNumber(value)
    if (num == 0) {
        throw new Error(`Divide by zero`)
    }

    return num
}

function makeLambda(env: Environment, expression: AST) {
    function lambda() {
        const vars = <any>expression.vars
        const scope = env.extend()
        for (let i = 0; i < vars.length; ++i) {
            scope.define(vars[i], i < arguments.length ? arguments[i] : false)
        }

        return evaluate(<AST>expression.body, scope)
    }

    return lambda
}
