import { Attributes, Effects, Events, Func, Init, Prop, States, Subscribers } from "./tsimp.types";

const regex = {
    stateOperateExp: /{{[a-zA-Z0-9$%+\-*/()\[\]<>?:="'^.! ]+}}/g,
    stateExp: /\$[a-zA-Z0-9-]+\$/g,
    pStateExp: /%[a-zA-Z0-9-]+%/g,
    both: /\$[a-zA-Z0-9-]+\$ | %[a-zA-Z0-9-]+%/g
}

class TSimp {

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
    subscribers:Subscribers<TSimp>;
    
    private onmount:CallableFunction|undefined; private onunmount:CallableFunction|undefined;
    private onsubscribed: CallableFunction|undefined; private onnewsubscriber: CallableFunction|undefined;
    private effects:Effects; private renderCondition:(() => boolean);

    constructor(init:Init, prop?:Prop, events?:Events, attr?:Attributes) {
        this.init = init; // { type, parent, class("class1 class2"), id }
        this.prop = prop; // { text, html, css, value }
        this.events = events; // { event: e => e.target.value }
        this.attr = attr; // { attributes (eg. title, type) }
        this.states = {}; // { "nameOfState": valueOfState }
        this.pseudoStates = {}; // --dito--
        this.subscribers = []; // [ { subscriber: El, states: [] } ]
        this.effects = []; // [ { func(), deps[], ranOnce:false, onFirst:boolean, currentStates[] } ]
        this.renderCondition = () => true; // by default no condition
    }

    // dom methods:
    /**Converts the virtual element into a physical element */
    render() {
        this.domElement  = this.domElement ? this.domElement : document.createElement(this.init.type);

        if (this.init.class) {
            const classes = this.init.class.split(' ');
            for (let _class of classes) {
                if (this.domElement.classList.contains(_class)) continue;
                this.domElement.classList.add(this.formatString(_class));
            }
        }
        if (this.init.id) {
            this.domElement.id = this.formatString(this.init.id);
        }
        if (this.events) {
            Object.keys(this.events).forEach(event => {
                // @ts-ignore
                this.domElement.addEventListener(event, this.events[event]);
            });
        }
        if (this.attr != undefined) {
            Object.keys(this.attr).forEach(attr => {
                if (this.domElement && this.attr)
                    this.domElement.setAttribute(attr, this.formatString(this.attr[attr]));
            });
        }
        if (this.prop) {
            const text = this.prop.text;
            const html = this.prop.html;
            const value = this.prop.value;
            const css = this.prop.css;

            if (this.prop.css) {
                for (let property of Object.keys(this.prop.css)) {
                    //@ts-ignore
                    this.domElement.style[property] = this.formatString(css[property]);
                }
            }

            if (text) this.domElement.innerText = this.formatString(text);
            if (html) this.domElement.innerHTML = this.formatString(html);
            if (value) this.domElement.setAttribute('value', this.formatString(value));
        }

        if (this.effects) {
            const effects = this.effects;
            effects.forEach((eff, i) => {

                if (eff.deps[0] == 'f') {
                    if (!eff.ranOnce) {
                        eff.ranOnce = true;
                        delete effects[i];
                        eff.func();  
                    }
                    return;
                }
                if (eff.deps[0] == 'e') {
                    let ranOnce = eff.ranOnce;
                    eff.ranOnce = true;
                    if (!eff.onFirst && !ranOnce) {
                        eff.ranOnce = true;
                        return;
                    }
                    eff.func();
                    return;
                }

                const anyChange = eff.deps.filter((dep, i) => {
                    let currentStateValue:any = eff.currentStates[i];
                    if (typeof currentStateValue == 'object')
                        currentStateValue = JSON.stringify(currentStateValue);

                    eff.currentStates[i] = this.formatString(dep);
                    return this.formatString(dep) != currentStateValue;
                }).length != 0;
                if (anyChange) {
                    if (!eff.onFirst && !eff.ranOnce) {
                        eff.ranOnce = true;
                        return;
                    }
                    eff.func();
                } else {
                    if (eff.onFirst && !eff.ranOnce) {
                        eff.ranOnce = true;
                        eff.func();
                    }
                }
            });
        }
    }

    /**Append the element to the DOM */
    mount() {
        if (this.renderCondition() && this.isMount()) return this;

        if (this.renderCondition()) if (this.onmount) this.onmount();
        let parent = document.querySelector(this.init.parent);

        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist :(`);
        if (!this.domElement) throw Error('No DOMElement attached :(');

        if (typeof this.getState('__position__') !== 'number')
            this.state('__position__', parent.childNodes.length);
        
        if (!this.renderCondition()) {
            if (this.isMount()) {
                this.state('__position__', Array.from(parent.children).indexOf(this.domElement));
                this.unMount();
            }
            return this;
        }
        if (this.getState('__stick__')) {
            let position = +this.getState('__position__');
            if (position >= parent.childNodes.length) this._directMount(parent);
            else parent.insertBefore(this.domElement, parent.children.item(position));
        } else this._directMount(parent);
        
        return this;
    }

    /**Remove the element from the DOM */
    unMount() {
        if (this.onunmount) this.onunmount();
        let parent = document.querySelector(this.init.parent);
        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);

        if (this.domElement) parent.removeChild(this.domElement);
    }

    private _directMount(parent:Element) {
        if (this.domElement) parent.appendChild(this.domElement);
    }

    /**Check if this element is in the DOM */
    isMount() {
        let parent = document.querySelector(this.init.parent);
        if (!parent) throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);
        if (!this.domElement) throw Error('No DOMElement attached :(');

        return Array.from(parent.children).indexOf(this.domElement) > -1;
    }

    /**Combines render and mount methods and returns the element */
    make() {
        this.render();
        return this.mount();
    }

    // out-of-the-box-feature methods
    /**Make an element subscribe to the other so that it can access its states as pseudo-states.
     * @param subscriber - the element which will access the states by subscribing to other.
     * @param main - the element that'll share its states.
     * @param forStates - States of the `main` element to be shared, leave the array empty to trigger all.
    */
    static subscribe(subscriber:TSimp, main:TSimp, forStates:string[]) {
        forStates = forStates.length == 0
            ? Object.keys(main.states)
            : forStates.filter(state => main.states[state] != undefined);

        for (let state of forStates) {
            subscriber.pseudoStates[state] = main.states[state];
        }
        main.subscribers.push({ subscriber: subscriber, states: forStates });
        if (main.onnewsubscriber) main.onnewsubscriber();
        if (subscriber.onsubscribed) subscriber.onsubscribed();
    }

    /**States are internal variables that when change automatically update their special references in some specific properties, i.e., `html, text, css, value, class, id` 
     * @param stateName - name of the state
     * @param initialValue - initial value of the state
     * @returns Two functions in an array, one to get state (non reactive) another to set state
    */
    state<T>(stateName:string, initialValue:T):[(() => T), ((newVal: T|Func<T, T>) => void)] {
        this.states[stateName] = initialValue;

        const setState = (newVal:T|Func<T, T>) => {
            let stateValue:T;
            //@ts-ignore
            if (typeof newVal == 'function') stateValue = newVal(this.getState(stateName))
            else stateValue = newVal;

            this.state(stateName, stateValue);
            this.make();
            const validSubs = this.subscribers.filter(sub => sub.states.includes(stateName));
            validSubs.forEach(sub => {
                sub.subscriber.pseudoStates[stateName] = stateValue;
                sub.subscriber.render()
            });
        }
        const stateGetter:(() => T) = () => this.getState(stateName);
        return [stateGetter, setState];
    }

    /**
     * Effects are functions that get called when some states or pseudoStates (dependencies) change
     * @param func - this function will get called when the dependencies change
     * @param dependencyArray - add states that will affect the effect, examples:
     * - `['$count$', '%color%']`
     * - `['f']`
     * - `['e']`
     * @param onFirst - `default: true`, by default every effect runs on its first render whether the deps change or not.
     * */
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
        const currentStates = dependencyArray.map(dep => this.formatString(dep));
        this.effects.push({
            func, deps: dependencyArray,
            ranOnce: false, onFirst, currentStates
        });
    }

    /**Define a condition for when an element should be in the DOM 
     * @param condition - function or a text condition that'll return boolean signifying mount or not, eg:
     * - Function - `putIf(() => state() > 2)`
     * - Text - `putIf('$state$ > 2')`
     * - Conditions can include pseudo-states also
     * @param stick - if true, the element will be in its position after remounting. Bydefault: `false`
     * @returns a [getter and setter] (just like `.state` does) for the "sticky" state
    */
    putIf(condition:((() => boolean)|string), stick=false) {
        if (typeof condition == 'string') {
            this.renderCondition = () => eval(this.formatString(condition));
        } else this.renderCondition = condition;
        return this.state('__stick__', stick)
    }

    // inbuilt events
    /**Called when the element is added to the dom */
    onMount(func:((didMount?:boolean) => void)) {
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
    private getState(stateName:string) {
        return this.states[stateName];
    }
    private getPState(stateName:string) {
        return this.pseudoStates[stateName];
    }
    private formatString(text:string) {
        if (!checkForOperation(text)) return this.stateExtracter(text);

        const operations = text.match(regex.stateOperateExp);
        //@ts-ignore - operations is not null, cause we are already checking for it (look up)
        for (let rawOperation of operations) {
            let operation = rawOperation.replace(/{{|}}/g, '');
            operation = this.stateExtracter(operation);
            let afterOperation:any;
            try {
                afterOperation = eval(operation);
            } catch (e) {
                console.error(
                    `[err] Invalid State Operation:\n\n${rawOperation}\n\n${e}\n\nHint: `
                    + `The state(s) in use << ${operation.match(regex.both)?.map(s => s.trim())} >> might not exist`
                )
            }

            if (typeof afterOperation == 'undefined') return text;
            text = text.replace(rawOperation, afterOperation);
        }
        return this.stateExtracter(text);
    }
    private stateExtracter(text:string) {
        const stateNames = text.match(regex.stateExp);
        const pseudoStateNames = text.match(regex.pStateExp);

        if (stateNames) {
            for (let stateRaw of stateNames) {
                const state = stateRaw.replace(/\$/g, '');
                if (typeof this.states[state] == null) continue;
                let stateVal = this.getState(state);
                if (typeof stateVal == 'object')
                    stateVal = JSON.stringify(stateVal);
                text = text.replace(stateRaw, `${stateVal}`);
            }
        }

        if (pseudoStateNames) {
            for (let stateRaw of pseudoStateNames) {
                const state = stateRaw.replace(/\%/g, '');
                if (this.pseudoStates[state] == undefined) continue;
                let stateVal = this.getPState(state);
                if (typeof stateVal == 'object')
                    stateVal = JSON.stringify(stateVal);
                text = text.replace(stateRaw, `${stateVal}`);
            }
        }

        return text;
    }
}

const subscribe = TSimp.subscribe;

export { subscribe };
export default TSimp;

function checkForOperation(text:string) {
    return regex.stateOperateExp.test(text);
}