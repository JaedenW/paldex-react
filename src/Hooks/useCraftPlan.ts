import React from 'react';
import { recipesFor } from '../data/gear';
import { planCrafting, type CraftTarget } from '../Utils/crafting';

const NO_CHOICES: Record<string, number> = {};

/**
 * Works out how to make something, and remembers which recipe was chosen for
 * each product that has several, until the thing being made changes.
 */
export function useCraftPlan(
  target: CraftTarget | undefined,
  qty = 1,
  expand = true
) {
  const key = target ? `${target.kind}:${target.id}` : '';
  const [state, setState] = React.useState({ key, choices: NO_CHOICES });
  const choices = state.key === key ? state.choices : NO_CHOICES;

  const plan = React.useMemo(() => {
    if (!target) return undefined;
    // the building's own recipe is under "building"; everything it needs is an item
    const recipesOf = (name: string) =>
      recipesFor(
        name,
        name === target.name && target.kind === 'building' ? 'building' : 'item'
      );
    return planCrafting(target.name, qty, {
      recipesOf,
      expand,
      choose: (name) => choices[name] ?? 0,
    });
  }, [target, qty, expand, choices]);

  const choose = (product: string, variant: number) =>
    setState({ key, choices: { ...choices, [product]: variant } });

  return { plan, choose };
}
