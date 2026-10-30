import { Link } from 'react-router';
import CraftFlow from './CraftFlow';
import WorkbenchCards from './WorkbenchCards';
import { Panel } from './ui';
import { useCraftPlan } from '../Hooks/useCraftPlan';
import type { CraftTarget } from '../Utils/crafting';

/**
 * How one item or building is made, for its own page: the crafting calculator's
 * flow and workbench cards, for one of it, with a way into the calculator for more.
 */
export default function CraftBreakdown({ target }: { target: CraftTarget }) {
  const { plan, choose } = useCraftPlan(target);
  if (!plan || plan.steps.length === 0) return null;
  return (
    <>
      <Panel
        title="From raw materials to the finished item"
        actions={
          <Link
            to={`/crafting?${target.kind}=${target.id}`}
            className="text-sm font-semibold text-pw-link hover:underline"
          >
            Change the quantity in the calculator
          </Link>
        }
      >
        <CraftFlow plan={plan} target={target} onChoose={choose} />
      </Panel>
      {plan.stations.length > 0 && <WorkbenchCards plan={plan} />}
    </>
  );
}
