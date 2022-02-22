import {
  makeAutoObservable,
  makeObservable,
  observable,
  autorun,
  // when,
  runInAction,
  action,
} from 'mobx';
import whenever from './whenever';
import type { WheneverDisposer } from './whenever'

describe("Simple whenever tests", () => {
  class Counter {
    count = 1;
    constructor(name: string = "counterInstance", verbose = false) {
      makeAutoObservable(this);
      if (verbose) autorun(() => console.log(name + " " + this.count));
    }

    increase() {
      this.count++;
    }
  }

  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    whenever(() => counter1.count%2 === 0, () => counter2.increase());

    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(4);
  });

  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    whenever(() => counter1.count%2 === 0, () => counter2.increase());

    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(4);
  });
  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    let disposer = whenever(() => counter1.count%2 === 0, () => counter2.increase());

    disposer();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(1);
  });
  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    let disposer = whenever(() => counter1.count%2 === 0, () => counter2.increase());

    counter1.increase();
    disposer();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(2);
  });
  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    let disposer = whenever(() => counter1.count%2 === 0, () => counter2.increase());

    counter1.increase();
    counter1.increase();
    disposer();
    counter1.increase();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(2);
  });
  test("Simple whenever test", () => {
    const counter1 = new Counter("Counter1");
    const counter2 = new Counter("Counter2");

    let disposer = whenever(() => counter1.count%2 === 0, () => counter2.increase());

    counter1.increase();
    counter1.increase();
    counter1.increase();
    disposer();
    counter1.increase();
    counter1.increase();
    expect(counter2.count).toBe(3);
  });
});


describe("Refreshing data on condition tests", () => {
  class IssuesQuery {
    constructor() {
    }

    fetch(verbose = false) {
      if (verbose) console.log("FETCH");
    }
  }

  test("IssuesPageApp fetches when is hidden and shown again", () => {

    class IssuesPageApp {
      showListing = true;

      issuesQuery: IssuesQuery;

      constructor() {
        this.issuesQuery = new IssuesQuery();

        makeObservable(this, {
          showListing: observable,
          toggleVisiblity: action,
        });

        whenever(
          () => this.showListing,
          () => this.issuesQuery.fetch(),
        );
      }

      toggleVisiblity() {
        this.showListing = !this.showListing;
      }
    }

    const page = new IssuesPageApp();
    const spy = jest.spyOn(page.issuesQuery, "fetch");
    page.toggleVisiblity();
    page.toggleVisiblity();
    page.toggleVisiblity();
    page.toggleVisiblity();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  test("IssuesPageApp fetches when new data is added", () => {
    class IssuesPageApp2 {
      newIssueAdded = false;
      showListing = true;

      issuesQuery: IssuesQuery;

      constructor() {
        this.issuesQuery = new IssuesQuery();

        makeObservable(this,{
          newIssueAdded: observable,
          showListing: observable,
          addNewIssue: action,
        });
        whenever(
          () => this.showListing,
          () => this.issuesQuery.fetch(),
        );
        whenever(
          () => this.newIssueAdded,
          () => {
            this.issuesQuery.fetch();
            this.newIssueAdded = false;
          },
        );
      }

      addNewIssue() {
        this.newIssueAdded = true;
      }
    }

    const page = new IssuesPageApp2();
    const spy = jest.spyOn(page.issuesQuery, "fetch");
    page.addNewIssue();
    page.addNewIssue();
    page.addNewIssue();

    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe("Test nested whenevers, IssuesPage", () => {

  type Issue = string;
  type Issues = Issue[];
  type Error = string;

  class IssuesQuery {
    result: Issues | null = null;
    error: Error|null = null;

    constructor() {
    }

    fetch(succeed = true, payload: Issues | Error) {
      if (succeed) {
        this.result = payload as Issues;
      } else {
        this.error = payload as Error;
      }
    }
  }

  class IssuesPageApp3 {
    issues: Issues = [];

    errors: Error[] = [];

    issueForm = { submitting: false };

    issuesQuery = new IssuesQuery();

    submissions = 0;

    constructor() {
      makeObservable(this, {
        issues: observable,
        errors: observable,
        issueForm: observable,
        submit: action,
      })
      whenever(
        () => this.issueForm.submitting,
        () => {
          this.submissions++;
          // this.issuesQuery.fetch();
        },
        [
          () => whenever(
            () => !!this.issuesQuery.result,
            () => {
              this.issues = this.issuesQuery.result as Issues;
              this.issueForm.submitting = false;
            },
          ),
          () => whenever(
            () => !!this.issuesQuery.error,
            () => {
              this.errors.push(this.issuesQuery.error as Error);
              this.issueForm.submitting = false;
            },
          ),
        ],
      );
    }

    submit(success: boolean, payload: Issues | Error) {
      this.issueForm.submitting = true;
      this.issuesQuery.fetch(success, payload);
    }
  }

  test("Test nested whenevers submission", () => {
    const page = new IssuesPageApp3();
    const issues = ["issue1", "issue2"];
    page.submit(true, issues);
    expect(page.submissions).toBe(1);
    expect(page.issues).toEqual(issues);
    expect(page.errors.length).toBe(0);
  });

  test("Test nested whenevers errors", () => {
    const page = new IssuesPageApp3();
    const errorMessage = "error message";
    page.submit(false, errorMessage);
    expect(page.submissions).toBe(1);
    expect(page.issues.length).toBe(0);
    expect(page.errors.length).toBe(1);
    expect(page.errors).toEqual([errorMessage]);
  });

});
describe("Test nested effects", () => {
  const observableValues = {
    value0: false,
    value1: false,
    value2: false,
  };
  makeAutoObservable(observableValues);
  let disposer: WheneverDisposer;
  const fn = jest.fn();
  beforeEach(() => {
    runInAction(() => {
      observableValues.value0 = false;
      observableValues.value1 = false;
      observableValues.value2 = false;
    });
    disposer = whenever(() => observableValues.value0, () => {}, [
      () => whenever(() => observableValues.value1, () => {}, [
        () => whenever(() => observableValues.value2, fn)
      ])
    ]);
  });

  afterEach(() => {
    disposer();
    fn.mockClear();
  })
  test("Test inner effect run at the appropiate time", () => {
    runInAction(() => {
      observableValues.value2 = true;
    });
    expect(fn).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value2 = false;
    });
    expect(fn).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value0 = true;
    });
    expect(fn).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value1 = true;
    });
    expect(fn).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value2 = true;
    });
    expect(fn).toHaveBeenCalled();

    runInAction(() => {
      observableValues.value2 = false;
    });
    runInAction(() => {
      observableValues.value2 = true;
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("Test nested effect dispose", () => {
    disposer();
    runInAction(() => {
      observableValues.value0 = true;
      observableValues.value1 = true;
      observableValues.value2 = true;
    });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("Unsubscribe is called appropiatelly", () => {
  test("Simple unsubscribe is called", () => {
    const observableValues = {
      value0: false,
    };
    makeAutoObservable(observableValues);
    const unsubscribe = jest.fn();
    whenever(() => observableValues.value0, () => {}, [], unsubscribe);
    expect(unsubscribe).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value0 = true;
    });
    expect(unsubscribe).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value0 = false;
    });
    expect(unsubscribe).toHaveBeenCalled();
    runInAction(() => {
      observableValues.value0 = true;
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    runInAction(() => {
      observableValues.value0 = false;
    });
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  test("Nested unsubscribe is called", () => {
    const observableValues = {
      value0: true,
      value1: false,
    };
    makeAutoObservable(observableValues);
    const unsubscribe = jest.fn();
    whenever(() => observableValues.value0, () => {}, [
      () => whenever(() => observableValues.value1, () => {}, [], unsubscribe)
    ]);
    expect(unsubscribe).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value1 = true;
    });
    expect(unsubscribe).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value1 = false;
    });
    expect(unsubscribe).toHaveBeenCalled();
    runInAction(() => {
      observableValues.value1 = true;
    });
    runInAction(() => {
      observableValues.value1 = false;
    });
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });
  test("Nested unsubscribe is not called when outer whenever is disposed if it was never run", () => {
    const observableValues = {
      value0: true,
      value1: false,
    };
    makeAutoObservable(observableValues);
    const unsubscribe = jest.fn();
    const disposer = whenever(() => observableValues.value0, () => {}, [
      () => whenever(() => observableValues.value1, () => {}, [], unsubscribe)
    ]);
    expect(unsubscribe).not.toHaveBeenCalled();
    disposer();
    expect(unsubscribe).not.toHaveBeenCalled();
  });
  test("Nested unsubscribe is called when outer whenever is disposed if it was never run", () => {
    const observableValues = {
      value0: true,
      value1: true,
    };
    makeAutoObservable(observableValues);
    const unsubscribe = jest.fn();
    const disposer = whenever(() => observableValues.value0, () => {}, [
      () => whenever(() => observableValues.value1, () => {}, [], unsubscribe)
    ]);
    expect(unsubscribe).not.toHaveBeenCalled();
    disposer();
    expect(unsubscribe).toHaveBeenCalled();
  });
  test("Unsubsribe is called only after effect ran", () => {
    const observableValues = {
      value0: false,
      value1: false,
    };
    makeAutoObservable(observableValues);
    const effect0 = jest.fn();
    const unsubscribe0 = jest.fn();
    const effect1 = jest.fn();
    const unsubscribe1 = jest.fn();
    const disposer = whenever(() => observableValues.value0, effect0, [
      () => whenever(() => observableValues.value1, effect1, [], unsubscribe1)
    ], unsubscribe0);
    expect(effect0).not.toHaveBeenCalled();
    expect(unsubscribe0).not.toHaveBeenCalled();
    expect(effect1).not.toHaveBeenCalled();
    expect(unsubscribe1).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value0 = true;
    });
    expect(effect0).toHaveBeenCalled();
    expect(unsubscribe0).not.toHaveBeenCalled();
    expect(effect1).not.toHaveBeenCalled();
    expect(unsubscribe1).not.toHaveBeenCalled();
    disposer();
    expect(effect0).toHaveBeenCalled();
    expect(unsubscribe0).toHaveBeenCalled();
    expect(effect1).not.toHaveBeenCalled();
    expect(unsubscribe1).not.toHaveBeenCalled();
  });
});


describe("Args are passed to inner whenevers", () => {
  test("Effect return goes to inner effect", () => {
    const observableValues = {
      value0: true,
      value1: true,
    };
    makeAutoObservable(observableValues);
    const value = "passing argument";
    const effect0 = jest.fn(() => {
      return value;
    });
    const unsubscribe0 = jest.fn();
    const effect1 = jest.fn();
    const unsubscribe1 = jest.fn();
    whenever(() => observableValues.value0, effect0, [
      (arg) => whenever(() => observableValues.value1, () => effect1(arg), [], unsubscribe1)
    ], unsubscribe0);
    expect(effect1).toHaveBeenLastCalledWith(value);
    runInAction(() => {
      observableValues.value1 = false;
    });
    runInAction(() => {
      observableValues.value1 = true;
    });
    expect(effect1).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenLastCalledWith(value);
  });

  test("Effect value can be used in inner predicate", () => {
    const target = 20;
    const observableValues = {
      value: 0,
    };
    makeAutoObservable(observableValues);
    const effect0 = jest.fn(() => {
      return observableValues.value*10;
    });
    const unsubscribe0 = jest.fn();
    const effect1 = jest.fn();
    const unsubscribe1 = jest.fn();
    whenever(() => observableValues.value%2 === 0, effect0, [
      (arg) => whenever(() => !!arg && arg >= target, effect1, [], unsubscribe1)
    ], unsubscribe0);
    runInAction(() => {
      observableValues.value++;
    });
    expect(effect1).not.toHaveBeenCalled();
    runInAction(() => {
      observableValues.value++;
    });
    expect(effect1).toHaveBeenCalled();
  });
});
