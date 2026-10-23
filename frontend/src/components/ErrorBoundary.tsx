import { Component, ErrorInfo, PropsWithChildren } from 'react';
import { texts } from 'src/texts';
import { Alert } from './Alert';

type ErrorBoundaryState = { hasError: boolean };

/** Shows an error instead of a white page when a part of the page (e.g. a detail view) fails to render. */
export class ErrorBoundary extends Component<PropsWithChildren<{ resetKey?: unknown }>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(previous: PropsWithChildren<{ resetKey?: unknown }>) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <Alert text={`${texts.common.errorLoading}. ${texts.common.reloadAndTryAgain}`} />;
    }
    return this.props.children;
  }
}
