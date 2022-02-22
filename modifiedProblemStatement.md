# When?
If you don't know Mobx, please take a look at the documentation and understand the basics and in particular about ['Reactions'](https://mobx.js.org/reactions.html) before reading on.

## Introduction
This exercise is called 'when'. It might be more appropriate to call it 'whenever'. You'll see why!

At Wikifactory we use Mobx to allow views to render state in a reaction (the same way most people use Mobx). In a reactive application, making network requests can also be treated as a reaction to application state.  After all network requests are 'side effects' just like UI rendering.


For these purposes I think it would be useful to have a primitive to 'do something whenever a predicate becomes true'. e.g. when the router is at a certain path, load a particular 'Application' or 'Query'.

`when(route.name === 'issues', () => new IssuesPageApp())`

This is distinct from the Mobx `when` function which fires an effect when it's predictate becomes true and then disposes itself (stops listening). Here we want to do something whenever the predicate becomes true. If it becomes false, we will wait for it to become true again.

N.B. The most likely way to implement this is using the Mobx `when` function. But other approaches are more than welcome.

## Refreshing Data on a Condition

If we had this kind of construction, inside a class constructor for IssuesPageApp() we might do something like the below to refresh the issues each time they become visible:

```js
class IssuesPageApp {
  @observable showListing = true;

  issuesQuery: IssuesQuery;

  constructor() {
    this.issuesQuery = new IssuesQuery();

    when(
      () => this.showListing,
      () => this.issuesQuery.fetch(),
    );
  }
}
```

The semantics of this would be that **whenever** the predicate becomes true we execute issueQuery.fetch(). So if the issues were hidden and showed again, we would re-request the data.

This might allow us to mange external data in a more reactive, declarative and state-driven way, compared to the typically imperative and asynchronous method of most modern setups.

Here is an implementation of a common use case of re-requesting data after adding something to an array:

```js

class IssuesPageApp {
  @observable newIssueAdded = false;
  @observable showListing = true;

  issuesQuery: IssuesQuery;

  constructor() {
    when(
      () => this.showListing,
      () => this.issuesQuery.fetch(),
    );
    when(
      () => this.newIssueAdded,
      () => {
        this.issuesQuery.fetch();
        this.newIssueAdded = false;
      },
    );
  }
}
```

## Nested When Statements

The `when` statement should also allow for nested `when` statements which can be triggered only while the outer predicate remain true.

```js
export class IssuesPageApp {
  issuesMutation: IssuesMutation;

  @observable issues: Issue[] = [];

  @observable errors: Error[] = null;

  @observable issueForm = new Form();

  constructor() {
    when(
      () => this.issueForm.submitting,
      () => {
        this.issuesMutation.fetch();
      },
      [
        () => {
          when(
            () => !!this.issuesQuery.result,
            () => {
              this.issues = this.issuesQuery.result.issues;
              this.issueForm.submitting = false;
            },
          );
        },
        () => {
          when(
            () => !!this.issuesQuery.error,
            () => {
              this.errors.push(this.issuesQuery.error);
              this.issueForm.submitting = false;
            },
          );
        },
      ],
    );
  }
}
```

This creates a kind of "reactive state machine".

When we transition into a state where an outer predicate is true, the inner predicate starts to be evaluated, making new state transitions possible.

If the outer predicate becomes false, all inner `when` statements should be disposed.

## Suggested Extensions

It might be useful to return the value of an outer `when` statement (and possible observables created there) to an inner `when` statement, in a similar vein to chained promises. This would mean that observables constructed in the outer `when` could be passed to the inner `when` and used in both it's 'predicate' and 'effect'.

For something like the semantics of data subscription management we might find it useful to have a clean up function that runs when the predicate become false.

e.g.
```js
when(predicate1, effect, [
  () => when(predicate2, subscribe, [], unsubscribe)
])
```
Or perhaps

```js
when(predicate1, effect, [
  () => when(predicate2, subscribe)
  () => whenNot(predicate2, unsubscribe)
])

```

## Omitted Details
In the above examples, for simplicity, we haven't shown a few things.

a) How and when to use Mobx `actions` .

b) How we will need to manage the top-level `when` statements. In reality a
top-level when statement should return a single, argumentless function called a disposer. Calling that should stop the `when` 'reaction'.

```js
   const disposer = when(...);
   ...later
   disposer();
```


## Guidelines

The main aim of this exercise is to implement the above `when` function, and manage the disposal of reactions at the appropriate times.

We are also interested to hear:

1. What do you think of the concept of managing required resources through this type of abstraction? Feel free to let us know if you think it's a bad or un-useful idea (and why).
2. How could we improve the developer 'api'?
3. What limitations does this abstraction have for managing requests/resources? Which use-cases can it not support?  How might we address those use cases?

We prefer if you can implement your solution in Typescript.

If you like what you come up with, feel free to release it as an open source project!
