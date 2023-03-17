export type Init = {
    type: string,
    parent: string,
    class?: string,
    id?: string
}

export type Css = Partial<CSSStyleDeclaration>

export type Prop = {
    html?: string,
    text?: string,
    value?: string,
    css?: Css
} | undefined

export type Events = {
    [index in keyOf<HTMLElementEventMap>]?: EventListenerOrEventListenerObject
} | undefined

export type Attributes = {
    [index:string]: string
} | undefined

export type States = {
    [index:string]: any
}

export type ASubscriber<T> = {
    subscriber: T,
    states: string[]
}

export type Subscribers<T> = ASubscriber<T>[]

export type AnEffect = {
    func: CallableFunction,
    deps: string[],
    ranOnce: boolean,
    onFirst: boolean,
    currentStates: any[];
}

export type Effects = AnEffect[]

type keyOf<T> = keyof T;