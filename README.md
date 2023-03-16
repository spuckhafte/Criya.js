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
You can't edit css in this library like you did in SpuckJs, it is recomended to use [Tailwind](https://www.npmjs.com/package/tailwindcss).<br>
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
element.prop = { text: "Hello World" };
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

## Sharing States
Suppose another element wants to show the count of `element` in its text. For that, it will subscribe for element's state to access them.

```ts
const para = new TSimp({ type: 'p', parent: '#app' });
para.subscribe(element, []);
para.prop = { text: "Element's count is %count%" };
para.make();
```
`para` subscribed to the `element` for **all** its states.<br>
`[]` => all states.<br>
`['count', 'color']` => subscribing to specific states.

After subscribing, the `count` state of the `element` became the **pseudoState** of `para`, and these states are referenced like this:<br>
`%stateName%`.
<hr>

### NOTE:
This can also be done by the `.gettingSubscribed()` method.<br>
The only difference is where the methods are being called.<br>
And this is done to provide readability.

Like:
```ts
para.subscribe(element, [])
```
This is called on the subscriber element and read as: <br>
`"para is subscribing to element for all ([]) states"`

The other way is to call a method on the main element:
```ts
element.gettingSubscribed(para, [])
```
This will be read as: <br>
`"Element is getting subscribed by para for all states"`
<hr>

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

@param `onFirst` — default: true, by default every effect runs on its first render whether the deps change or not.
```ts
element.effect(func, dependencyArray, onFirst=true);
```

**para** example:
```ts
para.effect(() => {
  console.log('Effect Ran')
}, ['%count%']);
```

## Conditional Mounting
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

// conditional mounting
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