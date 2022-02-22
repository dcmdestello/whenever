# Whenever

A mobX reaction, a repeatable `when` in `src/whenever.ts`.

This README has a description of my choice of features and API, then commentary on it.

## Usage

```js
whenever(predicate, effect, nestedWhenevers?, unsubscribe?);
```

`whenever` observes and runs the given predicate function. Each time the predicate becomes true the effect function is executed. If the predicate is true in its first evaluation, effect is executed right away.

##### Return value `disposer: () => void`

`whenever` returns a function that can be called to stop it from observing further. Disposing `whenever` will also dispose of all its active nested whenevers.

### Parameters

##### predicate: `() => boolean`

The boolean statement checking mobX observables.

##### effect: `() => any`

The function to be executed each time predicate becomes true. It can return nothing or some values that will be passed to the nestedWhenevers


##### nestedWhenevers: `Array<(arg: any) => whenever(...)>`

An array of functions, each creating a nested whenever effect. Each function receives an argument with the result of `effect` and must return a whenever statement (this is enforced by Typescript). Given the scope of `arg`, the inner whenever can use it in any of its parameters (like predicate and effect).

Nested whenevers will be evaluated only when its outer whenever statement has a true predicate (and thus effect has run and its result can be received). If the outer predicate becomes false, the inner statements will be disposed.

##### unsubscribe [optional]: `() => void`

Unsubscribe can be used to clean up the effects of whenever.

Unsubscribe will only run if its corresponding effect has executed previously and has not been cleaned up. Keeping that in mind, then it will be executed:
* The predicate *becomes* false.
* Whenever is disposed.

Note that this means that an outer disposal of whenever will trigger inner unsubscriptions, if there's effects to clean up.

## Commentary

This is implemented in Typescript and tested with Jest (`npm run test`).

Internally it manages a chain of `when`, its nested whenevers and their disposal functions.

> 1. What do you think of the concept of managing required resources through this type of abstraction? Feel free to let us know if you think it's a bad or un-useful idea (and why).

In general, I like these kind of abstractions that standardize a certain execution flow. It increases a little bit the burden of knowledge necessary to understand the code for a new programmer reading it. However if it makes sense semantically it might actually help by just hiding a lot of implementation details. It is useful to find/create these kind of abstractions when you find yourself solving different use cases in similar manners.

In regards to managing required resources I think it's useful to create these kind of abstractions that give an scope where some precondition is guaranteed (e.g. the predicates show that certain data is available). For example react-query helps you work with server-backed data without having to manually handle each and every complexity that might happen, like server-side changes to the data, client mutations from other parts of the code, etc.

This exercise reminded me somewhat of a couple of similar abstractions. One I mentioned when we talked, with `redux-saga` where you can setup a "channel" to guarantee that some actions are executed one after the other, atomically, without concurrency.

The other one much simpler, is a tiny utility function you can write that allows any saga (async process) to *wait for* a certain condition of the global store to be true. Allowing you to stop the execution of an async flow indefinitely until the requirements are met.

```js
function* waitFor(selector) {
  while (!(yield select(selector))) {
    yield take('*');
  }
}
```

> 2. How could we improve the developer 'api'?

Definitely would be interested in a api similar to mobX's `reaction` where you can compare previousValue and currentValue of data to create more general predicates, while keeping all the features of nesting, unsubscribing, etc. In fact an implementation of `whenever` could be a rather simple wrapper around that extension of reaction, instead of using `when`.

An optional, um, `options` parameter could be useful, with similar options to those of mobX's `when`, `react` and `autorun`. An option to limit the number of repeats before self disposing would be reasonable. With a value of 1, it would make whenever behave like when, which should be possible to since `when` is just a specific case of `whenever`.

For this case, I really like the simple use case of `whenever(predicate, effect)`. As well as the unsubscribe functionality, that allows to solve use cases similar to those handled by `useEffect` and its clean up function, *whenever* the relevant prop changes.

However I would need more time to play with the nested implementation with real world examples, because right now this abstraction is useful in a narrower context than might seem.

On one hand consider an scenario where the outer whenever launches an async action (like fetch), and the inner whenevers react to the different possible outcomes; those kind of scenarios can be handled more clearly with regular Promises or async/await. The whole point of this function is that it repeats. More importantly that each "layer" of nested whenevers repeats itself independently of the outer layers. So you have to find a use-case that needs that, for example compiling different query results associated to the parent resource.

On the other hand there are some simple uses of nesting that can be solved without it. For example, a "nested whenever" is similar in some cases to just a top-level whenever with the predicate `() => outerPredicate() && nestedPredicate()`. The nestedPredicate would check that the effect of the "outer whenever" is available. Here the critical feature missing is not being able to pass the result of the outer effect without global data. Alternatively, we can also consider putting checks at the start of effect to achieve similar flows.


> 3. What limitations does this abstraction have for managing requests/resources? Which use-cases can it not support?  How might we address those use cases?

The last few paragraphs are somewhat relevant for these questions.

If we look at a simple usage of `whenever(predicate, effect)` we have to realize that this construct looks at *changes* of the predicate. Which means that more imperative use cases are not handled. For example, `when(() => route.name === 'issues', () => new IssuesPageApp())` works when we get into the route, but does nothing to handle a `forceRefreshApp()`.

To address this the imperative call could switch off and on some value so that `whenever` detects the change and runs the effect. (e.g. `shouldLoad` should be put to `false` after loading so that it can be put to `true` when someone calls an imperative function `load()`).

In regard to the `reaction` suggestion I made previously, the *changes* that `whenever` detects are for a boolean predicate, which makes it difficult to launch effect whenever some id changes, from one valid id to another valid id, to create some side-effect. This can be addressed by using or emulating the `reaction` methodology.

Finally, I am going to think out loud a little bit of a convoluted example with nesting. Consider the example of `when.md`:

```js
when(() => this.issueForm.submitting,
  () => { this.issuesMutation.fetch(); },
  [() => when(() => !!this.issuesQuery.result,
              () => { /* ...*/ }),
   () => when(() => !!this.issuesQuery.error,
              () => { /* ... */ }),
  ]
);
```

This is related to some `issueForm`, that causes some mutations which causes some queries. However, the outer predicate is a simple boolean, there is no `formId`, meaning that the scope of this `when` must be (a subset of) the scope of `issueForm`. That is one of the natural use-cases for `whenever`.

So what is the complementary scenario for these use cases? We might be in the scope with a list of items/forms, each of which might want to be submitted, to execute an effect in the current scope.

```js
whenever(() => this.issueFormList.some(form => form.wantsToBeSubmitted),
  () => { this.issuesMutation.fetch(getFormIdThatIsBeingSubmitted()); },
  [ /*...*/ ]
);
```

But we cannot (comfortably) handle multiple form submissions, due to needing to track ids. There are better ways to approach this like a growing array of handlers for each of the original calls. We could also work out a variant with `whenever(select, effect)`, which calls `effect` with the result of `select` each time that the result of select changes.

---

That's it, no more convoluted explanations for now, I hope that whoever reads this `whenever` discussion, whenever are wherever that might be, does not end up like [these guys](https://www.youtube.com/watch?v=kTcRRaXV-fg).
