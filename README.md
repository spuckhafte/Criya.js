# Criya.js
An object oriented, type-safe, frontend javascript library

**Features:**
  1. Object oriented, every Criya object converts to DOM element
  2. Solid TS support, autocompletion and in-editor docs included
  3. State Management
  4. Effect Management
  5. An easy and intuitive way of sharing states
  6. Conditional Mounting
  
# DOCS
You can read [this](https://spuckjs.netlify.app/gettingstarted/) to get an idea of getting started, these are spuckjs (an old project of mine) docs but this specific link pretty much works for Criya too.<br>
For typescript projects, you'll be using a build tool and [Vite](https://www.npmjs.com/package/vite) is recomended.

### Initializing:
```
npm create vite@latest
npm i
npm i criya
```
`main.ts`
```ts
import Criya from 'criya';

const ely = new Criya({
  type: 'h1',
  parent: '#app',
  class: "heading",
  id: "head"
});
ely.prop = { 
  text: "Hello World",
  css: {
    color: "blue"
  }
};
ely.attr = { title: "Heading" };
ely.make();
```

# DOM Methods
Criya provides you with some basic but useful methods to manipulate and listen to the dom.<br>
`render()`: converts/update a virtual element (Criya object) into a physical DOM element.<br>
`mount()` : puts the element to the dom.<br>
`unMount()`: removes the element from the dom.<br>
`isMount()`: checks if the element is in the dom.<br>
*---above methods can be looked up in the prev doc link provided (these are similar to SpuckJs')---*<br>
`onMount(func)`: calls the `func` function when an element is mounted.<br>
`onUnmount(func)`: *...element is unmounted*.<br>

# States
States are internal variables of elements that when change automatically update their references in these specific properties:<br> 
`html, text, css, value, class, id`.

```ts
const [count, setCount] = ely.state('count', 0);
ely.prop = { text: "count is $count$" }
```
`$statename$` - This textual way of referencing states is used in the mentioned 6 properties to get a truly reactive nature.<br>
`count` is a function that returns the state value and can be used in code pieces that will re-run to get the latest state value (*viz.* effects, events, conditional mount). Basically its a normal getter function which fetches the current state value everytime its called, nothing magical.<br>
`setCount` updates the state value.

```ts
const button = new Criya({ type: 'button', parent: '#app' });
button.prop = { text: 'Update Count' };
button.events = {
  click: () => setCount(count() + 1)
}
button.make();
```
`count()` inside the event (click) will always have the latest value of the state (in order to update it: `+1`).

Or you can use this functional approach to update states:
```ts
// prev -> latest value
setCount(prev => prev + 1)
``` 

## - State Operations
You can perform various operations like arithmetic and reasoning on your states and [pseudo-states](https://github.com/spuckhafte/Criya#--sharing-states)<br>
Syntax: 
```ts
"Sum of $num1$ and %num2% = {{ $num1$ + %num2% }}"
```
All the expressions are defined inside `{{ ... }}`.<br>
Basically you can write any valid js inside these brackets.<br>
```ts
text: "{{ console.log('hello') }}"
// In DOM: "{{ console.log('hello') }}", and will also log 'hello'.

// count = 5
text: "{{ console.log($count$) }}"
// In DOM: "{{ console.log($count$) }}", and will log 5.

text: "console.log($count$)"
// In DOM: "console.log(5)", no log, cause expressions are executed inside " {{ }} "
```
Some valid/useful examples:
```ts
// js methods
_.prop = {
  text: "Answer is: {{ ['first', 'third'].includes('$answer$') }}" // Answer is true
}
// ternary operations
_.prop = {
  text: "Count is: {{ $count$ > 5 : 'Big' :'Small' }}" // Count is Small
}
// arithmetic operations
_.prop = {
  text: "Answer = {{ $num1$ + ((%num2% - 3) * 5)/10 }}" // Answer = 96
}
```
These operations can be applied in properties where stringy states are valid.<br>

## - Sharing States
Multiple elements can subscribe to a main element for its specific or all states.
Suppose another element wants to show the count of `ely` in its text. For that, it will subscribe for `ely's` state to access them.<br>
To achieve this we use the static method of the class Criya, i.e,<br>
`subscribe`.
### Note: 
After subscribing, states are accessible as `pseudo-states` and are refernced like this: `%statename%`
```ts
import Criya from 'criya';
Criya.subscribe();

// or
import Criya, { subscribe } from 'criya';
subscribe();
```

```ts
//top-level
import Criya, { subscribe } from 'criya';

const para = new Criya({ type: 'p', parent: '#app' });
subscribe(para, ely, []);
para.prop = { text: "Ely's count is %count%" };
para.make();
```
### Note:
Whenever the subscribed states change, the subscribers also re-render with the main element.<br><br>
Definition of the `subscribe` method:
```ts
subscribe(subscriber, main, forStates);
/*
  *subscriber- the element which will access the states.
  *main- the element that'll share its states.
  *forStates- States of the `main` element to be shared, leave the array empty to trigger all
*/
```

## - Subscription Events:
`_.onSubscribed(func)`: Called on the subscriber element when subscription is added (`para`)<br>
`_.onnewSubscriber(func)`: Called on the main element (the one sharing its states) (`ely`)

# Effects:
Effects are functions that get called when some states or pseudoStates (dependencies) change

*@param* `func` — this function will get called when the dependencies change

*@param* `dependencyArray` — add states that will affect the effect, examples:<br>
```
['$count$', '%color%'] 
(this will run the effect when either of the state/pseudoState changes)

// Special Deps: 
 - ['f'] 
   (this will run the effect on the first render only)
 - ['e'] 
   (this will run the effect on every render)
```

*@param* `onFirst` — default: `true`, by default every effect runs on its first render whether the deps change or not.
```ts
element.effect(func, dependencyArray, onFirst=true);
```

**para** example:
```ts
para.effect(() => {
  console.log('Effect Ran')
}, ['%count%']);
```

# Conditional Mount
This feature allows you to show the element in the DOM only when the condition provided is satisfied.

Continuing with the `para` example.<br>
Say we want to show the `para` element only when the pseudo-state `count` is odd.<br>
We'll use the `.putIf` method.<br>

```ts
// till now
const para = new Criya({ type: 'p', parent: '#app' });
subscribe(para, ely, []);
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
.putIf(condition:(() => boolean | string), stick:boolean)
```
## - Condition as a String
We can also provide the condition as a string that signifies a boolean expression.
```ts
para.putIf(() => count() % 2 != 0);
```
Doing this in a "stringy" way:
```ts
para.putIf('%count% % 2 != 0')
```
## - The "stick" parameter:
There is a second parameter to the `.putIf` method, **"stick : boolean"**, this can be used to refer to whether the element, after remounting, will be in its original position or not.<br>
By default: `false`.
