export type Init = {
    type: string,
    parent: string,
    class?: string,
    id?: string
}

export type Prop = {
    html?: string | undefined,
    text?: string | undefined,
    value?: string | undefined
} | undefined

export type Events = {
    [index in AllEvents]?: EventListenerOrEventListenerObject
} | undefined

export type Attributes = {
    [index:string]: string
} | undefined

export type States = {
    [index:string]: string|number|boolean
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

export type AllEvents = keyof HTMLElementEventMap;