# Affection
> Declarative side-effects

```sh
npm install affection
```

[![npm](https://img.shields.io/npm/v/affection.svg)](https://www.npmjs.com/package/affection)
[![Build Status](https://travis-ci.org/andrejewski/affection.svg?branch=master)](https://travis-ci.org/andrejewski/affection)
[![Greenkeeper badge](https://badges.greenkeeper.io/andrejewski/affection.svg)](https://greenkeeper.io/)

Affection is a library for describing side-effects as plain data and providing composition utilities.
This project aims to improve on similar libraries by not using generators.

Generators make testing difficult in that:

- They can have internal state.
- Each segment of the function cannot be tested in isolation.
- Each segment of the function can only be reached after the segments before it.
- Generators are awkward. Conversing with a generator using `next()` isn't as simple as function calling.
- Composition of generators is harder than functions inherently.

So Affection is all about functions, with the goals:

- Improve testability through the use of pure functions.
- Improve code reuse through la-a-carte composition of side-effects.

Let's see how we do.

## Examples

This first example does not use any composition.

```js
import { run, call, callMethod } from 'affection'

const getJSON = url => [
  call(fetch, url),
  resp => [callMethod(resp, 'json')]
]

async function main () {
  const payload = await run(getJSON('http://example.com'))
  console.log(payload)
}
```

This second example does the same as the first.
Here we are using the composition utilities.

```js
import { step, runStep, batchSteps, call, callMethod } from 'affection'

const fetchUrl = url => call(fetch, [url])
const readJSON = resp => callMethod(resp, 'json')
const getJSON = batchSteps([fetchUrl, readJSON].map(step))

async function main () {
  const payload = await runStep(getJSON, 'http://example.com')
  console.log(payload)
}
```

## Documentation
The package contains the following:

##### Effects
- [`call(func, args, context)`](#call)
- [`callMethod(obj, method, args)`](#callmethod)
- [`all(effects)`](#all)
- [`race(effects)`](#race)
- [`itself(value)`](#itself)

See [`defaultHandle`](#defaulthandle) for adding more.

##### Execution
- [`run(plan[, handle])`](#run)

##### Composition
- [`step(makeEffect)`](#step)
- [`mapStep(step, transform)`](#mapstep)
- [`batchStep(steps)`](#batchsteps)
- [`runStep(step, input[, handle])`](#runstep)

### `call`
> `call(func: function, args: Array<any>, context: any): Effect`

Describes a function call of `func.apply(context, args)`.

### `callMethod`
> `callMethod(obj: any, method: String, args: Array<any>): Effect`

Describes a method call of `obj[method].apply(obj, args)`

### `all`
> `all(effects: Array<Effect>): Effect`

Describes combining effects. Like `Promise.all`.

### `race`
> `race(effects: Array<Effect>): Effect`

Describes racing effects. Like `Promise.race`.

### `itself`
> `itself(value: any): Effect`

Describes a value. This is an identity function for Effects.

### `defaultHandle`
> `defaultHandle(effect: Effect, handle: function): any`

Performs the action described by a particular effect.
`defaultHandle` provides the handling for the effects included in Affection.
To add more, create a new handle that wraps `defaultHandle` and pass that to `run`.

For example, say we want to add a timeout effect:

```js
import { defaultHandle } from 'affection'

export function timeout (duration) {
  return { type: 'timeout', duration }
}

export function myHandle (effect, handle) {
  if (effect.type === 'timeout') {
    return new Promise(resolve => setTimeout(resolve, effect.duration))
  }
  return defaultHandle(effect, handle)
}

// Later...

async function main () {
  await run([timeout(1000)], myHandler)
  // Will have waited a second
}
```

### `run`
> `run(plan: [Effect, function?], handle: function = defaultHandle): any`

Executes a plan.
A plan is an array where the first element is an Effect to be handled using `handle` and the second element is a function to call with the result of the Effect.
If the function is not provided, execution terminates and the result is returned.

### `step`
> `step(makeEffect: any -> Effect): Step`

Creates a step.
A step is a means of encapsulating an effect without needing a plan (as described by `run`).

This is hard to understand without an understanding of how `run` works.
The `run` function is recursively executing plans until there is nothing more to do.
A step is a way of saying, "Execute this effect; I don't know what happens with the result."
This is for code reuse: effects should be decoupled from their consumers.

For more clarity, let's look at the `step` function:

```js
const step = makeEffect => next => input => [makeEffect(input), next]
```

We define our `makeEffect` without needing to know the consumer.
The `next` is what will consume the result.
Later, steps are composed when the consumers are known.
Finally, the step is given an `input` to build its effect.

In summary, steps decouple:
- Creating the effect: `makeEffect`
- Consuming the effect's result: `next`
- Building the final plan, given an `input`

### `mapStep`
> `mapStep(step: Step, transform: function): Step`

Creates a new step which will return the result of `transform` called with the input to the `step` `makeEffect` and the result of the Effect.

This is good for passing along context without mucking up simple steps.
For example, we are building a dictionary of the most used word for each country.
We want to retain the country we are querying about in the result.

```js
const getMostUsedWordInCountry = country => call(MyAPI, country)
const countryWordStep = step(getMostUsedWordInCountry)
const getCountryWord = mapStep(countryWordStep, (result, country) => ({ country, word: result }))

runStep(getCountryWord, 'Canada').then(result => {
  console.log(result)
  // => { country: 'Canada', word: 'Sorry' }
})
```

### `batchSteps`
> `batchSteps(steps: Array<Step>): Step`

Creates a new step which will call each step passing the result of first step to the next and so on.

### `runStep`
> `runStep(step: Step, input: any, handle: function = defaultHandle): any`

Executes a `step` with a given `input`.
Uses `run` so `handle` works in the same way.