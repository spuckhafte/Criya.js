# TSimp
*pronounced as **T Simp**, read as **TS imp***<br>

Just like [SpuckJs](https://github.com/spuckhafte/spuckjs), but better and typed!

**Description:**
  1. Object oriented, every TSimp object converts to DOM element
  2. Autocompletion and JS-Doc documentation included, thnx to Typescript
  3. State Management
  4. Effect Management
  5. An easy and intuitive way of sharing states
  
## Features
You can read [this](https://spuckjs.netlify.app/gettingstarted/) to get an idea of getting started, these are spuckjs docs but both the libraries are very similar.<br>
You'll be using a build tool and [Vite](https://www.npmjs.com/package/vite) is recomended.

### Initializing:
```
npm create vite@latest
npm i
npm i tsimp
```
`main.ts`
```ts
import TSimp from 'tsimp';

const element = new TSimp({ type: 'h1', parent: '#app', class: "heading", id: "head" });
element.prop = { 
  text: "Hello World",
  css: {
    color: "blue"
  }
};
element.attr = { title: "Heading" };
element.make();
```

## DOM Methods
Library gives some methods to manipulate and listen to the dom.<br>
`render()`: converts/update a virtual element (JSimp object) into a physical DOM element.<br>
`mount()` : puts the element to the dom.<br>
`unMount()`: removes the element from the dom.<br>
`isMount()`: checks if the element is in the dom.<br>
`onMount(func)`: calls the `func` function when an element is mounted.<br>
`onUnmount(func)`: *...element is unmounted*.<br>

## States
States are internal variables of elements that when change automatically update their references in these specific properties:<br> 
`html, text, css, value, class, id`.

```ts
const [count, setCount] = element.state('count', 0);
element.prop = { text: "count is $count$" }
```
`$statename$` - This textual way of referencing states is used in the mentioned 6 properties to get a truly reactive nature.<br>
`count` is a function that returns the state value and can be used inside effects and events to get the latest value of thr state.
`setCount` updates the state value.

```ts
const button = new TSimp({ type: 'button', parent: '#app' });
button.prop = { text: 'Update Count' };
button.events = {
  click: () => setCount(count() + 1)
}
button.make();
```
`count()` in the event will always have the latest value of the state as that line of code will call the getter function again.
<hr>

### **NOTE**
You can perform some elementary operations on states using `$` refernce inside text.
Such as:
```ts
_.state('state', 0);

// airthmetic
_.prop = {
  text: "$state + (5 - 2) * 10/2$" // 0+3*5 = 15 
}

// logics
_.prop = {
  text: "$state > 2 ? 'Good' : 'Bad'" // bad
}
```
**You can't do a single operation on 2 states, like:**<br>
```ts
"$state1$ + $state2$"
```
**Important**:<br>
1. Everything has to be done inside `$...$`.
2. Actual state should touch the first dollar sign.
3. This feature also works for pseudo-states (discussed below) that use `%` instead of `$`.
```ts
"$state + 2 $" // correct
"$state > 2" // correct
"2 + $state" // wrong
"$ state + 2" // wrong
```
<hr>

## Sharing States
Suppose another element wants to show the count of `element` in its text. For that, it will subscribe for element's state to access them.<br>
For this we use the static method of the class TSimp, i.e,<br>
`subscribe`.
```ts
import TSimp from 'tsimp';
Tsimp.subscribe();

// or
import TSimp, { subscribe } from 'tsimp';
subscribe();
```

```ts
//top-level
import TSimp, { subscribe } from 'tsimp';

const para = new TSimp({ type: 'p', parent: '#app' });
subscribe(para, element, []);
para.prop = { text: "Element's count is %count%" };
para.make();
```
Structure of subscribe method:
```ts
subscribe(subscriber, main, forStates);
/*
  *subscriber- the element which will access the states.

  *main- the element that'll share its states.

  *forStates- States of the `main` element to be shared, leave the array empty to trigger all
*/
```

### Subscription Events:
`_.onSubscribed(func)`: Called on the subscriber element when subscription is added.<br>
`_.onnewSubscriber(func)`: Called on the element to which the subscriber is subscribing when subscription is added.

## Effects:
Effects are functions that get called when some states or pseudoStates (dependencies) change

*@param* `func` — this function will get called when the dependencies change

*@param* `dependencyArray` — add states that will affect the effect, examples:<br>
```
['$count$', '%color%'] (this will run the effect when either of state/pseudoState changes)
['f'] (this will run the effect on the first render only)
['e'] (this will run the effect on every render)
```

*@param* `onFirst` — default: true, by default every effect runs on its first render whether the deps change or not.
```ts
element.effect(func, dependencyArray, onFirst=true);
```

**para** example:
```ts
para.effect(() => {
  console.log('Effect Ran')
}, ['%count%']);
```

## Conditional Mount
This feature allows you to show the element in the DOM only when the condition provided is satisfied.

Continuing with the `para` example.<br>
Say we want to show the `para` element only when the pseudo-state `count` is odd.<br>
We'll use the `.putIf` method.<br>

```ts
// till now
const para = new TSimp({ type: 'p', parent: '#app' });
para.subscribe(element, []);
para.prop = { text: "Element's count is %count%" };

para.effect(() => {
  console.log('Effect Ran')
}, ['%count%']);

// conditional mount
para.putIf(() => count() % 2 != 0);
para.make();
```
Structure of `putIf`:
```ts
.putIf(condition:function:boolean, stick:boolean)
```
### Condition as a String
We can also provide the condition as a string that signifies a boolean expression.
```ts
para.putIf(() => count() % 2 != 0);
```
Doing this in a "stringy" way:
```ts
para.putIf('%count% % 2 != 0')
```
### The "stick" parameter:
There is a second parameter to the `.putIf` method, **"stick : boolean"**, that can be passed to refer if the element after re-mounting will be in its old position or not.<br>
By default: `false`.