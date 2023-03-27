const regex = {
    stateOperateExp: /{{[a-zA-Z0-9$%+\-*/()\[\]<>?:="'^.! ]+}}/g,
    stateExp: /\$[a-zA-Z0-9-]+\$/g,
    pStateExp: /%[a-zA-Z0-9-]+%/g,
    both: /\$[a-zA-Z0-9-]+\$ | %[a-zA-Z0-9-]+%/g
};
class Criya {
    constructor(init, prop, events, attr) {
        this.init = init;
        this.prop = prop;
        this.events = events;
        this.attr = attr;
        this.states = {};
        this.pseudoStates = {};
        this.subscribers = [];
        this.effects = [];
        this.renderCondition = () => true;
    }
    render() {
        this.domElement = this.domElement ? this.domElement : document.createElement(this.init.type);
        if (this.init.class) {
            const classes = this.init.class.split(' ');
            for (let _class of classes) {
                if (this.domElement.classList.contains(_class))
                    continue;
                this.domElement.classList.add(this.formatString(_class));
            }
        }
        if (this.init.id) {
            this.domElement.id = this.formatString(this.init.id);
        }
        if (this.events) {
            Object.keys(this.events).forEach(event => {
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
                    this.domElement.style[property] = this.formatString(css[property]);
                }
            }
            if (text)
                this.domElement.innerText = this.formatString(text);
            if (html)
                this.domElement.innerHTML = this.formatString(html);
            if (value)
                this.domElement.setAttribute('value', this.formatString(value));
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
                    let currentStateValue = eff.currentStates[i];
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
                }
                else {
                    if (eff.onFirst && !eff.ranOnce) {
                        eff.ranOnce = true;
                        eff.func();
                    }
                }
            });
        }
    }
    mount() {
        if (this.renderCondition() && this.isMount())
            return this;
        if (this.renderCondition())
            if (this.onmount)
                this.onmount();
        let parent = document.querySelector(this.init.parent);
        if (!parent)
            throw Error(`DOMElement of query: ${this.init.parent} doesn't exist :(`);
        if (!this.domElement)
            throw Error('No DOMElement attached :(');
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
            if (position >= parent.childNodes.length)
                this._directMount(parent);
            else
                parent.insertBefore(this.domElement, parent.children.item(position));
        }
        else
            this._directMount(parent);
        return this;
    }
    unMount() {
        if (this.onunmount)
            this.onunmount();
        let parent = document.querySelector(this.init.parent);
        if (!parent)
            throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);
        if (this.domElement)
            parent.removeChild(this.domElement);
    }
    _directMount(parent) {
        if (this.domElement)
            parent.appendChild(this.domElement);
    }
    isMount() {
        let parent = document.querySelector(this.init.parent);
        if (!parent)
            throw Error(`DOMElement of query: ${this.init.parent} doesn't exist`);
        if (!this.domElement)
            throw Error('No DOMElement attached :(');
        return Array.from(parent.children).indexOf(this.domElement) > -1;
    }
    make() {
        this.render();
        return this.mount();
    }
    static subscribe(subscriber, main, forStates) {
        forStates = forStates.length == 0
            ? Object.keys(main.states)
            : forStates.filter(state => main.states[state] != undefined);
        for (let state of forStates) {
            subscriber.pseudoStates[state] = main.states[state];
        }
        main.subscribers.push({ subscriber: subscriber, states: forStates });
        if (main.onnewsubscriber)
            main.onnewsubscriber();
        if (subscriber.onsubscribed)
            subscriber.onsubscribed();
    }
    state(stateName, initialValue) {
        this.states[stateName] = initialValue;
        const setState = (newVal) => {
            let stateValue;
            if (typeof newVal == 'function')
                stateValue = newVal(this.getState(stateName));
            else
                stateValue = newVal;
            this.state(stateName, stateValue);
            this.make();
            const validSubs = this.subscribers.filter(sub => sub.states.includes(stateName));
            validSubs.forEach(sub => {
                sub.subscriber.pseudoStates[stateName] = stateValue;
                sub.subscriber.render();
            });
        };
        const stateGetter = () => this.getState(stateName);
        return [stateGetter, setState];
    }
    effect(func, dependencyArray, onFirst = true) {
        if (dependencyArray[0] == 'f' || dependencyArray[0] == 'e') {
            this.effects.push({
                func, deps: dependencyArray, ranOnce: false, onFirst, currentStates: []
            });
            return;
        }
        dependencyArray = dependencyArray.filter(dep => {
            dep = dep.replace(/\$|\%/g, '');
            return this.getState(dep) != undefined || this.getPState(dep) != undefined;
        });
        const currentStates = dependencyArray.map(dep => this.formatString(dep));
        this.effects.push({
            func, deps: dependencyArray,
            ranOnce: false, onFirst, currentStates
        });
    }
    putIf(condition, stick = false) {
        if (typeof condition == 'string') {
            this.renderCondition = () => eval(this.formatString(condition));
        }
        else
            this.renderCondition = condition;
        return this.state('__stick__', stick);
    }
    onMount(func) {
        this.onmount = func;
    }
    onUnmount(func) {
        this.onunmount = func;
    }
    onNewSubscriber(func) {
        this.onnewsubscriber = func;
    }
    onSubscribed(func) {
        this.onsubscribed = func;
    }
    getState(stateName) {
        return this.states[stateName];
    }
    getPState(stateName) {
        return this.pseudoStates[stateName];
    }
    formatString(text) {
        var _a;
        if (!checkForOperation(text))
            return this.stateExtracter(text);
        const operations = text.match(regex.stateOperateExp);
        for (let rawOperation of operations) {
            let operation = rawOperation.replace(/{{|}}/g, '');
            operation = this.stateExtracter(operation);
            let afterOperation;
            try {
                afterOperation = eval(operation);
            }
            catch (e) {
                console.error(`[err] Invalid State Operation:\n\n${rawOperation}\n\n${e}\n\nHint: `
                    + `The state(s) in use << ${(_a = operation.match(regex.both)) === null || _a === void 0 ? void 0 : _a.map(s => s.trim())} >> might not exist`);
            }
            if (typeof afterOperation == 'undefined')
                return text;
            text = text.replace(rawOperation, afterOperation);
        }
        return this.stateExtracter(text);
    }
    stateExtracter(text) {
        const stateNames = text.match(regex.stateExp);
        const pseudoStateNames = text.match(regex.pStateExp);
        if (stateNames) {
            for (let stateRaw of stateNames) {
                const state = stateRaw.replace(/\$/g, '');
                if (typeof this.states[state] == null)
                    continue;
                let stateVal = this.getState(state);
                if (typeof stateVal == 'object')
                    stateVal = JSON.stringify(stateVal);
                text = text.replace(stateRaw, `${stateVal}`);
            }
        }
        if (pseudoStateNames) {
            for (let stateRaw of pseudoStateNames) {
                const state = stateRaw.replace(/\%/g, '');
                if (this.pseudoStates[state] == undefined)
                    continue;
                let stateVal = this.getPState(state);
                if (typeof stateVal == 'object')
                    stateVal = JSON.stringify(stateVal);
                text = text.replace(stateRaw, `${stateVal}`);
            }
        }
        return text;
    }
}
const subscribe = Criya.subscribe;
export { subscribe };
export default Criya;
function checkForOperation(text) {
    return regex.stateOperateExp.test(text);
}
