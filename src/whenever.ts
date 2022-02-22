import { when } from 'mobx';
import type { IReactionDisposer } from 'mobx';

export interface WheneverDisposer {
  (): void;
}

export type Whenever = <Type>(
  predicate: () => boolean,
  effect: () => Type,
  nestedWhenevers?: ((args?: Type) => WheneverDisposer)[],
  unsubscribe?: () => void,
) => WheneverDisposer;

const whenever: Whenever = (predicate, effect, nestedWhenevers = [], unsubscribe) => {
  let desiredPredicateValue = true;
  let unsubscriptionPending = false;

  const innerPredicate = () => predicate() === desiredPredicateValue;

  const enableNestedWhenevers = (arg?: ReturnType<typeof effect>) => (
    nestedWhenevers.map(nestedWhenever => nestedWhenever(arg))
  );

  let nestedDisposers: WheneverDisposer[] = [];
  const disposeOfNestedWhenevers = () => {
    nestedDisposers.forEach(nestedDisposer => {
      nestedDisposer();
    });
    nestedDisposers = [];
  }

  let whenDisposer: IReactionDisposer;

  const innerWhenEffect = () => {
    if (desiredPredicateValue) {
      const effectResult = effect();
      nestedDisposers = enableNestedWhenevers(effectResult);
      unsubscriptionPending = true;
    } else {
      if (unsubscribe && unsubscriptionPending) unsubscribe();
      unsubscriptionPending = false;
      disposeOfNestedWhenevers();
    }
    desiredPredicateValue = !desiredPredicateValue;
    whenDisposer = when(innerPredicate, innerWhenEffect);
  }

  whenDisposer = when(innerPredicate, innerWhenEffect);

  return () => {
    disposeOfNestedWhenevers();
    if (unsubscribe && unsubscriptionPending) unsubscribe();
    whenDisposer();
  };
}

export default whenever;
