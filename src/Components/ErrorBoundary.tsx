import React from 'react';
import { Link } from 'react-router';
import { EmptyState, buttonClass } from './ui';

interface Props {
  children: React.ReactNode;
  /** Changing this (the path) clears a caught error */
  resetKey?: string;
}

export default class ErrorBoundary extends React.Component<
  Props,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <EmptyState title="Something went wrong">
          <p>{this.state.error.message}</p>
          <Link to="/paldex" className={buttonClass('primary', 'mt-4')}>
            Back to the Paldex
          </Link>
        </EmptyState>
      </div>
    );
  }
}
