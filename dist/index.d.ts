import { Attributes, Events, Func, Init, Prop, States, Subscribers } from "../types";
declare class Criya {
    /**Initialize the element by defining its type, parent(query-selector), classes and id*/
    init: Init;
    /**Define the text, html or value(attribute) of the element */
    prop: Prop;
    /**Add some events that the element will listen to like click, input etc */
    events: Events;
    /**Define the attributes of the element */
    attr: Attributes;
    /**The actual physical element present in the dom */
    domElement: HTMLElement | undefined;
    /**The state object, contains all the states and their current values */
    states: States;
    pseudoStates: States;
    /**List of all the subscribers and the states they are subscribed to */
    subscribers: Subscribers<Criya>;
    private onmount;
    private onunmount;
    private onsubscribed;
    private onnewsubscriber;
    private effects;
    private renderCondition;
    private customRenderDefined;
    constructor(init: Init, prop?: Prop, events?: Events, attr?: Attributes);
    /**Converts the virtual element into a physical element */
    render(): void;
    /**Append the element to the DOM */
    mount(): this;
    /**Remove the element from the DOM */
    unMount(): void;
    private _directMount;
    /**Check if this element is in the DOM */
    isMount(): boolean;
    /**Combines render and mount methods and returns the element */
    make(): this;
    /**Make an element subscribe to the other so that it can access its states as pseudo-states.
     * @param subscriber - the element which will access the states by subscribing to other.
     * @param main - the element that'll share its states.
     * @param forStates - States of the `main` element to be shared, leave the array empty to trigger all.
    */
    static subscribe(subscriber: Criya, main: Criya, forStates: string[]): void;
    /**States are internal variables that when change automatically update their special references in some specific properties, i.e., `html, text, css, value, class, id`
     * @param stateName - name of the state
     * @param initialValue - initial value of the state
     * @returns Two functions in an array, one to get state (non reactive) another to set state
    */
    state<T>(stateName: string, initialValue: T): [(() => T), ((newVal: T | Func<T, T>) => void)];
    /**
     * Effects are functions that get called when some states or pseudoStates (dependencies) change
     * @param func - this function will get called when the dependencies change
     * @param dependencyArray - add states that will affect the effect, examples:
     * - `['$count$', '%color%']`
     * - `['f']`
     * - `['e']`
     * @param onFirst - `default: true`, by default every effect runs on its first render whether the deps change or not.
     * */
    effect(func: CallableFunction, dependencyArray: string[], onFirst?: boolean): void;
    /**Define a condition for when an element should be in the DOM
     * @param condition - function or a text condition that'll return boolean signifying mount or not, eg:
     * - Function - `putIf(() => state() > 2)`
     * - Text - `putIf('$state$ > 2')`
     * - Conditions can include pseudo-states also
     * @param stick - if true, the element will be in its position after remounting. Bydefault: `false`
     * @returns a [getter and setter] (just like `.state` does) for the "sticky" state
    */
    putIf(condition: ((() => boolean) | string), stick?: boolean): [() => boolean, (newVal: boolean | Func<boolean, boolean>) => void];
    /**Called when the element is added to the dom */
    onMount(func: ((didMount?: boolean) => void)): void;
    /**Called when the element is removed from the dom */
    onUnmount(func: CallableFunction): void;
    /**Called on the element to which the subscriber is subscribing when subscription is added */
    onNewSubscriber(func: CallableFunction): void;
    /**Called on the subscriber element when subscription is added */
    onSubscribed(func: CallableFunction): void;
    private getState;
    private getPState;
    private formatString;
    private stateExtracter;
}
declare const subscribe: typeof Criya.subscribe;
export { subscribe };
export default Criya;
