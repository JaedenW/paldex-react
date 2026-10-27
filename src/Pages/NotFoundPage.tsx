import { Link } from 'react-router';
import { EmptyState, Page, buttonClass } from '../Components/ui';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <Page>
      <EmptyState title="Nothing here">
        <p>That page doesn’t exist.</p>
        <Link to="/paldex" className={buttonClass('primary', 'mt-4')}>
          Open the Paldex
        </Link>
      </EmptyState>
    </Page>
  );
}
