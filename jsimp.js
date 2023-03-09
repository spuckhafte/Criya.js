class Jsimp {
    constructor(init, prop, events, attr) {
        this.init = init; // { type, parent, class("class1 class2"), id }
        this.prop = prop; // { text, html, css, value }
        this.events = events; // { event: e => e.target.value }
        this.attr = attr; // { attributes (eg. title, type) }
        this.states = {}; // { "nameOfState": valueOfState }
        this.#subscribers = []; // [ { subscriber: El, states: [] } ]
        this.pseudoStates = {}; // --dito--
        this.#effects = []; // [ { func(), deps[], ranOnce:false, onFirst:boolean, currentStates[] } ]
    }

    domElement;
    states;
    pseudoStates;
    #onmount;
    #onunmount;
    #subscribers;
    #effects

    // dom methods:
    render() {
        this.domElement = this.domElement ? this.domElement : document.createElement(this.init.type);

        if (this.init.class) {
            const classes = this.init.class.split(' ');
            for (let _class of classes) {
                if (this.domElement.classList.contains(_class)) continue;
                this.domElement.classList.add(this.#stateExtracter(_class));
            }
        }
        if (this.init.id) {
            this.domElement.id = this.#stateExtracter(this.init.id);
        }
        if (this.events) {
            Object.keys(this.events).forEach(event => {
                this.domElement.addEventListener(event, this.events[event]);
            });
        }
        if (this.attr) {
            Object.keys(this.attr).forEach(attr => {
                if (!this.domElement.getAttribute(attr) || this.#checkIfIncludesState(this.attr[attr]))
                    this.domElement.setAttribute(attr, this.#stateExtracter(this.attr[attr]));
            });
        }
        if (this.prop) {
            const text = this.prop.text;
            const html = this.prop.html;
            const value = this.prop.value;

            if (text) this.domElement.innerText = this.#stateExtracter(text);
            if (html) this.domElement.innerHTML = this.#stateExtracter(html);
            if (value) this.domElement.value = this.#stateExtracter(value);
        }

        if (this.#effects) {
            const effects = this.#effects;
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
                    return this.#stateExtracter(dep) != eff.currentStates[i];
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
    mount() {
        if (this.#onmount) this.#onmount();
        let parent = document.querySelector(this.init.parent);
        parent.appendChild(this.domElement);
        return this;
    }
    unMount() {
        if (this.#onunmount) this.#onunmount();
        let parent = document.querySelector(this.init.parent);
        parent.removeChild(this.domElement);
    }
    isMount() {
        let parent = document.querySelector(this.init.parent);
        let el = parent.querySelector(`#${this.init.id}`);
        return !!el;
    }
    make() {
        this.render();
        return this.mount();
    }
    onMount(func) {
        this.#onmount = func;
    }
    onUnmount(func) {
        this.#onunmount = func;
    }

    // out-of-the-box-feature methods
    subscribedBy(subscriber, states) {
        states = states.length == 0
            ? Object.keys(this.#getStateObject)
            : states.filter(state => this.#getStateObject[state] != undefined);

        for (let state of states) {
            subscriber.pseudoStates[state] = this.#getStateObject[state];
        }
        this.#subscribers.push({ subscriber, states });
    }
    state(stateName, initialValue) {
        const isObject = typeof initialValue == 'object';
        if (isObject) initialValue = JSON.stringify(initialValue);

        this.states[stateName] = initialValue;
        const setState = newVal => {
            this.state(stateName, newVal);
            this.render();

            const validSubs = this.#subscribers.filter(sub => sub.states.includes(stateName));
            validSubs.forEach(sub => {
                sub.subscriber.pseudoStates[stateName] = newVal;
                sub.subscriber.render()
            });
        }
        return [() => {
            return isObject ? JSON.parse(this.#getState(stateName))
                : this.#getState(stateName);
        }, setState];
    }
    effect(func, dependencyArray, onFirst = true) {
        if (dependencyArray[0] == 'f' || dependencyArray[0] == 'e') {
            this.#effects.push({
                func, deps: dependencyArray, ranOnce: false, onFirst
            });
            return;
        }
        dependencyArray = dependencyArray.filter(dep => {
            dep = dep.replace(/\$|\%/g, '');
            return this.#getState(dep) != undefined || this.#getPState(dep) != undefined
        });
        const currentStates = dependencyArray.map(dep => this.#stateExtracter(dep));
        this.#effects.push({
            func, deps: dependencyArray,
            ranOnce: false, onFirst, currentStates
        });
    }

    // util methods
    get #getStateObject() {
        return this.states
    }
    get #getPStateObject() {
        return this.pseudoStates;
    }
    #getState(stateName) {
        return this.#getStateObject[stateName];
    }
    #getPState(stateName) {
        return this.#getPStateObject[stateName];
    }
    #stateExtracter(text) {
        const regxState = /\$[a-zA-Z0-9-]+\$/g;
        const stateNames = text.match(regxState);
        if (stateNames) {
            for (let stateRaw of stateNames) {
                const state = stateRaw.replace(/\$/g, '');
                if (typeof this.states[state] == null) continue;
                text = text.replace(stateRaw, this.#getState(state));
            }
        }

        const regxPseudoState = /\%[a-zA-Z0-9-]+\%/g;
        const pseudoStateNames = text.match(regxPseudoState);
        if (pseudoStateNames) {
            for (let stateRaw of pseudoStateNames) {
                const state = stateRaw.replace(/\%/g, '');
                if (this.pseudoStates[state] == undefined) continue;
                text = text.replace(stateRaw, this.#getPState(state));
            }
        }

        return text;
    }
    #checkIfIncludesState(text) {
        const regx = /\$[a-zA-Z0-9-]+\$/g;
        const regxP = /\%[a-zA-Z0-9-]+\%/g;
        return regx.test(text) || regxP.test(text);
    }
}