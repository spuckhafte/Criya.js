import { Attributes, Effects, Events, Init, Prop, States, Subscribers } from "./jsimp.types";

class JSimp {

    /**Initialize the element by defining its type, parent(query-selector), classes and id*/
    init:Init; 
    /**Define the text, html or value(attribute) of the element */
    prop:Prop; 
    /**Add some events that the element will listen to like click, input etc */
    events:Events; 
    /**Define the attributes of the element */
    attr:Attributes;
    /**The actual physical element present in the dom */
    domElement:HTMLElement | undefined; 
    /**The state object, contains all the states and their current values */
    states:States; pseudoStates:States; 
    /**List of all the subscribers and the states they are subscribed to */
    subscribers:Subscribers<JSimp>;
    
    private onmount:CallableFunction|undefined; private onunmount:CallableFunction|undefined;
    private onsubscribed: CallableFunction|undefined; private onnewsubscriber: CallableFunction|undefined;
    private effects:Effects;

    constructor(init:Init, prop?:Prop, events?:Events, attr?:Attributes) {
        this.init = init; // { type, parent, class("class1 class2"), id }
        this.prop = prop; // { text, html, css, value }
        this.events = events; // { event: e => e.target.value }
        this.attr = attr; // { attributes (eg. title, type) }
        this.states = {}; // { "nameOfState": valueOfState }
        this.pseudoStates = {}; // --dito--
        this.subscribers = []; // [ { subscriber: El, states: [] } ]
        this.effects = []; // [ { func(), deps[], ranOnce:false, onFirst:boolean, currentStates[] } ]
    }

    // dom methods:
    /**Converts the virtual element into a physical element */
    render() {
        this.domElement  = this.domElement ? this.domElement : document.createElement(this.init.type);

        if (this.init.class) {
            const classes = this.init.class.split(' ');
            for (let _class of classes) {
                if (this.domElement.classList.contains(_class)) continue;
                this.domElement.classList.add(this.stateExtracter(_class));
            }
        }
        if (this.init.id) {
            this.domElement.id = this.stateExtracter(this.init.id);
        }
        if (this.events) {
            Object.keys(this.events).forEach(event => {
                // @ts-ignore
                this.domElement.addEventListener(event, this.events[event]);
            });
        }
        if (this.attr !== undefined) {
            Object.keys(this.attr).forEach(attr => {
                // @ts-ignore
                if (!this.domElement.getAttribute(attr) || this.checkIfIncludesState(this.attr[attr]))
                // @ts-ignore
                    this.domElement.setAttribute(attr, this.stateExtracter(this.attr[attr]));
            });
        }
        if (this.prop) {
            const text = this.prop.text;
            const html = this.prop.html;
            const value = this.prop.value;

            if (text) this.domElement.innerText = this.stateExtracter(text);
            if (html) this.domElement.innerHTML = this.stateExtracter(html);
            if (value) this.domElement.setAttribute('value', value);
        }

        if (this.effects) {
            const effects = this.effects;
            effects.forEach((eff, i) => {

                if (eff.deps[0] == 'f') {
                    if (!eff.ranOnce) {
                        eff.func();
                        delete effects[i];
                    }
                    return;
                }
                if (eff.deps[0] == 'e') {
                    let ranOnce = eff.ranOnce;
                    eff.ranOnce = true;
                    if (!eff.onFirst && !ranOnce) return;
                    eff.func();
                    return;
                }

                const anyChange = eff.deps.filter((dep, i) => {
                    return this.stateExtracter(dep) != eff.currentStates[i];
                }).length != 0;
                if (anyChange) {
                    if (!eff.onFirst && !eff.ranOnce) return;
                    eff.func();
                } else {
                    if (eff.onFirst && !eff.ranOnce) eff.func();
                }

                eff.ranOnce = true;
            });
        }
    }
    /**Append the element to the DOM */
    mount() {
        if (this.onmount) this.onmount();
        let parent = document.querySelector(this.init.parent);
        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);

        if (this.domElement) parent.appendChild(this.domElement);
        return this;
    }
    /**Remove the element from the DOM */
    unMount() {
        if (this.onunmount) this.onunmount();
        let parent = document.querySelector(this.init.parent);
        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);

        if (this.domElement) parent.removeChild(this.domElement);
    }
    /**Check if this element is in the DOM */
    isMount() {
        let parent = document.querySelector(this.init.parent);
        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);

        let el = parent.querySelector(`${this.init.id}`);
        return !!el;
    }
    /**Combines render and mount methods and returns the element */
    make() {
        this.render();
        return this.mount();
    }

    // out-of-the-box-feature methods

    /**Get access to the states of other elements by subscribing for them 
     * @param subscribeTo - the element who's state will be accessed
     * @param forStates - array of states this element will listen to, leave it empty to trigger all
     * @param render - re-render the element when subscription is added, by default: `false`
    */
    subscribe(subscribeTo:JSimp, forStates:string[], render = false) {
        forStates = forStates.length == 0
            ? Object.keys(subscribeTo.states)
            : forStates.filter(state => subscribeTo.states[state] != undefined);

        for (let state of forStates) {
            this.pseudoStates[state] = subscribeTo.states[state];
        }
        subscribeTo.subscribers.push({ subscriber: this, states: forStates });
        if (subscribeTo.onnewsubscriber) subscribeTo.onnewsubscriber();
        if (this.onsubscribed) this.onsubscribed();
        if (render) subscribeTo.render();
    }

    /**States are internal variables that when change automatically update their special references in some specific properties, i.e., `html, text, css, value, class, id` 
     * @param stateName - name of the state
     * @param initialValue - initial value of the state
     * @returns Two functions in an array, one to get state (non reactive) another to set state*/
    state<T>(stateName:string, initialValue:T):[(() => T), ((newVal: T) => void)] {
        const isObject = typeof initialValue == 'object';
        //@ts-ignore
        if (isObject) initialValue = JSON.stringify(initialValue);

        //@ts-ignore
        this.states[stateName] = initialValue;
        const setState = (newVal:any) => {
            if (typeof newVal == 'object') newVal = JSON.stringify(newVal);
            this.state(stateName, newVal);
            this.render();
            const validSubs = this.subscribers.filter(sub => sub.states.includes(stateName));
            validSubs.forEach(sub => {
                sub.subscriber.pseudoStates[stateName] = newVal;
                sub.subscriber.render()
            });
        }
        const stateGetter = () => {
            // @ts-ignore
            return isObject ? JSON.parse(this.getState(stateName))
                : this.getState(stateName);
        }
        return [stateGetter, setState];
    }

    /**
     * Effects are functions that get called when some states or pseudoStates (dependencies) change
     * @param func - this function will get called when the dependencies change
     * @param dependencyArray - add states that will affect the effect, examples:
     * - `['$count$', '%color%']`
     * - `['f']`
     * - `['e']`
     * @param onFirst - `default: true`, by default every effect runs on its first render whether the deps change or not.*/
    effect(func:CallableFunction, dependencyArray:string[], onFirst = true) {
        if (dependencyArray[0] == 'f' || dependencyArray[0] == 'e') {
            this.effects.push({
                func, deps: dependencyArray, ranOnce: false, onFirst, currentStates: []
            });
            return;
        }
        dependencyArray = dependencyArray.filter(dep => {
            dep = dep.replace(/\$|\%/g, '');
            return this.getState(dep) != undefined || this.getPState(dep) != undefined
        });
        const currentStates = dependencyArray.map(dep => this.stateExtracter(dep));
        this.effects.push({
            func, deps: dependencyArray,
            ranOnce: false, onFirst, currentStates
        });
    }

    // inbuilt events
    /**Called when the element is added to the dom */
    onMount(func:CallableFunction) {
        this.onmount = func;
    }
    /**Called when the element is removed from the dom */
    onUnmount(func:CallableFunction) {
        this.onunmount = func;
    }
    /**Called on the element to which the subscriber is subscribing when subscription is added */
    onNewSubscriber(func:CallableFunction) {
        this.onnewsubscriber = func;
    }
    /**Called on the subscriber element when subscription is added */
    onSubscribed(func:CallableFunction) {
        this.onsubscribed = func;
    }

    // util methods
    private get getStateObject() {
        return this.states
    }
    private get getPStateObject() {
        return this.pseudoStates;
    }
    private getState(stateName:string) {
        return this.getStateObject[stateName];
    }
    private getPState(stateName:string) {
        return this.getPStateObject[stateName];
    }
    private stateExtracter(text:string) {
        const regxState = /\$[a-zA-Z0-9-]+\$/g;
        const stateNames = text.match(regxState);
        if (stateNames) {
            for (let stateRaw of stateNames) {
                const state = stateRaw.replace(/\$/g, '');
                if (typeof this.states[state] == null) continue;
                text = text.replace(stateRaw, `${this.getState(state)}`);
            }
        }

        const regxPseudoState = /\%[a-zA-Z0-9-]+\%/g;
        const pseudoStateNames = text.match(regxPseudoState);
        if (pseudoStateNames) {
            for (let stateRaw of pseudoStateNames) {
                const state = stateRaw.replace(/\%/g, '');
                if (this.pseudoStates[state] == undefined) continue;
                text = text.replace(stateRaw, `${this.getPState(state)}`);
            }
        }

        return text;
    }
    private checkIfIncludesState(text:string) {
        const regx = /\$[a-zA-Z0-9-]+\$/g;
        const regxP = /\%[a-zA-Z0-9-]+\%/g;
        return regx.test(text) || regxP.test(text);
    }
}

export default JSimp;
